var builder = DistributedApplication.CreateBuilder(args);

var openAiApiKey = builder.AddParameter("openai-api-key", secret: true);
var langchainApiKey = builder.AddParameter("langchain-api-key", secret: true);

var postgres = builder.AddPostgres("postgres")
    .WithImage("pgvector/pgvector", "pg17")
    .WithDataVolume()
    .WithInitFiles("./postgres-init");

var carpilotDb = postgres.AddDatabase("carpilot");

var rustfs = builder.AddRustFs("rustfs")
    .WithDataVolume();

var documentsBucket = rustfs.AddBucket("documents");
var avatarsBucket = rustfs.AddBucket("avatars");

var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithDataVolume()
    .WithRealmImport("./Realms");

var server = builder.AddProject<Projects.CarPilot_Server>("server")
    .WithReference(carpilotDb)
    .WithReference(documentsBucket)
    .WithReference(avatarsBucket)
    .WithReference(keycloak)
    .WaitFor(carpilotDb)
    .WaitFor(rustfs)
    .WaitFor(keycloak)
    .WithEnvironment("Keycloak__Realm", "carpilot")
    .WithEnvironment("Keycloak__ClientId", "carpilot-api")
    .WithEnvironment("Keycloak__ClientSecret", "carpilot-api-secret")
    .WithEnvironment("Keycloak__AdminClientId", "carpilot-api")
    .WithEnvironment("DemoUser__Id", "a0000000-0000-4000-8000-000000000001")
    .WithEnvironment("DemoUser__Email", "john.smith@carpilot.demo")
    .WithEnvironment("DemoUser__Password", "demo")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

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
    .WithEnvironment("LANGCHAIN_TRACING_V2", "true")
    .WithEnvironment("LANGCHAIN_PROJECT", "carpilot-ai-dev")
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
