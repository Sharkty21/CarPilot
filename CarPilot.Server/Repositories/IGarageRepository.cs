using CarPilot.Server.Models;

namespace CarPilot.Server.Repositories;

/// <summary>Storage for everything in the signed-in owner's garage.</summary>
public interface IGarageRepository
{
    UserProfile GetUser();

    IReadOnlyList<OwnedVehicle> GetVehicles();
    OwnedVehicle? FindVehicle(string vehicleId);
    void AddVehicle(OwnedVehicle vehicle);
    void UpdateVehicle(OwnedVehicle vehicle);

    IReadOnlyList<MaintenanceRecord> GetMaintenanceRecords(string vehicleId);
    void UpsertMaintenanceRecord(MaintenanceRecord record);
    bool DeleteMaintenanceRecord(string vehicleId, string recordId);

    IReadOnlyList<Conversation> GetConversations(string vehicleId);
    void UpsertConversation(Conversation conversation);
}
