using System.Security.Claims;

namespace CarPilot.Server.Auth;

public interface ICurrentUser
{
    Guid UserId { get; }
    string? Email { get; }
    string? Name { get; }
    bool IsAuthenticated { get; }
}

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public bool IsAuthenticated =>
        httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

    public Guid UserId
    {
        get
        {
            var sub = httpContextAccessor.HttpContext?.User?.FindFirstValue("sub")
                ?? httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(sub, out var id))
            {
                return id;
            }

            throw new UnauthorizedAccessException("Authenticated user id (sub) is missing or invalid.");
        }
    }

    public string? Email =>
        httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
        ?? httpContextAccessor.HttpContext?.User?.FindFirstValue("email");

    public string? Name
    {
        get
        {
            var user = httpContextAccessor.HttpContext?.User;
            if (user is null) return null;

            var name = user.FindFirstValue("name")
                ?? user.FindFirstValue(ClaimTypes.Name);
            if (!string.IsNullOrWhiteSpace(name)) return name;

            var given = user.FindFirstValue(ClaimTypes.GivenName) ?? user.FindFirstValue("given_name");
            var family = user.FindFirstValue(ClaimTypes.Surname) ?? user.FindFirstValue("family_name");
            var combined = $"{given} {family}".Trim();
            return string.IsNullOrWhiteSpace(combined) ? null : combined;
        }
    }
}
