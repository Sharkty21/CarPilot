using CarPilot.Server.Entities;
using CarPilot.Server.Models;

using Microsoft.EntityFrameworkCore;

using Npgsql;

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
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        // Aspire AddDatabase only creates the DB while the AppHost is running locally.
        // On Azure Container Apps the database must already exist (or be created here).
        await EnsureDatabaseExistsAsync(configuration.GetConnectionString("carpilot"), cancellationToken);

        await db.Database.MigrateAsync(cancellationToken);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE EXTENSION IF NOT EXISTS vector;",
            cancellationToken);

        await SeedDemoGarageAsync(db, cancellationToken);
    }

    private static async Task EnsureDatabaseExistsAsync(string? connectionString, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            GssEncryptionMode = GssEncryptionMode.Disable,
            SslMode = SslMode.Disable,
            Timeout = 30,
        };

        var databaseName = builder.Database;
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return;
        }

        builder.Database = "postgres";

        await using var connection = new NpgsqlConnection(builder.ConnectionString);
        await OpenWhenReadyAsync(connection, cancellationToken);

        await using (var existsCommand = connection.CreateCommand())
        {
            existsCommand.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name";
            existsCommand.Parameters.AddWithValue("name", databaseName);
            var exists = await existsCommand.ExecuteScalarAsync(cancellationToken) is not null;
            if (exists)
            {
                return;
            }
        }

        // Database names can't be parameterized; quote carefully.
        var quotedName = "\"" + databaseName.Replace("\"", "\"\"") + "\"";
        await using var createCommand = connection.CreateCommand();
        createCommand.CommandText = $"CREATE DATABASE {quotedName}";
        await createCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task OpenWhenReadyAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        // Postgres on Azure Files can take several minutes after a revision restart.
        const int maxAttempts = 60;
        Exception? lastError = null;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await connection.OpenAsync(cancellationToken);
                return;
            }
            catch (Exception ex) when (IsTransientStartup(ex))
            {
                lastError = ex;
                if (attempt == maxAttempts)
                {
                    break;
                }

                await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
            }
        }

        throw new InvalidOperationException(
            $"PostgreSQL was not ready after {maxAttempts} attempts.",
            lastError);
    }

    private static bool IsTransientStartup(Exception ex)
    {
        for (var current = ex; current is not null; current = current.InnerException)
        {
            if (current is PostgresException pg && pg.SqlState is "57P03" or "57P01")
            {
                return true;
            }

            if (current is NpgsqlException)
            {
                return true;
            }
        }

        return false;
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
