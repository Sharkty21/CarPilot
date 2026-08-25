var builder = DistributedApplication.CreateBuilder(args);

builder.AddAzureContainerAppEnvironment("aca-env")
    .WithCompactResourceNaming();

var openAiApiKey = builder.AddParameter("openai-api-key", secret: true);
var langchainApiKey = builder.AddParameter("langchain-api-key", secret: true);
var authJwtSigningKey = builder.AddParameter("auth-jwt-signing-key", secret: true);

// Bake init scripts into the image. WithInitFiles becomes an empty Azure Files
// share on ACA (local host paths are not uploaded), so CREATE DATABASE never ran.
var postgres = builder.AddPostgres("postgres")
    .WithDockerfile(".", "postgres/Dockerfile")
    .WithDataVolume()
    .PublishAsAzureContainerApp((_, app) =>
    {
        // Azure Files (SMB) mounts default to uid=0/gid=0, but the postgres image
        // runs as uid 999 and needs to chown/chmod its data dir on init.
        foreach (var volume in app.Template.Volumes)
        {
            volume.Value!.MountOptions = "uid=999,gid=999,nobrl,mfsymlinks,cache=none,dir_mode=0750,file_mode=0750";
        }
    });

var carpilotDb = postgres.AddDatabase("carpilot");

var rustfs = builder.AddRustFs("rustfs")
    .WithDataVolume();

var documentsBucket = rustfs.AddBucket("documents");
var avatarsBucket = rustfs.AddBucket("avatars");

var server = builder.AddProject<Projects.CarPilot_Server>("server")
    .WithReference(carpilotDb)
    // AddBucket names resources "{parent}-{bucket}" (rustfs-documents). Alias so
    // FileUploadService can keep using GetConnectionString("documents" / "avatars").
    .WithReference(documentsBucket, connectionName: "documents")
    .WithReference(avatarsBucket, connectionName: "avatars")
    .WaitFor(carpilotDb)
    .WaitFor(rustfs)
    .WithEnvironment("Auth__JwtIssuer", "carpilot")
    .WithEnvironment("Auth__JwtAudience", "carpilot-api")
    .WithEnvironment("DemoUser__Id", "a0000000-0000-4000-8000-000000000001")
    .WithEnvironment("DemoUser__Email", "john.smith@carpilot.demo")
    .WithEnvironment("DemoUser__Password", "demo")
    .WithEnvironment("DemoUser__Name", "John Smith")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

// Local uses the signing key from appsettings.json; Azure gets a secret parameter.
if (!builder.ExecutionContext.IsRunMode)
{
    server.WithEnvironment("Auth__JwtSigningKey", authJwtSigningKey);
}

var carpilotAi = builder.AddUvicornApp("carpilot-ai", "../carpilot-ai", "main:app")
    .WithUv()
    .WithHttpEndpoint(env: "PORT")
    .WithHttpHealthCheck("/health")
    .WithReference(carpilotDb)
    .WithReference(server)
    .WithReference(documentsBucket)
    .WaitFor(carpilotDb)
    .WaitFor(server)
    .WaitFor(rustfs)
    .WithEnvironment("ENVIRONMENT", "dev")
    .WithEnvironment("LANGSMITH_TRACING", "true")
    .WithEnvironment("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    .WithEnvironment("LANGSMITH_PROJECT", "Carpilot")
    .WithEnvironment("LANGSMITH_API_KEY", langchainApiKey)
    .WithEnvironment("LANGCHAIN_TRACING_V2", "true")
    .WithEnvironment("LANGCHAIN_PROJECT", "Carpilot")
    .WithEnvironment("OPENAI_API_KEY", openAiApiKey)
    .WithEnvironment("LANGCHAIN_API_KEY", langchainApiKey)
    .WithEnvironment("DATABASE_URL", carpilotDb)
    .WithEnvironment("DOTNET_API_BASE_URL", server.GetEndpoint("http"))
    .WithEnvironment("STORAGE_ENDPOINT", rustfs.GetEndpoint("http"))
    .WithEnvironment("STORAGE_ACCESS_KEY", rustfs.Resource.AccessKey)
    .WithEnvironment("STORAGE_SECRET_KEY", rustfs.Resource.SecretKey)
    .WithEnvironment("STORAGE_BUCKET", "documents");

// Server proxies chat to AI; no WaitFor to avoid a startup cycle (AI already waits for server).
server.WithReference(carpilotAi);

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WithReference(carpilotAi)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
