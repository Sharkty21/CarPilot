using CarPilot.Server.Auth;
using CarPilot.Server.Data;
using CarPilot.Server.Entities;
using CarPilot.Server.Models;
using CarPilot.Server.Storage;

using Microsoft.EntityFrameworkCore;

namespace CarPilot.Server.Services;

public interface IFileUploadService
{
    Task<OwnedVehicle?> UploadVehicleDocumentsAsync(
        string vehicleId,
        DocumentSection section,
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken = default);

    Task<UserProfile> UploadAvatarAsync(IFormFile file, CancellationToken cancellationToken = default);
}

public sealed class FileUploadService(
    CarPilotDbContext db,
    ICurrentUser currentUser,
    IObjectStorageService storage,
    IDocumentIndexService documentIndex) : IFileUploadService
{
    private const string DocumentsConnection = "documents";
    private const string AvatarsConnection = "avatars";

    public async Task<OwnedVehicle?> UploadVehicleDocumentsAsync(
        string vehicleId,
        DocumentSection section,
        IReadOnlyList<IFormFile> files,
        CancellationToken cancellationToken = default)
    {
        var vehicle = await db.Vehicles
            .Include(v => v.Documents)
            .FirstOrDefaultAsync(v => v.UserId == currentUser.UserId && v.Id == vehicleId, cancellationToken);
        if (vehicle is null) return null;

        foreach (var file in files)
        {
            if (file.Length <= 0) continue;

            var documentId = $"doc-{Guid.NewGuid():N}";
            var safeName = Path.GetFileName(file.FileName);
            var objectKey = $"{currentUser.UserId}/{vehicleId}/{documentId}-{safeName}";

            await using var read = file.OpenReadStream();
            using var buffer = new MemoryStream();
            await read.CopyToAsync(buffer, cancellationToken);
            buffer.Position = 0;

            var stored = await storage.UploadAsync(
                DocumentsConnection,
                objectKey,
                buffer,
                string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                cancellationToken);

            var entity = new VehicleDocumentEntity
            {
                Id = documentId,
                UserId = currentUser.UserId,
                VehicleId = vehicleId,
                Section = section.ToString(),
                Name = safeName,
                Kind = InferKind(file.ContentType, safeName),
                UploadedAt = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                ContentType = file.ContentType,
                SizeBytes = file.Length,
                StorageBucket = stored.Bucket,
                StorageKey = stored.Key,
                Url = stored.Url,
            };
            db.Documents.Add(entity);
            await db.SaveChangesAsync(cancellationToken);

            buffer.Position = 0;
            await documentIndex.IndexDocumentAsync(
                documentId,
                buffer,
                string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                safeName,
                cancellationToken);
        }

        await db.Entry(vehicle).Collection(v => v.Documents).LoadAsync(cancellationToken);
        return GarageMapper.ToModel(vehicle);
    }

    public async Task<UserProfile> UploadAvatarAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User profile not found.");

        var safeName = Path.GetFileName(file.FileName);
        var objectKey = $"{currentUser.UserId}/avatar/{Guid.NewGuid():N}-{safeName}";

        await using var stream = file.OpenReadStream();
        var stored = await storage.UploadAsync(
            AvatarsConnection,
            objectKey,
            stream,
            string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType,
            cancellationToken);

        if (!string.IsNullOrWhiteSpace(user.AvatarKey) && !string.IsNullOrWhiteSpace(user.AvatarBucket))
        {
            try
            {
                await storage.DeleteAsync(AvatarsConnection, user.AvatarKey, cancellationToken);
            }
            catch
            {
                // Best-effort cleanup of the previous avatar.
            }
        }

        user.AvatarBucket = stored.Bucket;
        user.AvatarKey = stored.Key;
        user.AvatarUrl = stored.Url;
        await db.SaveChangesAsync(cancellationToken);
        return GarageMapper.ToModel(user);
    }

    private static string InferKind(string? contentType, string fileName)
    {
        if (contentType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) == true
            || fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
        {
            return "image";
        }

        if (fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
            || contentType?.Contains("pdf", StringComparison.OrdinalIgnoreCase) == true)
        {
            return "pdf";
        }

        return "doc";
    }
}
