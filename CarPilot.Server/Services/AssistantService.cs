using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

using CarPilot.Server.Auth;
using CarPilot.Server.Contracts;
using CarPilot.Server.Repositories;

namespace CarPilot.Server.Services;

/// <summary>
/// Proxies assistant chat to the carpilot-ai LangGraph service with SSE streaming.
/// Forwards the caller's JWT so AI tools can mutate garage data as that user.
/// Reads attached files, stages them for attach_document, and includes extracted text.
/// </summary>
public sealed class AssistantService(
    IGarageRepository repository,
    ICurrentUser currentUser,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    IAiDocumentClient documents,
    IUploadStagingService staging,
    ILogger<AssistantService> logger) : IAssistantService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async IAsyncEnumerable<AssistantStreamEvent> AskStreamAsync(
        string vehicleId,
        AskAssistantRequest request,
        IReadOnlyList<IFormFile>? files = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (repository.FindVehicle(vehicleId) is null)
        {
            yield return new AssistantStreamEvent
            {
                Type = "error",
                Content = $"No vehicle with id '{vehicleId}' is in this garage.",
            };
            yield break;
        }

        var question = request.Question?.Trim() ?? "";
        var attachments = new List<StagedAttachment>();

        if (files is { Count: > 0 })
        {
            yield return new AssistantStreamEvent
            {
                Type = "tool",
                Name = "read_document",
                Status = "start",
                Content = files.Count == 1
                    ? $"Reading {files[0].FileName}…"
                    : $"Reading {files.Count} documents…",
            };

            foreach (var file in files)
            {
                if (file.Length <= 0) continue;
                await using var read = file.OpenReadStream();
                using var buffer = new MemoryStream();
                await read.CopyToAsync(buffer, cancellationToken);
                var bytes = buffer.ToArray();
                var fileName = Path.GetFileName(file.FileName);
                var stagingId = staging.Stage(currentUser.UserId, fileName, file.ContentType, bytes);

                string extracted;
                try
                {
                    extracted = await documents.ExtractTextAsync(
                        fileName,
                        file.ContentType,
                        bytes,
                        cancellationToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Failed to extract text from {FileName}", fileName);
                    extracted = "";
                }

                attachments.Add(new StagedAttachment(stagingId, fileName, extracted));
            }

            yield return new AssistantStreamEvent
            {
                Type = "tool",
                Name = "read_document",
                Status = "end",
                Content = attachments.Count == 1
                    ? $"Finished reading {attachments[0].FileName}."
                    : $"Finished reading {attachments.Count} documents.",
            };
        }

        question = BuildQuestion(question, attachments, request.AttachmentNames);

        if (string.IsNullOrEmpty(question))
        {
            yield return new AssistantStreamEvent
            {
                Type = "error",
                Content = "A question is required.",
            };
            yield break;
        }

        var threadId = string.IsNullOrWhiteSpace(request.ThreadId)
            ? $"thread-{Guid.NewGuid():N}"
            : request.ThreadId;

        var body = new
        {
            message = question,
            thread_id = threadId,
            user_id = currentUser.UserId.ToString(),
            vehicle_id = vehicleId,
        };

        var client = httpClientFactory.CreateClient("carpilot-ai");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/chat/stream")
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };

        var accessToken = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            httpRequest.Headers.TryAddWithoutValidation("Authorization", accessToken);
        }

        HttpResponseMessage? response = null;
        try
        {
            response = await client.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Failed to reach carpilot-ai");
        }

        if (response is null)
        {
            yield return new AssistantStreamEvent
            {
                Type = "error",
                Content = "The AI service is unavailable. Please try again shortly.",
            };
            yield break;
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var detail = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "carpilot-ai stream returned {Status}: {Detail}",
                    (int)response.StatusCode,
                    detail);
                yield return new AssistantStreamEvent
                {
                    Type = "error",
                    Content = "The AI service returned an error. Please try again.",
                };
                yield break;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(stream);

            while (!cancellationToken.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line is null) break;
                if (!line.StartsWith("data:", StringComparison.Ordinal)) continue;

                var payload = line["data:".Length..].Trim();
                if (payload.Length == 0) continue;

                AssistantStreamEvent? evt;
                try
                {
                    evt = JsonSerializer.Deserialize<AssistantStreamEvent>(payload, JsonOptions);
                }
                catch (JsonException)
                {
                    continue;
                }

                if (evt is null) continue;
                yield return evt;
                if (evt.Type is "done" or "error") yield break;
            }
        }
    }

    private static string BuildQuestion(
        string question,
        IReadOnlyList<StagedAttachment> attachments,
        IReadOnlyList<string> fallbackNames)
    {
        if (attachments.Count == 0)
        {
            if (string.IsNullOrEmpty(question) && fallbackNames.Count > 0)
            {
                return $"The user attached: {string.Join(", ", fallbackNames)}. "
                    + "The files were not readable. Ask what they are.";
            }

            return question;
        }

        var builder = new StringBuilder();
        if (string.IsNullOrEmpty(question))
        {
            builder.Append(
                "I attached the document(s) below. Read them, file them on the matching vehicle section if they belong there, and update the details.");
        }
        else
        {
            builder.Append(question);
        }

        builder.AppendLine();
        builder.AppendLine();
        builder.AppendLine(
            "Attached documents (call attach_document with the exact staging_id to file them on insurance, warranty, or finance; skip unrelated files):");

        foreach (var attachment in attachments)
        {
            builder.AppendLine();
            builder.AppendLine($"### {attachment.FileName} (staging_id: {attachment.StagingId})");
            if (string.IsNullOrWhiteSpace(attachment.ExtractedText))
            {
                builder.AppendLine(
                    "[Could not extract text from this file. You can still attach it if the user says what it is.]");
            }
            else
            {
                builder.AppendLine(attachment.ExtractedText);
            }
        }

        return builder.ToString();
    }

    private sealed record StagedAttachment(string StagingId, string FileName, string ExtractedText);
}
