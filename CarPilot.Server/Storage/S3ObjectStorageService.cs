using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace CarPilot.Server.Storage;

public interface IObjectStorageService
{
    Task<StoredObject> UploadAsync(
        string bucketConnectionName,
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        string bucketConnectionName,
        string objectKey,
        CancellationToken cancellationToken = default);

    string BuildPublicUrl(string bucketConnectionName, string objectKey);
}

public sealed record StoredObject(string Bucket, string Key, string Url);

public sealed class S3ObjectStorageService(IConfiguration configuration, ILogger<S3ObjectStorageService> logger)
    : IObjectStorageService
{
    public async Task<StoredObject> UploadAsync(
        string bucketConnectionName,
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var settings = ParseConnection(bucketConnectionName);
        using var client = CreateClient(settings);

        var request = new PutObjectRequest
        {
            BucketName = settings.Bucket,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false,
        };

        await client.PutObjectAsync(request, cancellationToken);
        var url = BuildUrl(settings, objectKey);
        logger.LogInformation("Uploaded object {Key} to bucket {Bucket}", objectKey, settings.Bucket);
        return new StoredObject(settings.Bucket, objectKey, url);
    }

    public async Task DeleteAsync(
        string bucketConnectionName,
        string objectKey,
        CancellationToken cancellationToken = default)
    {
        var settings = ParseConnection(bucketConnectionName);
        using var client = CreateClient(settings);
        await client.DeleteObjectAsync(settings.Bucket, objectKey, cancellationToken);
    }

    public string BuildPublicUrl(string bucketConnectionName, string objectKey)
    {
        var settings = ParseConnection(bucketConnectionName);
        return BuildUrl(settings, objectKey);
    }

    private BucketConnection ParseConnection(string name)
    {
        var connectionString = configuration.GetConnectionString(name)
            ?? configuration.GetConnectionString($"rustfs-{name}")
            ?? throw new InvalidOperationException($"Connection string '{name}' was not found.");

        var parts = connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(part => part.Split('=', 2))
            .Where(pair => pair.Length == 2)
            .ToDictionary(pair => pair[0], pair => pair[1], StringComparer.OrdinalIgnoreCase);

        return new BucketConnection(
            Endpoint: parts.GetValueOrDefault("Endpoint")
                ?? throw new InvalidOperationException("Endpoint missing from RustFS connection string."),
            AccessKey: parts.GetValueOrDefault("AccessKey")
                ?? throw new InvalidOperationException("AccessKey missing from RustFS connection string."),
            SecretKey: parts.GetValueOrDefault("SecretKey")
                ?? throw new InvalidOperationException("SecretKey missing from RustFS connection string."),
            Bucket: parts.GetValueOrDefault("Bucket")
                ?? throw new InvalidOperationException("Bucket missing from RustFS connection string."));
    }

    private static IAmazonS3 CreateClient(BucketConnection settings)
    {
        var config = new AmazonS3Config
        {
            ServiceURL = settings.Endpoint,
            ForcePathStyle = true,
            AuthenticationRegion = "us-east-1",
        };

        var credentials = new BasicAWSCredentials(settings.AccessKey, settings.SecretKey);
        return new AmazonS3Client(credentials, config);
    }

    private static string BuildUrl(BucketConnection settings, string objectKey) =>
        $"{settings.Endpoint.TrimEnd('/')}/{settings.Bucket}/{objectKey.TrimStart('/')}";

    private sealed record BucketConnection(string Endpoint, string AccessKey, string SecretKey, string Bucket);
}
