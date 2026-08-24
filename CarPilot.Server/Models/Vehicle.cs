namespace CarPilot.Server.Models;

/// <summary>
/// Dates are kept as ISO-8601 strings ("2026-07-12") so they round-trip to the
/// client exactly as entered, without a timezone being inferred along the way.
/// </summary>
public class VehicleDocument
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>"pdf", "image" or "doc".</summary>
    public string Kind { get; set; } = "pdf";
    public string UploadedAt { get; set; } = string.Empty;
    public string? Url { get; set; }
}

public class MaintenanceRecord
{
    public string Id { get; set; } = string.Empty;
    public string VehicleId { get; set; } = string.Empty;

    /// <summary>"Repair", "Maintenance" or "Product".</summary>
    public string Type { get; set; } = "Maintenance";
    public string? Description { get; set; }
    public string? Date { get; set; }
    public decimal? Cost { get; set; }
    public int? Mileage { get; set; }
    public string? Shop { get; set; }
    public List<VehicleDocument> Documents { get; set; } = [];
}

public class FinanceInfo
{
    /// <summary>"Financing", "Leasing" or "Owned".</summary>
    public string Kind { get; set; } = "Owned";
    public string? Lender { get; set; }
    public string? StartDate { get; set; }
    public int? TermMonths { get; set; }
    public decimal? MonthlyPayment { get; set; }
    public decimal? Apr { get; set; }

    /// <summary>Principal for a loan, or capitalized cost for a lease.</summary>
    public decimal? AmountFinanced { get; set; }
    public decimal? DownPayment { get; set; }
    public decimal? PayoffAmount { get; set; }
    public decimal? ResidualValue { get; set; }
    public int? AnnualMileageAllowance { get; set; }
    public List<VehicleDocument> Documents { get; set; } = [];
}

/// <summary>A purchased extended warranty or vehicle service contract.</summary>
public class WarrantyInfo
{
    public string? Provider { get; set; }
    public string? PlanName { get; set; }
    public string? ContractNumber { get; set; }

    /// <summary>"Powertrain", "Bumper-to-bumper", "Exclusionary", "Wrap", "Component" or "Other".</summary>
    public string? CoverageLevel { get; set; }
    public string? StartDate { get; set; }

    /// <summary>Odometer reading when coverage began, used to measure mileage remaining.</summary>
    public int? StartMileage { get; set; }
    public string? ExpirationDate { get; set; }
    public int? ExpirationMileage { get; set; }
    public decimal? Deductible { get; set; }
    public decimal? PricePaid { get; set; }
    public bool? Transferable { get; set; }
    public string? Notes { get; set; }
    public List<VehicleDocument> Documents { get; set; } = [];
}

public class InsuranceInfo
{
    public string? Insurer { get; set; }
    public string? PolicyNumber { get; set; }
    public string? CoverageType { get; set; }
    public decimal? MonthlyPremium { get; set; }
    public decimal? Deductible { get; set; }
    public string? EffectiveDate { get; set; }
    public string? RenewalDate { get; set; }
    public string? AgentName { get; set; }
    public string? AgentPhone { get; set; }
    public List<VehicleDocument> Documents { get; set; } = [];
}

public class OwnedVehicle
{
    public string Id { get; set; } = string.Empty;
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
    public FinanceInfo Finance { get; set; } = new();
    public InsuranceInfo Insurance { get; set; } = new();
    public WarrantyInfo Warranty { get; set; } = new();
}

public class UserProfile
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}
