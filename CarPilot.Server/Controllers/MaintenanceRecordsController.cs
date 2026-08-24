using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/vehicles/{vehicleId}/maintenance-records")]
public class MaintenanceRecordsController(IGarageService garage) : GarageControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<MaintenanceRecord>> GetRecords(string vehicleId) =>
        garage.GetMaintenanceRecords(vehicleId) is { } records ? Ok(records) : VehicleNotFound(vehicleId);

    /// <summary>Creates or replaces a record; the client owns the id so a retry is idempotent.</summary>
    [HttpPut("{recordId}")]
    public ActionResult<MaintenanceRecord> SaveRecord(
        string vehicleId,
        string recordId,
        MaintenanceRecord record) =>
        garage.SaveMaintenanceRecord(vehicleId, recordId, record) is { } saved
            ? Ok(saved)
            : VehicleNotFound(vehicleId);
}
