using CarPilot.Server.Contracts;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/vehicles/{vehicleId}/assistant")]
public class AssistantController(IAssistantService assistant) : GarageControllerBase
{
    [HttpPost("ask")]
    public ActionResult<AssistantAnswer> Ask(string vehicleId, AskAssistantRequest request) =>
        assistant.Ask(vehicleId, request) is { } answer ? Ok(answer) : VehicleNotFound(vehicleId);
}
