using CarPilot.Server.Entities;
using CarPilot.Server.Models;

using Microsoft.EntityFrameworkCore;

namespace CarPilot.Server.Data;

/// <summary>
/// Applies migrations and upserts production demo garage data for John Smith.
/// Runs in every environment (not Development-only).
/// </summary>
public static class DbInitializer
{
    public static readonly Guid DemoUserId = Guid.Parse("a0000000-0000-4000-8000-000000000001");
    public const string DemoEmail = "john.smith@carpilot.demo";
    public const string DemoName = "John Smith";

    public static async Task InitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CarPilotDbContext>();

        await db.Database.MigrateAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE EXTENSION IF NOT EXISTS vector;",
            cancellationToken);

        await SeedDemoGarageAsync(db, cancellationToken);
    }

    public static async Task EnsureUserProfileAsync(
        CarPilotDbContext db,
        Guid userId,
        string name,
        string email,
        CancellationToken cancellationToken = default)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (existing is null)
        {
            db.Users.Add(new UserProfileEntity
            {
                Id = userId,
                Name = name,
                Email = email,
            });
        }
        else
        {
            existing.Name = name;
            existing.Email = email;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedDemoGarageAsync(CarPilotDbContext db, CancellationToken cancellationToken)
    {
        await EnsureUserProfileAsync(
            db,
            DemoUserId,
            DemoName,
            DemoEmail,
            cancellationToken);

        // Refresh demo profile fields even if seed already ran.
        var user = await db.Users.FirstAsync(u => u.Id == DemoUserId, cancellationToken);
        user.Name = DemoName;
        user.Email = DemoEmail;
        user.AvatarUrl ??= "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces";

        if (await db.Vehicles.AnyAsync(v => v.UserId == DemoUserId, cancellationToken))
        {
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        foreach (var vehicle in GarageSeedData.Vehicles())
        {
            var entity = new VehicleEntity();
            GarageMapper.ApplyVehicle(entity, vehicle, DemoUserId);
            db.Vehicles.Add(entity);

            foreach (var doc in vehicle.Finance.Documents)
            {
                db.Documents.Add(GarageMapper.ToDocumentEntity(doc, DemoUserId, vehicle.Id, "Finance"));
            }

            foreach (var doc in vehicle.Insurance.Documents)
            {
                db.Documents.Add(GarageMapper.ToDocumentEntity(doc, DemoUserId, vehicle.Id, "Insurance"));
            }

            foreach (var doc in vehicle.Warranty.Documents)
            {
                db.Documents.Add(GarageMapper.ToDocumentEntity(doc, DemoUserId, vehicle.Id, "Warranty"));
            }
        }

        foreach (var record in GarageSeedData.MaintenanceRecords())
        {
            var entity = new MaintenanceRecordEntity();
            GarageMapper.ApplyMaintenance(entity, record, DemoUserId);
            db.MaintenanceRecords.Add(entity);

            foreach (var doc in record.Documents)
            {
                db.Documents.Add(
                    GarageMapper.ToDocumentEntity(doc, DemoUserId, record.VehicleId, "Maintenance", record.Id));
            }
        }

        foreach (var conversation in GarageSeedData.Conversations())
        {
            var entity = new ConversationEntity();
            GarageMapper.ApplyConversation(entity, conversation, DemoUserId);
            db.Conversations.Add(entity);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
