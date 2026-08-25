using Microsoft.Extensions.Http.Resilience;

using CarPilot.Server.Auth;
using CarPilot.Server.Data;
using CarPilot.Server.Repositories;
using CarPilot.Server.Services;
using CarPilot.Server.Storage;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using Pgvector.EntityFrameworkCore;

using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CarPilotDbContext>(
    "carpilot",
    configureDbContextOptions: options =>
    {
        var connectionString = builder.Configuration.GetConnectionString("carpilot");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            // Disable GSS encryption negotiation: the deployed container image doesn't
            // include libgssapi-krb5, and Npgsql 10+ defaults to attempting it first.
            var builderCs = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
            {
                // Container-to-container Postgres on ACA has no TLS/GSS.
                GssEncryptionMode = Npgsql.GssEncryptionMode.Disable,
                SslMode = Npgsql.SslMode.Disable,
                Timeout = 30,
            };
            options.UseNpgsql(builderCs.ConnectionString, npgsql => npgsql.UseVector());
        }
    });

builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.Configure<DemoUserOptions>(builder.Configuration.GetSection(DemoUserOptions.SectionName));

var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();
if (string.IsNullOrWhiteSpace(authOptions.JwtSigningKey) || authOptions.JwtSigningKey.Length < 32)
{
    throw new InvalidOperationException("Auth:JwtSigningKey must be configured (min 32 characters).");
}

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtSigningKey));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authOptions.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = authOptions.JwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            NameClaimType = "preferred_username",
            RoleClaimType = "roles",
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (context.Principal?.FindFirst("token_use")?.Value == "refresh")
                {
                    context.Fail("Refresh tokens cannot be used as access tokens.");
                }

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IAuthService, DemoAuthService>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IGarageRepository, EfGarageRepository>();
builder.Services.AddScoped<IGarageService, GarageService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();
builder.Services.AddSingleton<IObjectStorageService, S3ObjectStorageService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<IDocumentIndexService, DocumentIndexService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddScoped<IAiDocumentClient, AiDocumentClient>();
builder.Services.AddSingleton<IUploadStagingService, UploadStagingService>();

builder.Services.AddHttpClient("carpilot-ai", client =>
{
    client.BaseAddress = new Uri("https+http://carpilot-ai");
    client.Timeout = TimeSpan.FromMinutes(5);
})
// SSE streams must not go through the standard resilience pipeline (buffering/retries).
.RemoveAllResilienceHandlers();

var app = builder.Build();

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapDefaultEndpoints();
app.UseFileServer();
app.MapFallbackToFile("index.html");

// Listen immediately so ACA startup probes succeed while Postgres (Azure Files)
// finishes recovery and migrations run.
await app.StartAsync();

try
{
    await DbInitializer.InitializeAsync(app.Services);
    await using var scope = app.Services.CreateAsyncScope();
    var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
    await auth.EnsureDemoUserAsync();
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database initialization failed; API is up but may be unhealthy until DB is ready.");
}

await app.WaitForShutdownAsync();
