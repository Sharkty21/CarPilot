using CarPilot.Server.Auth;
using CarPilot.Server.Data;
using CarPilot.Server.Entities;
using CarPilot.Server.Models;

using Microsoft.EntityFrameworkCore;

namespace CarPilot.Server.Repositories;

public class EfGarageRepository(CarPilotDbContext db, ICurrentUser currentUser) : IGarageRepository
{
    private Guid UserId => currentUser.UserId;

    public UserProfile GetUser()
    {
        var entity = db.Users.AsNoTracking().FirstOrDefault(u => u.Id == UserId)
            ?? throw new InvalidOperationException("User profile not found.");
        return GarageMapper.ToModel(entity);
    }

    public IReadOnlyList<OwnedVehicle> GetVehicles()
    {
        var vehicles = db.Vehicles.AsNoTracking()
            .Include(v => v.Documents)
            .Where(v => v.UserId == UserId)
            .OrderBy(v => v.Nickname)
            .ToList();

        return vehicles.Select(GarageMapper.ToModel).ToList();
    }

    public OwnedVehicle? FindVehicle(string vehicleId)
    {
        var entity = LoadVehicle(vehicleId);
        return entity is null ? null : GarageMapper.ToModel(entity);
    }

    public void AddVehicle(OwnedVehicle vehicle)
    {
        var entity = new VehicleEntity();
        GarageMapper.ApplyVehicle(entity, vehicle, UserId);
        db.Vehicles.Add(entity);
        SyncSectionDocuments(entity, vehicle);
        db.SaveChanges();
    }

    public void UpdateVehicle(OwnedVehicle vehicle)
    {
        var entity = db.Vehicles
            .Include(v => v.Documents)
            .FirstOrDefault(v => v.UserId == UserId && v.Id == vehicle.Id)
            ?? throw new InvalidOperationException($"Vehicle '{vehicle.Id}' was not found.");

        GarageMapper.ApplyVehicle(entity, vehicle, UserId);
        SyncSectionDocuments(entity, vehicle);
        db.SaveChanges();
    }

    public IReadOnlyList<MaintenanceRecord> GetMaintenanceRecords(string vehicleId)
    {
        var records = db.MaintenanceRecords.AsNoTracking()
            .Include(r => r.Documents)
            .Where(r => r.UserId == UserId && r.VehicleId == vehicleId)
            .OrderByDescending(r => r.Date)
            .ToList();

        return records.Select(GarageMapper.ToModel).ToList();
    }

    public void UpsertMaintenanceRecord(MaintenanceRecord record)
    {
        var entity = db.MaintenanceRecords
            .Include(r => r.Documents)
            .FirstOrDefault(r => r.UserId == UserId && r.Id == record.Id);

        if (entity is null)
        {
            entity = new MaintenanceRecordEntity();
            db.MaintenanceRecords.Add(entity);
        }

        GarageMapper.ApplyMaintenance(entity, record, UserId);

        var existingDocs = entity.Documents.ToList();
        var desiredIds = record.Documents.Select(d => d.Id).ToHashSet();

        foreach (var obsolete in existingDocs.Where(d => !desiredIds.Contains(d.Id)))
        {
            db.Documents.Remove(obsolete);
        }

        foreach (var doc in record.Documents)
        {
            var match = existingDocs.FirstOrDefault(d => d.Id == doc.Id);
            if (match is null)
            {
                db.Documents.Add(
                    GarageMapper.ToDocumentEntity(doc, UserId, record.VehicleId, "Maintenance", record.Id));
                continue;
            }

            match.Name = doc.Name;
            match.Kind = doc.Kind;
            match.UploadedAt = doc.UploadedAt;
            match.Url = doc.Url ?? match.Url;
            match.MaintenanceRecordId = record.Id;
            match.Section = "Maintenance";
        }

        db.SaveChanges();
    }

    public bool DeleteMaintenanceRecord(string vehicleId, string recordId)
    {
        var entity = db.MaintenanceRecords
            .FirstOrDefault(r => r.UserId == UserId && r.VehicleId == vehicleId && r.Id == recordId);
        if (entity is null) return false;

        db.MaintenanceRecords.Remove(entity);
        db.SaveChanges();
        return true;
    }

    public IReadOnlyList<Conversation> GetConversations(string vehicleId)
    {
        var conversations = db.Conversations.AsNoTracking()
            .Where(c => c.UserId == UserId && c.VehicleId == vehicleId)
            .OrderByDescending(c => c.Date)
            .ToList();

        return conversations.Select(GarageMapper.ToModel).ToList();
    }

    public void UpsertConversation(Conversation conversation)
    {
        var entity = db.Conversations
            .FirstOrDefault(c => c.UserId == UserId && c.Id == conversation.Id);

        if (entity is null)
        {
            entity = new ConversationEntity();
            db.Conversations.Add(entity);
        }

        GarageMapper.ApplyConversation(entity, conversation, UserId);
        db.SaveChanges();
    }

    private VehicleEntity? LoadVehicle(string vehicleId) =>
        db.Vehicles.AsNoTracking()
            .Include(v => v.Documents)
            .FirstOrDefault(v => v.UserId == UserId && v.Id == vehicleId);

    private void SyncSectionDocuments(VehicleEntity entity, OwnedVehicle vehicle)
    {
        var desired = new List<(VehicleDocument Doc, string Section)>();
        desired.AddRange(vehicle.Finance.Documents.Select(d => (d, "Finance")));
        desired.AddRange(vehicle.Insurance.Documents.Select(d => (d, "Insurance")));
        desired.AddRange(vehicle.Warranty.Documents.Select(d => (d, "Warranty")));

        var existing = entity.Documents.Where(d => d.MaintenanceRecordId is null).ToList();
        var desiredIds = desired.Select(d => d.Doc.Id).ToHashSet();

        foreach (var obsolete in existing.Where(d => !desiredIds.Contains(d.Id)))
        {
            db.Documents.Remove(obsolete);
        }

        foreach (var (doc, section) in desired)
        {
            var match = existing.FirstOrDefault(d => d.Id == doc.Id);
            if (match is null)
            {
                db.Documents.Add(GarageMapper.ToDocumentEntity(doc, UserId, vehicle.Id, section));
                continue;
            }

            match.Section = section;
            match.Name = doc.Name;
            match.Kind = doc.Kind;
            match.UploadedAt = doc.UploadedAt;
            match.Url = doc.Url ?? match.Url;
        }
    }
}
