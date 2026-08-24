using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

/// <summary>Shared 404 handling for the endpoints scoped to a single vehicle.</summary>
public abstract class GarageControllerBase : ControllerBase
{
    protected ActionResult VehicleNotFound(string vehicleId) =>
        NotFound(new ProblemDetails
        {
            Title = "Vehicle not found",
            Detail = $"No vehicle with id '{vehicleId}' is in this garage.",
            Status = StatusCodes.Status404NotFound,
        });
}
