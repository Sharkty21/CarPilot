using CarPilot.Server.Auth;
using CarPilot.Server.Contracts;
using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicles")]
public class VehiclesController(
    IGarageService garage,
    IFileUploadService uploads,
    IAiDocumentClient documents,
    IUploadStagingService staging,
    ICurrentUser currentUser) : GarageControllerBase
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

    [HttpPost("{vehicleId}/documents/{section}/upload")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<OwnedVehicle>> UploadDocuments(
        string vehicleId,
        DocumentSection section,
        [FromForm] List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (files is null || files.Count == 0)
        {
            return BadRequest(new ProblemDetails { Title = "At least one file is required." });
        }

        var vehicle = await uploads.UploadVehicleDocumentsAsync(vehicleId, section, files, cancellationToken);
        return vehicle is null ? VehicleNotFound(vehicleId) : Ok(vehicle);
    }

    [HttpPost("{vehicleId}/documents/extract")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<DocumentAutofillResult>> ExtractDocument(
        string vehicleId,
        [FromForm] IFormFile file,
        [FromForm] string section,
        CancellationToken cancellationToken)
    {
        if (garage.GetVehicles().All(vehicle => vehicle.Id != vehicleId))
        {
            return VehicleNotFound(vehicleId);
        }

        if (file is null || file.Length <= 0)
        {
            return BadRequest(new ProblemDetails { Title = "A document is required." });
        }

        await using var read = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await read.CopyToAsync(buffer, cancellationToken);

        try
        {
            var result = await documents.AutofillAsync(
                section,
                Path.GetFileName(file.FileName),
                file.ContentType,
                buffer.ToArray(),
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Title = "Could not read this document",
                Detail = ex.Message,
            });
        }
    }

    [HttpPost("{vehicleId}/documents/{section}/commit/{stagingId}")]
    public async Task<ActionResult<OwnedVehicle>> CommitStagedDocument(
        string vehicleId,
        DocumentSection section,
        string stagingId,
        CancellationToken cancellationToken)
    {
        var staged = staging.Get(currentUser.UserId, stagingId);
        if (staged is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Upload expired",
                Detail = "That attached file is no longer available. Please send it again.",
            });
        }

        try
        {
            var vehicle = await uploads.UploadVehicleDocumentAsync(
                vehicleId,
                section,
                staged.FileName,
                staged.ContentType,
                staged.Content,
                cancellationToken);
            if (vehicle is null) return VehicleNotFound(vehicleId);

            staging.Remove(currentUser.UserId, stagingId);
            return Ok(vehicle);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Title = "Could not store the document",
                Detail = ex.Message,
            });
        }
    }

    [HttpDelete("{vehicleId}/documents/{section}/{documentId}")]
    public ActionResult<OwnedVehicle> RemoveDocument(
        string vehicleId,
        DocumentSection section,
        string documentId) =>
        garage.RemoveDocument(vehicleId, section, documentId) is { } vehicle
            ? Ok(vehicle)
            : VehicleNotFound(vehicleId);
}
