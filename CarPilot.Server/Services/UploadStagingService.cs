using Microsoft.Extensions.Caching.Memory;

namespace CarPilot.Server.Services;

public sealed record StagedUpload(
    string Id,
    Guid UserId,
    string FileName,
    string ContentType,
    byte[] Content);

public interface IUploadStagingService
{
    string Stage(Guid userId, string fileName, string? contentType, byte[] content);
    StagedUpload? Get(Guid userId, string stagingId);
    void Remove(Guid userId, string stagingId);
}

public sealed class UploadStagingService(IMemoryCache cache) : IUploadStagingService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(30);

    public string Stage(Guid userId, string fileName, string? contentType, byte[] content)
    {
        var id = $"stg-{Guid.NewGuid():N}";
        cache.Set(
            Key(userId, id),
            new StagedUpload(
                id,
                userId,
                Path.GetFileName(fileName),
                string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
                content),
            Ttl);
        return id;
    }

    public StagedUpload? Get(Guid userId, string stagingId) =>
        cache.TryGetValue(Key(userId, stagingId), out StagedUpload? upload) ? upload : null;

    public void Remove(Guid userId, string stagingId) => cache.Remove(Key(userId, stagingId));

    private static string Key(Guid userId, string stagingId) => $"upload-staging:{userId:N}:{stagingId}";
}
