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

using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CarPilotDbContext>(
    "carpilot",
    configureDbContextOptions: options =>
    {
        var connectionString = builder.Configuration.GetConnectionString("carpilot");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            options.UseNpgsql(connectionString, npgsql => npgsql.UseVector());
        }
    });

builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<KeycloakOptions>(builder.Configuration.GetSection(KeycloakOptions.SectionName));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddKeycloakJwtBearer(
        serviceName: "keycloak",
        realm: builder.Configuration["Keycloak:Realm"] ?? "carpilot",
        options =>
        {
            options.Audience = builder.Configuration["Keycloak:ClientId"] ?? "carpilot-api";
            options.RequireHttpsMetadata = false;
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Keycloak:ClientId"] ?? "carpilot-api",
                NameClaimType = "preferred_username",
                RoleClaimType = "roles",
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    if (context.Principal?.Identity is not ClaimsIdentity identity)
                    {
                        return;
                    }

                    if (identity.HasClaim(c => c.Type is "sub" or ClaimTypes.NameIdentifier))
                    {
                        return;
                    }

                    var email = identity.FindFirst("email")?.Value
                        ?? identity.FindFirst(ClaimTypes.Email)?.Value;
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        return;
                    }

                    var db = context.HttpContext.RequestServices.GetRequiredService<CarPilotDbContext>();
                    var userId = await db.Users.AsNoTracking()
                        .Where(u => u.Email == email)
                        .Select(u => u.Id)
                        .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

                    if (userId != Guid.Empty)
                    {
                        identity.AddClaim(new Claim("sub", userId.ToString()));
                    }
                },
            };
        });

builder.Services.AddAuthorization();

builder.Services.AddHttpClient("keycloak", client =>
{
    // Prefer HTTPS (Keycloak’s published endpoint), fall back to HTTP.
    client.BaseAddress = new Uri("https+http://keycloak");
});

builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IGarageRepository, EfGarageRepository>();
builder.Services.AddScoped<IGarageService, GarageService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();
builder.Services.AddScoped<IKeycloakAuthService, KeycloakAuthService>();
builder.Services.AddSingleton<IObjectStorageService, S3ObjectStorageService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<IDocumentIndexService, DocumentIndexService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();

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

await DbInitializer.InitializeAsync(app.Services);

try
{
    await using var scope = app.Services.CreateAsyncScope();
    var keycloak = scope.ServiceProvider.GetRequiredService<IKeycloakAuthService>();
    await keycloak.EnsureDemoUserAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Unable to ensure Keycloak demo user on startup.");
}

app.Run();
