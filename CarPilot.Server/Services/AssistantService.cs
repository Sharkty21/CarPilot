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
/// </summary>
public sealed class AssistantService(
    IGarageRepository repository,
    ICurrentUser currentUser,
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AssistantService> logger) : IAssistantService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async IAsyncEnumerable<AssistantStreamEvent> AskStreamAsync(
        string vehicleId,
        AskAssistantRequest request,
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
        if (string.IsNullOrEmpty(question) && request.AttachmentNames.Count > 0)
        {
            question =
                $"The user attached: {string.Join(", ", request.AttachmentNames)}. " +
                "Summarize what you can and offer to save a maintenance record if appropriate.";
        }

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
}
