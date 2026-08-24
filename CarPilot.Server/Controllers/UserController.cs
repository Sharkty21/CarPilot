using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/user")]
public class UserController(IGarageService garage) : ControllerBase
{
    [HttpGet("profile")]
    public ActionResult<UserProfile> GetProfile() => Ok(garage.GetUser());
}
