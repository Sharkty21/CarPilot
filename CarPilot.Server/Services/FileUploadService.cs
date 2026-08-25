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

    Task<OwnedVehicle?> UploadVehicleDocumentAsync(
        string vehicleId,
        DocumentSection section,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default);

    Task<UserProfile> UploadAvatarAsync(IFormFile file, CancellationToken cancellationToken = default);
}

public sealed class FileUploadService(
    CarPilotDbContext db,
    ICurrentUser currentUser,
    IObjectStorageService storage,
    IAiDocumentClient aiDocuments,
    ILogger<FileUploadService> logger) : IFileUploadService
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

            await using var read = file.OpenReadStream();
            using var buffer = new MemoryStream();
            await read.CopyToAsync(buffer, cancellationToken);
            var uploaded = await UploadBytesAsync(
                vehicleId,
                section,
                file.FileName,
                file.ContentType,
                buffer.ToArray(),
                cancellationToken);
            if (!uploaded) return null;
        }

        await db.Entry(vehicle).Collection(v => v.Documents).LoadAsync(cancellationToken);
        return GarageMapper.ToModel(vehicle);
    }

    public async Task<OwnedVehicle?> UploadVehicleDocumentAsync(
        string vehicleId,
        DocumentSection section,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        var vehicle = await db.Vehicles
            .Include(v => v.Documents)
            .FirstOrDefaultAsync(v => v.UserId == currentUser.UserId && v.Id == vehicleId, cancellationToken);
        if (vehicle is null) return null;

        var uploaded = await UploadBytesAsync(
            vehicleId,
            section,
            fileName,
            contentType,
            content,
            cancellationToken);
        if (!uploaded) return null;

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

    private async Task<bool> UploadBytesAsync(
        string vehicleId,
        DocumentSection section,
        string fileName,
        string? contentType,
        byte[] content,
        CancellationToken cancellationToken)
    {
        if (content.Length == 0) return true;

        var documentId = $"doc-{Guid.NewGuid():N}";
        var safeName = Path.GetFileName(fileName);
        var objectKey = $"{currentUser.UserId}/{vehicleId}/{documentId}-{safeName}";
        var resolvedType = string.IsNullOrWhiteSpace(contentType)
            ? "application/octet-stream"
            : contentType;

        using var buffer = new MemoryStream(content, writable: false);
        var stored = await storage.UploadAsync(
            DocumentsConnection,
            objectKey,
            buffer,
            resolvedType,
            cancellationToken);

        var entity = new VehicleDocumentEntity
        {
            Id = documentId,
            UserId = currentUser.UserId,
            VehicleId = vehicleId,
            Section = section.ToString(),
            Name = safeName,
            Kind = InferKind(resolvedType, safeName),
            UploadedAt = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            ContentType = resolvedType,
            SizeBytes = content.Length,
            StorageBucket = stored.Bucket,
            StorageKey = stored.Key,
            Url = stored.Url,
        };
        db.Documents.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            await aiDocuments.IngestForRagAsync(
                vehicleId,
                currentUser.UserId,
                stored.Key,
                documentId,
                section.ToString().ToLowerInvariant(),
                safeName,
                resolvedType,
                content,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "RAG ingest failed for {DocumentId}; garage file was saved without vector search",
                documentId);
        }

        return true;
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
