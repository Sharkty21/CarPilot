using System.ComponentModel.DataAnnotations;

using CarPilot.Server.Models;

namespace CarPilot.Server.Contracts;

/// <summary>
/// The section edit sheets always submit their whole form, so the section
/// requests below replace the stored values outright. Documents are omitted
/// because they are managed through their own endpoints.
/// </summary>
public class CreateVehicleRequest
{
    [Required]
    public string Nickname { get; set; } = string.Empty;
    public int Year { get; set; }

    [Required]
    public string Make { get; set; } = string.Empty;

    [Required]
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string? Image { get; set; }
    public int Mileage { get; set; }
    public string? LicensePlate { get; set; }
    public string Vin { get; set; } = string.Empty;
    public decimal? EstimatedValue { get; set; }
}

/// <summary>The identifying details shown in the vehicle hero, editable as a group.</summary>
public class VehicleDetailsRequest
{
    [Required]
    public string Nickname { get; set; } = string.Empty;
    public int Year { get; set; }

    [Required]
    public string Make { get; set; } = string.Empty;

    [Required]
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string? Image { get; set; }
    public int Mileage { get; set; }
    public string? LicensePlate { get; set; }
    public string Vin { get; set; } = string.Empty;
    public decimal? EstimatedValue { get; set; }
}

public class FinanceRequest
{
    public string Kind { get; set; } = "Owned";
    public string? Lender { get; set; }
    public string? StartDate { get; set; }
    public int? TermMonths { get; set; }
    public decimal? MonthlyPayment { get; set; }
    public decimal? Apr { get; set; }
    public decimal? AmountFinanced { get; set; }
    public decimal? DownPayment { get; set; }
    public decimal? PayoffAmount { get; set; }
    public decimal? ResidualValue { get; set; }
    public int? AnnualMileageAllowance { get; set; }
}

public class InsuranceRequest
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
}

public class WarrantyRequest
{
    public string? Provider { get; set; }
    public string? PlanName { get; set; }
    public string? ContractNumber { get; set; }
    public string? CoverageLevel { get; set; }
    public string? StartDate { get; set; }
    public int? StartMileage { get; set; }
    public string? ExpirationDate { get; set; }
    public int? ExpirationMileage { get; set; }
    public decimal? Deductible { get; set; }
    public decimal? PricePaid { get; set; }
    public bool? Transferable { get; set; }
    public string? Notes { get; set; }
}

public class AddDocumentsRequest
{
    public List<VehicleDocument> Documents { get; set; } = [];
}

/// <summary>A question for the assistant. Files are sent separately as multipart form data.</summary>
public class AskAssistantRequest
{
    public string Question { get; set; } = string.Empty;
    public List<string> AttachmentNames { get; set; } = [];
    /// <summary>LangGraph thread id — keeps multi-turn tool context in the AI checkpointer.</summary>
    public string? ThreadId { get; set; }
}

public class AssistantAnswer
{
    public string Content { get; set; } = string.Empty;
    public List<ChatCitation> Citations { get; set; } = [];
}

/// <summary>One SSE payload from carpilot-ai, proxied to the browser.</summary>
public class AssistantStreamEvent
{
    public string Type { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string? Name { get; set; }
    public string? Status { get; set; }
    public ChatCitation? Citation { get; set; }
}
