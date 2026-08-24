using CarPilot.Server.Auth;
using CarPilot.Server.Data;
using CarPilot.Server.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public class AuthController(
    IAuthService auth,
    CarPilotDbContext db) : ControllerBase
{
    public sealed record LoginRequest(string Email, string Password);
    public sealed record RegisterRequest(string Name, string Email, string Password);
    public sealed record RefreshRequest(string RefreshToken);
    public sealed record AuthResponse(
        string AccessToken,
        string? RefreshToken,
        int ExpiresIn,
        UserProfile User);

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ProblemDetails { Title = "Email and password are required." });
        }

        try
        {
            var tokens = await auth.LoginAsync(request.Email.Trim(), request.Password, cancellationToken);
            var profile = await ResolveProfileAsync(request.Email.Trim(), cancellationToken);
            return Ok(new AuthResponse(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresIn, profile));
        }
        catch (Exception ex)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Invalid credentials",
                Detail = ex.Message,
                Status = StatusCodes.Status401Unauthorized,
            });
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name)
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ProblemDetails { Title = "Name, email, and password are required." });
        }

        try
        {
            var created = await auth.RegisterAsync(
                request.Name.Trim(),
                request.Email.Trim(),
                request.Password,
                cancellationToken);
            var tokens = await auth.LoginAsync(created.Email, request.Password, cancellationToken);
            var profile = new UserProfile
            {
                Name = created.Name,
                Email = created.Email,
            };
            return Ok(new AuthResponse(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresIn, profile));
        }
        catch (Exception ex)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Unable to create account",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
            });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new ProblemDetails { Title = "Refresh token is required." });
        }

        try
        {
            var tokens = await auth.RefreshAsync(request.RefreshToken, cancellationToken);
            return Ok(new AuthResponse(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresIn, new UserProfile()));
        }
        catch (Exception ex)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Unable to refresh session",
                Detail = ex.Message,
                Status = StatusCodes.Status401Unauthorized,
            });
        }
    }

    private async Task<UserProfile> ResolveProfileAsync(string email, CancellationToken cancellationToken)
    {
        var entity = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (entity is not null)
        {
            return GarageMapper.ToModel(entity);
        }

        return new UserProfile { Email = email, Name = email };
    }
}
