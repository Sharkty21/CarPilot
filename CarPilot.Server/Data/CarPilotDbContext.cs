using CarPilot.Server.Entities;

using Microsoft.EntityFrameworkCore;

namespace CarPilot.Server.Data;

public class CarPilotDbContext(DbContextOptions<CarPilotDbContext> options) : DbContext(options)
{
    public DbSet<UserProfileEntity> Users => Set<UserProfileEntity>();
    public DbSet<VehicleEntity> Vehicles => Set<VehicleEntity>();
    public DbSet<VehicleDocumentEntity> Documents => Set<VehicleDocumentEntity>();
    public DbSet<MaintenanceRecordEntity> MaintenanceRecords => Set<MaintenanceRecordEntity>();
    public DbSet<ConversationEntity> Conversations => Set<ConversationEntity>();
    public DbSet<DocumentChunkEntity> DocumentChunks => Set<DocumentChunkEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<UserProfileEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Email).HasMaxLength(320);
        });

        modelBuilder.Entity<VehicleEntity>(entity =>
        {
            entity.ToTable("vehicles");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.UserId);
            entity.Property(x => x.Id).HasMaxLength(64);
            entity.HasOne(x => x.User)
                .WithMany(x => x.Vehicles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VehicleDocumentEntity>(entity =>
        {
            entity.ToTable("vehicle_documents");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.VehicleId });
            entity.Property(x => x.Id).HasMaxLength(64);
            entity.Property(x => x.Section).HasMaxLength(32);
            entity.HasOne(x => x.Vehicle)
                .WithMany(x => x.Documents)
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.MaintenanceRecord)
                .WithMany(x => x.Documents)
                .HasForeignKey(x => x.MaintenanceRecordId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MaintenanceRecordEntity>(entity =>
        {
            entity.ToTable("maintenance_records");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.VehicleId });
            entity.Property(x => x.Id).HasMaxLength(64);
            entity.HasOne(x => x.Vehicle)
                .WithMany(x => x.MaintenanceRecords)
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ConversationEntity>(entity =>
        {
            entity.ToTable("conversations");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.VehicleId });
            entity.Property(x => x.Id).HasMaxLength(64);
            entity.HasOne(x => x.Vehicle)
                .WithMany(x => x.Conversations)
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DocumentChunkEntity>(entity =>
        {
            entity.ToTable("document_chunks");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.DocumentId });
            entity.Property(x => x.Embedding)
                .HasColumnType($"vector({EmbeddingConstants.Dimensions})");
            entity.HasOne(x => x.Document)
                .WithMany(x => x.Chunks)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
