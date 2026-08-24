using CarPilot.Server.Contracts;
using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/vehicles")]
public class VehiclesController(IGarageService garage) : GarageControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<OwnedVehicle>> GetVehicles() => Ok(garage.GetVehicles());

    [HttpPost]
    public ActionResult<OwnedVehicle> CreateVehicle(CreateVehicleRequest request)
    {
        var vehicle = garage.AddVehicle(request);
        return CreatedAtAction(nameof(GetVehicles), new { id = vehicle.Id }, vehicle);
    }

    [HttpPut("{vehicleId}/details")]
    public ActionResult<OwnedVehicle> UpdateDetails(string vehicleId, VehicleDetailsRequest request) =>
        garage.UpdateDetails(vehicleId, request) is { } vehicle ? Ok(vehicle) : VehicleNotFound(vehicleId);

    [HttpPut("{vehicleId}/finance")]
    public ActionResult<OwnedVehicle> UpdateFinance(string vehicleId, FinanceRequest request) =>
        garage.UpdateFinance(vehicleId, request) is { } vehicle ? Ok(vehicle) : VehicleNotFound(vehicleId);

    [HttpPut("{vehicleId}/insurance")]
    public ActionResult<OwnedVehicle> UpdateInsurance(string vehicleId, InsuranceRequest request) =>
        garage.UpdateInsurance(vehicleId, request) is { } vehicle ? Ok(vehicle) : VehicleNotFound(vehicleId);

    [HttpPut("{vehicleId}/warranty")]
    public ActionResult<OwnedVehicle> UpdateWarranty(string vehicleId, WarrantyRequest request) =>
        garage.UpdateWarranty(vehicleId, request) is { } vehicle ? Ok(vehicle) : VehicleNotFound(vehicleId);

    [HttpPost("{vehicleId}/documents/{section}")]
    public ActionResult<OwnedVehicle> AddDocuments(
        string vehicleId,
        DocumentSection section,
        AddDocumentsRequest request) =>
        garage.AddDocuments(vehicleId, section, request.Documents) is { } vehicle
            ? Ok(vehicle)
            : VehicleNotFound(vehicleId);

    [HttpDelete("{vehicleId}/documents/{section}/{documentId}")]
    public ActionResult<OwnedVehicle> RemoveDocument(
        string vehicleId,
        DocumentSection section,
        string documentId) =>
        garage.RemoveDocument(vehicleId, section, documentId) is { } vehicle
            ? Ok(vehicle)
            : VehicleNotFound(vehicleId);
}
