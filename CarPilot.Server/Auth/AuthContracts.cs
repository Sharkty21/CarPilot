using System.Text.Json.Serialization;

using CarPilot.Server.Data;

namespace CarPilot.Server.Auth;

public interface IAuthService
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

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string JwtSigningKey { get; set; } = "CarPilot-Demo-Dev-Signing-Key-32b!";
    public string JwtIssuer { get; set; } = "carpilot";
    public string JwtAudience { get; set; } = "carpilot-api";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 14;
}

public sealed class DemoUserOptions
{
    public const string SectionName = "DemoUser";

    public Guid Id { get; set; } = DbInitializer.DemoUserId;
    public string Email { get; set; } = DbInitializer.DemoEmail;
    public string Password { get; set; } = "demo";
    public string Name { get; set; } = DbInitializer.DemoName;
}
