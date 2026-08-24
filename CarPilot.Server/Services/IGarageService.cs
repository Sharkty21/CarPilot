using CarPilot.Server.Contracts;
using CarPilot.Server.Models;

namespace CarPilot.Server.Services;

/// <summary>
/// Garage use cases. Methods that target a single vehicle return null when no
/// vehicle with that id exists, which the controllers turn into a 404.
/// </summary>
public interface IGarageService
{
    UserProfile GetUser();

    IReadOnlyList<OwnedVehicle> GetVehicles();
    OwnedVehicle AddVehicle(CreateVehicleRequest request);
    OwnedVehicle? UpdateDetails(string vehicleId, VehicleDetailsRequest request);
    OwnedVehicle? UpdateFinance(string vehicleId, FinanceRequest request);
    OwnedVehicle? UpdateInsurance(string vehicleId, InsuranceRequest request);
    OwnedVehicle? UpdateWarranty(string vehicleId, WarrantyRequest request);
    OwnedVehicle? AddDocuments(string vehicleId, DocumentSection section, IEnumerable<VehicleDocument> documents);
    OwnedVehicle? RemoveDocument(string vehicleId, DocumentSection section, string documentId);

    IReadOnlyList<MaintenanceRecord>? GetMaintenanceRecords(string vehicleId);
    MaintenanceRecord? SaveMaintenanceRecord(string vehicleId, string recordId, MaintenanceRecord record);
    bool? DeleteMaintenanceRecord(string vehicleId, string recordId);

    IReadOnlyList<Conversation>? GetConversations(string vehicleId);
    Conversation? SaveConversation(string vehicleId, string conversationId, Conversation conversation);
}
