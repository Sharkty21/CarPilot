using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using CarPilot.Server.Data;

using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CarPilot.Server.Auth;

/// <summary>
/// Demo auth: validates the seeded John Smith credentials and issues HS256 JWTs.
/// Used for local Aspire and Azure — there is no external IdP in this project.
/// </summary>
public sealed class DemoAuthService(
    IOptions<AuthOptions> authOptions,
    IOptions<DemoUserOptions> demoUserOptions,
    CarPilotDbContext db) : IAuthService
{
    private readonly AuthOptions _auth = authOptions.Value;
    private readonly DemoUserOptions _demo = demoUserOptions.Value;

    public async Task<TokenResponse> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        if (!IsDemoCredentials(email, password))
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        await DbInitializer.EnsureUserProfileAsync(
            db,
            _demo.Id == Guid.Empty ? DbInitializer.DemoUserId : _demo.Id,
            string.IsNullOrWhiteSpace(_demo.Name) ? DbInitializer.DemoName : _demo.Name,
            CanonicalEmail(),
            cancellationToken);

        return IssueTokens();
    }

    public Task<TokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var principal = ValidateToken(refreshToken, requireRefresh: true)
            ?? throw new InvalidOperationException("Invalid refresh token.");

        var sub = principal.FindFirstValue("sub")
            ?? throw new InvalidOperationException("Invalid refresh token.");
        if (!Guid.TryParse(sub, out var userId) || userId != DemoId())
        {
            throw new InvalidOperationException("Invalid refresh token.");
        }

        return Task.FromResult(IssueTokens());
    }

    public Task<(Guid UserId, string Name, string Email)> RegisterAsync(
        string name,
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        throw new InvalidOperationException(
            $"Registration is disabled in demo mode. Sign in as {CanonicalEmail()} / {_demo.Password}.");
    }

    public async Task EnsureDemoUserAsync(CancellationToken cancellationToken = default)
    {
        await DbInitializer.EnsureUserProfileAsync(
            db,
            DemoId(),
            string.IsNullOrWhiteSpace(_demo.Name) ? DbInitializer.DemoName : _demo.Name,
            CanonicalEmail(),
            cancellationToken);
    }

    private TokenResponse IssueTokens()
    {
        var expiresIn = Math.Max(60, _auth.AccessTokenMinutes) * 60;
        var access = CreateToken(isRefresh: false, TimeSpan.FromMinutes(Math.Max(1, _auth.AccessTokenMinutes)));
        var refresh = CreateToken(isRefresh: true, TimeSpan.FromDays(Math.Max(1, _auth.RefreshTokenDays)));
        return new TokenResponse
        {
            AccessToken = access,
            RefreshToken = refresh,
            ExpiresIn = expiresIn,
            TokenType = "Bearer",
        };
    }

    private string CreateToken(bool isRefresh, TimeSpan lifetime)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(RequireSigningKey()));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var demoId = DemoId();
        var email = CanonicalEmail();
        var name = string.IsNullOrWhiteSpace(_demo.Name) ? DbInitializer.DemoName : _demo.Name;

        var claims = new List<Claim>
        {
            new("sub", demoId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new("email", email),
            new("name", name),
            new("preferred_username", email),
            new("token_use", isRefresh ? "refresh" : "access"),
        };

        var token = new JwtSecurityToken(
            issuer: _auth.JwtIssuer,
            audience: _auth.JwtAudience,
            claims: claims,
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private ClaimsPrincipal? ValidateToken(string token, bool requireRefresh)
    {
        var handler = new JwtSecurityTokenHandler();
        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _auth.JwtIssuer,
                ValidateAudience = true,
                ValidAudience = _auth.JwtAudience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(RequireSigningKey())),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),
                NameClaimType = "preferred_username",
            }, out _);

            var use = principal.FindFirstValue("token_use");
            if (requireRefresh && use != "refresh")
            {
                return null;
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }

    private bool IsDemoCredentials(string email, string password) =>
        string.Equals(email.Trim(), CanonicalEmail(), StringComparison.OrdinalIgnoreCase)
        && password == _demo.Password;

    private Guid DemoId() => _demo.Id == Guid.Empty ? DbInitializer.DemoUserId : _demo.Id;

    private string CanonicalEmail() =>
        string.IsNullOrWhiteSpace(_demo.Email) ? DbInitializer.DemoEmail : _demo.Email.Trim();

    private string RequireSigningKey()
    {
        if (string.IsNullOrWhiteSpace(_auth.JwtSigningKey) || _auth.JwtSigningKey.Length < 32)
        {
            throw new InvalidOperationException("Auth:JwtSigningKey must be at least 32 characters.");
        }

        return _auth.JwtSigningKey;
    }
}
