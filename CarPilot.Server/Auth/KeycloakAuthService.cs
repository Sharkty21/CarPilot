using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

using CarPilot.Server.Data;

namespace CarPilot.Server.Auth;

public interface IKeycloakAuthService
{
    Task<TokenResponse> LoginAsync(string email, string password, CancellationToken cancellationToken = default);
    Task<TokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<(Guid UserId, string Name, string Email)> RegisterAsync(
        string name,
        string email,
        string password,
        CancellationToken cancellationToken = default);
    Task EnsureDemoUserAsync(CancellationToken cancellationToken = default);
}

public sealed class KeycloakOptions
{
    public const string SectionName = "Keycloak";
    public string Realm { get; set; } = "carpilot";
    public string ClientId { get; set; } = "carpilot-api";
    public string ClientSecret { get; set; } = "carpilot-api-secret";
    public string AdminClientId { get; set; } = "carpilot-api";
}

public sealed class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }

    [JsonPropertyName("token_type")]
    public string TokenType { get; set; } = "Bearer";
}

public sealed class KeycloakAuthService(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    CarPilotDbContext db) : IKeycloakAuthService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly KeycloakOptions _options = configuration.GetSection(KeycloakOptions.SectionName).Get<KeycloakOptions>()
        ?? new KeycloakOptions();

    public async Task<TokenResponse> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["username"] = email,
            ["password"] = password,
            ["scope"] = "openid profile email offline_access",
        });

        var response = await client.PostAsync(
            $"realms/{_options.Realm}/protocol/openid-connect/token",
            content,
            cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Login failed: {body}");
        }

        return JsonSerializer.Deserialize<TokenResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("Empty token response.");
    }

    public async Task<TokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["refresh_token"] = refreshToken,
        });

        var response = await client.PostAsync(
            $"realms/{_options.Realm}/protocol/openid-connect/token",
            content,
            cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Refresh failed: {body}");
        }

        return JsonSerializer.Deserialize<TokenResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("Empty token response.");
    }

    public async Task<(Guid UserId, string Name, string Email)> RegisterAsync(
        string name,
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        var adminToken = await GetClientCredentialsTokenAsync(cancellationToken);
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var parts = name.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = parts.ElementAtOrDefault(0) ?? name;
        var lastName = parts.ElementAtOrDefault(1) ?? "";

        var payload = new
        {
            username = email,
            email,
            firstName,
            lastName,
            enabled = true,
            emailVerified = true,
            credentials = new[]
            {
                new { type = "password", value = password, temporary = false },
            },
        };

        using var createContent = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        var createResponse = await client.PostAsync(
            $"admin/realms/{_options.Realm}/users",
            createContent,
            cancellationToken);
        if (createResponse.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new InvalidOperationException("A user with that email already exists.");
        }

        if (!createResponse.IsSuccessStatusCode)
        {
            var error = await createResponse.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"User registration failed: {error}");
        }

        var location = createResponse.Headers.Location?.ToString()
            ?? throw new InvalidOperationException("Keycloak did not return a user location.");
        var userIdSegment = location.TrimEnd('/').Split('/').Last();
        if (!Guid.TryParse(userIdSegment, out var userId))
        {
            throw new InvalidOperationException("Keycloak returned an invalid user id.");
        }

        await DbInitializer.EnsureUserProfileAsync(db, userId, name, email, cancellationToken);
        return (userId, name, email);
    }

    public async Task EnsureDemoUserAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await LoginAsync(DbInitializer.DemoEmail, "demo", cancellationToken);
            await DbInitializer.EnsureUserProfileAsync(
                db,
                DbInitializer.DemoUserId,
                DbInitializer.DemoName,
                DbInitializer.DemoEmail,
                cancellationToken);
            return;
        }
        catch
        {
            // Fall through and try to create via Admin API.
        }

        try
        {
            var adminToken = await GetClientCredentialsTokenAsync(cancellationToken);
            var client = CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

            var payload = new
            {
                id = DbInitializer.DemoUserId.ToString(),
                username = DbInitializer.DemoEmail,
                email = DbInitializer.DemoEmail,
                firstName = "John",
                lastName = "Smith",
                enabled = true,
                emailVerified = true,
                credentials = new[]
                {
                    new { type = "password", value = "demo", temporary = false },
                },
            };

            using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            await client.PostAsync($"admin/realms/{_options.Realm}/users", content, cancellationToken);
        }
        catch
        {
            // Realm import may already have the user; garage seed still runs independently.
        }

        await DbInitializer.EnsureUserProfileAsync(
            db,
            DbInitializer.DemoUserId,
            DbInitializer.DemoName,
            DbInitializer.DemoEmail,
            cancellationToken);
    }

    private HttpClient CreateClient()
    {
        var client = httpClientFactory.CreateClient("keycloak");
        if (client.BaseAddress is null)
        {
            var authority = configuration["services:keycloak:https:0"]
                ?? configuration["services:keycloak:http:0"]
                ?? throw new InvalidOperationException("Keycloak service endpoint is not configured.");
            client.BaseAddress = new Uri(authority.TrimEnd('/') + "/");
        }

        return client;
    }

    private async Task<string> GetClientCredentialsTokenAsync(CancellationToken cancellationToken)
    {
        var client = CreateClient();
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = _options.AdminClientId,
            ["client_secret"] = _options.ClientSecret,
        });

        var response = await client.PostAsync(
            $"realms/{_options.Realm}/protocol/openid-connect/token",
            content,
            cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Unable to obtain Keycloak admin token: {body}");
        }

        var token = JsonSerializer.Deserialize<TokenResponse>(body, JsonOptions);
        return token?.AccessToken
            ?? throw new InvalidOperationException("Empty admin token response.");
    }
}
