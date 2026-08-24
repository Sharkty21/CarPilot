using CarPilot.Server.Data;
using CarPilot.Server.Models;

namespace CarPilot.Server.Repositories;

/// <summary>
/// Holds the garage in process memory, seeded on startup. Registered as a
/// singleton, so writes are visible to later requests but lost on restart.
/// </summary>
public class InMemoryGarageRepository : IGarageRepository
{
    private readonly Lock _gate = new();
    private readonly UserProfile _user = GarageSeedData.User();
    private readonly List<OwnedVehicle> _vehicles = GarageSeedData.Vehicles();
    private readonly List<MaintenanceRecord> _records = GarageSeedData.MaintenanceRecords();
    private readonly List<Conversation> _conversations = GarageSeedData.Conversations();

    public UserProfile GetUser() => _user;

    public IReadOnlyList<OwnedVehicle> GetVehicles()
    {
        lock (_gate)
        {
            return [.. _vehicles];
        }
    }

    public OwnedVehicle? FindVehicle(string vehicleId)
    {
        lock (_gate)
        {
            return _vehicles.FirstOrDefault(vehicle => vehicle.Id == vehicleId);
        }
    }

    public void AddVehicle(OwnedVehicle vehicle)
    {
        lock (_gate)
        {
            _vehicles.Add(vehicle);
        }
    }

    public void UpdateVehicle(OwnedVehicle vehicle)
    {
        lock (_gate)
        {
            var index = _vehicles.FindIndex(existing => existing.Id == vehicle.Id);
            if (index >= 0)
            {
                _vehicles[index] = vehicle;
            }
        }
    }

    public IReadOnlyList<MaintenanceRecord> GetMaintenanceRecords(string vehicleId)
    {
        lock (_gate)
        {
            return [.. _records.Where(record => record.VehicleId == vehicleId)];
        }
    }

    public void UpsertMaintenanceRecord(MaintenanceRecord record)
    {
        lock (_gate)
        {
            var index = _records.FindIndex(existing => existing.Id == record.Id);
            if (index >= 0)
            {
                _records[index] = record;
            }
            else
            {
                _records.Insert(0, record);
            }
        }
    }

    public IReadOnlyList<Conversation> GetConversations(string vehicleId)
    {
        lock (_gate)
        {
            return [.. _conversations.Where(conversation => conversation.VehicleId == vehicleId)];
        }
    }

    public void UpsertConversation(Conversation conversation)
    {
        lock (_gate)
        {
            var index = _conversations.FindIndex(existing => existing.Id == conversation.Id);
            if (index >= 0)
            {
                _conversations[index] = conversation;
            }
            else
            {
                _conversations.Insert(0, conversation);
            }
        }
    }
}
