using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

using CarPilot.Server.Data;
using CarPilot.Server.Entities;

using Microsoft.EntityFrameworkCore;

using Pgvector;
using Pgvector.EntityFrameworkCore;

using UglyToad.PdfPig;

namespace CarPilot.Server.Services;

public interface IEmbeddingService
{
    Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default);
}

public interface IDocumentIndexService
{
    Task IndexDocumentAsync(
        string documentId,
        Stream content,
        string contentType,
        string fileName,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DocumentSearchHit>> SearchAsync(
        Guid userId,
        string query,
        int topK = 5,
        CancellationToken cancellationToken = default);
}

public sealed record DocumentSearchHit(
    string DocumentId,
    string DocumentName,
    string Content,
    double Score);

public sealed class EmbeddingService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    : IEmbeddingService
{
    public async Task<float[]> EmbedAsync(string text, CancellationToken cancellationToken = default)
    {
        var apiKey = configuration["Embeddings:ApiKey"]
            ?? configuration["ConnectionStrings:embeddings"];
        var endpoint = configuration["Embeddings:Endpoint"];

        if (!string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(endpoint))
        {
            return await EmbedOpenAiCompatibleAsync(endpoint, apiKey, text, cancellationToken);
        }

        return LocalEmbed(text);
    }

    private async Task<float[]> EmbedOpenAiCompatibleAsync(
        string endpoint,
        string apiKey,
        string text,
        CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint.TrimEnd('/') + "/embeddings");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new
            {
                model = configuration["Embeddings:Model"] ?? "text-embedding-3-small",
                input = text,
                dimensions = EmbeddingConstants.Dimensions,
            }),
            Encoding.UTF8,
            "application/json");

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var values = doc.RootElement.GetProperty("data")[0].GetProperty("embedding");
        var vector = new float[EmbeddingConstants.Dimensions];
        var i = 0;
        foreach (var value in values.EnumerateArray())
        {
            if (i >= vector.Length) break;
            vector[i++] = value.GetSingle();
        }

        return vector;
    }

    /// <summary>Deterministic hashed bag-of-words embedding for offline/local use.</summary>
    public static float[] LocalEmbed(string text)
    {
        var vector = new float[EmbeddingConstants.Dimensions];
        var tokens = text.ToLowerInvariant()
            .Split([' ', '\n', '\r', '\t', ',', '.', ';', ':', '/', '\\', '-', '_'], StringSplitOptions.RemoveEmptyEntries);

        foreach (var token in tokens)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            var index = BitConverter.ToUInt16(hash, 0) % EmbeddingConstants.Dimensions;
            var sign = (hash[2] & 1) == 0 ? 1f : -1f;
            vector[index] += sign;
        }

        var norm = MathF.Sqrt(vector.Sum(v => v * v));
        if (norm > 0)
        {
            for (var i = 0; i < vector.Length; i++)
            {
                vector[i] /= norm;
            }
        }

        return vector;
    }
}

public sealed class DocumentIndexService(
    CarPilotDbContext db,
    IEmbeddingService embeddings) : IDocumentIndexService
{
    public async Task IndexDocumentAsync(
        string documentId,
        Stream content,
        string contentType,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var document = await db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);
        if (document is null) return;

        var text = await ExtractTextAsync(content, contentType, fileName, cancellationToken);
        if (string.IsNullOrWhiteSpace(text))
        {
            text = $"Document {fileName}";
        }

        var existing = db.DocumentChunks.Where(c => c.DocumentId == documentId);
        db.DocumentChunks.RemoveRange(existing);

        var chunks = Chunk(text, 800);
        var ordinal = 0;
        foreach (var chunk in chunks)
        {
            var embedding = await embeddings.EmbedAsync(chunk, cancellationToken);
            db.DocumentChunks.Add(new DocumentChunkEntity
            {
                Id = Guid.NewGuid(),
                UserId = document.UserId,
                DocumentId = documentId,
                Ordinal = ordinal++,
                Content = chunk,
                Embedding = new Vector(embedding),
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DocumentSearchHit>> SearchAsync(
        Guid userId,
        string query,
        int topK = 5,
        CancellationToken cancellationToken = default)
    {
        var embedding = await embeddings.EmbedAsync(query, cancellationToken);
        var queryVector = new Vector(embedding);

        var hits = await db.DocumentChunks
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Embedding.CosineDistance(queryVector))
            .Take(topK)
            .Select(c => new
            {
                c.DocumentId,
                c.Content,
                Distance = c.Embedding.CosineDistance(queryVector),
                Name = c.Document.Name,
            })
            .ToListAsync(cancellationToken);

        return hits
            .Select(h => new DocumentSearchHit(h.DocumentId, h.Name, h.Content, 1.0 - h.Distance))
            .ToList();
    }

    private static async Task<string> ExtractTextAsync(
        Stream content,
        string contentType,
        string fileName,
        CancellationToken cancellationToken)
    {
        if (content.CanSeek) content.Position = 0;

        if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            using var ms = new MemoryStream();
            await content.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;
            using var document = PdfDocument.Open(ms);
            var builder = new StringBuilder();
            foreach (var page in document.GetPages())
            {
                builder.AppendLine(page.Text);
            }

            return builder.ToString();
        }

        if (contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".md", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            using var reader = new StreamReader(content, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            return await reader.ReadToEndAsync(cancellationToken);
        }

        return $"Uploaded file {fileName}";
    }

    private static IEnumerable<string> Chunk(string text, int size)
    {
        if (string.IsNullOrWhiteSpace(text)) yield break;

        for (var i = 0; i < text.Length; i += size)
        {
            yield return text.Substring(i, Math.Min(size, text.Length - i));
        }
    }
}
