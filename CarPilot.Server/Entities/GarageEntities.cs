using Pgvector;

namespace CarPilot.Server.Entities;

public class UserProfileEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarBucket { get; set; }
    public string? AvatarKey { get; set; }
    public string? AvatarUrl { get; set; }

    public List<VehicleEntity> Vehicles { get; set; } = [];
}

public class VehicleEntity
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string? Image { get; set; }
    public int Mileage { get; set; }
    public string? LicensePlate { get; set; }
    public string Vin { get; set; } = string.Empty;
    public decimal? EstimatedValue { get; set; }

    public string FinanceKind { get; set; } = "Owned";
    public string? FinanceLender { get; set; }
    public string? FinanceStartDate { get; set; }
    public int? FinanceTermMonths { get; set; }
    public decimal? FinanceMonthlyPayment { get; set; }
    public decimal? FinanceApr { get; set; }
    public decimal? FinanceAmountFinanced { get; set; }
    public decimal? FinanceDownPayment { get; set; }
    public decimal? FinancePayoffAmount { get; set; }
    public decimal? FinanceResidualValue { get; set; }
    public int? FinanceAnnualMileageAllowance { get; set; }

    public string? InsuranceInsurer { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? InsuranceCoverageType { get; set; }
    public decimal? InsuranceMonthlyPremium { get; set; }
    public decimal? InsuranceDeductible { get; set; }
    public string? InsuranceEffectiveDate { get; set; }
    public string? InsuranceRenewalDate { get; set; }
    public string? InsuranceAgentName { get; set; }
    public string? InsuranceAgentPhone { get; set; }

    public string? WarrantyProvider { get; set; }
    public string? WarrantyPlanName { get; set; }
    public string? WarrantyContractNumber { get; set; }
    public string? WarrantyCoverageLevel { get; set; }
    public string? WarrantyStartDate { get; set; }
    public int? WarrantyStartMileage { get; set; }
    public string? WarrantyExpirationDate { get; set; }
    public int? WarrantyExpirationMileage { get; set; }
    public decimal? WarrantyDeductible { get; set; }
    public decimal? WarrantyPricePaid { get; set; }
    public bool? WarrantyTransferable { get; set; }
    public string? WarrantyNotes { get; set; }

    public UserProfileEntity User { get; set; } = null!;
    public List<VehicleDocumentEntity> Documents { get; set; } = [];
    public List<MaintenanceRecordEntity> MaintenanceRecords { get; set; } = [];
    public List<ConversationEntity> Conversations { get; set; } = [];
}

public class VehicleDocumentEntity
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string VehicleId { get; set; } = string.Empty;
    public string? MaintenanceRecordId { get; set; }

    /// <summary>Finance, Insurance, Warranty, or Maintenance.</summary>
    public string Section { get; set; } = "Finance";
    public string Name { get; set; } = string.Empty;
    public string Kind { get; set; } = "pdf";
    public string UploadedAt { get; set; } = string.Empty;
    public string? ContentType { get; set; }
    public long? SizeBytes { get; set; }
    public string? StorageBucket { get; set; }
    public string? StorageKey { get; set; }
    public string? Url { get; set; }

    public VehicleEntity Vehicle { get; set; } = null!;
    public MaintenanceRecordEntity? MaintenanceRecord { get; set; }
    public List<DocumentChunkEntity> Chunks { get; set; } = [];
}

public class MaintenanceRecordEntity
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string VehicleId { get; set; } = string.Empty;
    public string Type { get; set; } = "Maintenance";
    public string? Description { get; set; }
    public string? Date { get; set; }
    public decimal? Cost { get; set; }
    public int? Mileage { get; set; }
    public string? Shop { get; set; }

    public VehicleEntity Vehicle { get; set; } = null!;
    public List<VehicleDocumentEntity> Documents { get; set; } = [];
}

public class ConversationEntity
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string VehicleId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? SharedWith { get; set; }
    public string Date { get; set; } = string.Empty;
    public string RelatedRecordIdsJson { get; set; } = "[]";
    public string MessagesJson { get; set; } = "[]";

    public VehicleEntity Vehicle { get; set; } = null!;
}

public class DocumentChunkEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string DocumentId { get; set; } = string.Empty;
    public int Ordinal { get; set; }
    public string Content { get; set; } = string.Empty;
    public Vector Embedding { get; set; } = new(new float[EmbeddingConstants.Dimensions]);

    public VehicleDocumentEntity Document { get; set; } = null!;
}

public static class EmbeddingConstants
{
    public const int Dimensions = 384;
}
