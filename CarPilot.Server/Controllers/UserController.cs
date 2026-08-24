using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/user")]
public class UserController(IGarageService garage, IFileUploadService uploads) : ControllerBase
{
    [HttpGet("profile")]
    public ActionResult<UserProfile> GetProfile() => Ok(garage.GetUser());

    [HttpPost("avatar")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<UserProfile>> UploadAvatar(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new ProblemDetails { Title = "Avatar file is required." });
        }

        var profile = await uploads.UploadAvatarAsync(file, cancellationToken);
        return Ok(profile);
    }
}
