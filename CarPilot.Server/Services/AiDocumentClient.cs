using System.Net.Http.Headers;
using System.Text.Json;

using Microsoft.AspNetCore.Http;

namespace CarPilot.Server.Services;

public sealed record ExtractedDocumentText(string Filename, string Text);

public sealed record DocumentAutofillResult(
    string SourceName,
    Dictionary<string, JsonElement> Fields);

public interface IAiDocumentClient
{
    Task<string> ExtractTextAsync(
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default);

    Task<DocumentAutofillResult> AutofillAsync(
        string section,
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default);

    Task IngestForRagAsync(
        string vehicleId,
        Guid userId,
        string bucketKey,
        string garageDocumentId,
        string section,
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default);
}

/// <summary>Calls carpilot-ai to read documents, extract garage fields, and index redacted RAG chunks.</summary>
public sealed class AiDocumentClient(
    IHttpClientFactory httpClientFactory,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AiDocumentClient> logger) : IAiDocumentClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<string> ExtractTextAsync(
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        using var response = await PostFileAsync(
            "/documents/extract-text",
            fileName,
            contentType,
            content,
            null,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("carpilot-ai extract-text returned {Status}: {Detail}", (int)response.StatusCode, detail);
            throw new InvalidOperationException("The AI service could not read this document.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var parsed = await JsonSerializer.DeserializeAsync<ExtractedDocumentText>(stream, JsonOptions, cancellationToken);
        return parsed?.Text ?? "";
    }

    public async Task<DocumentAutofillResult> AutofillAsync(
        string section,
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        using var response = await PostFileAsync(
            "/documents/autofill",
            fileName,
            contentType,
            content,
            new Dictionary<string, string> { ["section"] = section },
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("carpilot-ai autofill returned {Status}: {Detail}", (int)response.StatusCode, detail);
            throw new InvalidOperationException("The AI service could not auto-fill from this document.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var parsed = await JsonSerializer.DeserializeAsync<DocumentAutofillResult>(stream, JsonOptions, cancellationToken);
        if (parsed is null)
        {
            return new DocumentAutofillResult(fileName, []);
        }

        return parsed with { Fields = parsed.Fields ?? [] };
    }

    public async Task IngestForRagAsync(
        string vehicleId,
        Guid userId,
        string bucketKey,
        string garageDocumentId,
        string section,
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        var fields = new Dictionary<string, string>
        {
            ["vehicle_id"] = vehicleId,
            ["user_id"] = userId.ToString(),
            ["bucket_key"] = bucketKey,
            ["garage_document_id"] = garageDocumentId,
            ["section"] = section,
        };
        using var response = await PostFileAsync(
            "/documents/ingest",
            fileName,
            contentType,
            content,
            fields,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("carpilot-ai ingest returned {Status}: {Detail}", (int)response.StatusCode, detail);
            throw new InvalidOperationException("The AI service could not index this document for search.");
        }
    }

    private async Task<HttpResponseMessage> PostFileAsync(
        string path,
        string fileName,
        string? contentType,
        byte[] content,
        IReadOnlyDictionary<string, string>? fields,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("carpilot-ai");
        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(content);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);
        form.Add(fileContent, "file", fileName);
        if (fields is not null)
        {
            foreach (var (name, value) in fields)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    form.Add(new StringContent(value), name);
                }
            }
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = form };
        var accessToken = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            request.Headers.TryAddWithoutValidation("Authorization", accessToken);
        }

        return await client.SendAsync(request, cancellationToken);
    }
}
