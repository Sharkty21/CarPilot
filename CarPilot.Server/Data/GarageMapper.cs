using System.Text.Json;

using CarPilot.Server.Entities;
using CarPilot.Server.Models;

namespace CarPilot.Server.Data;

internal static class GarageMapper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static UserProfile ToModel(UserProfileEntity entity) => new()
    {
        Name = entity.Name,
        Email = entity.Email,
        AvatarUrl = entity.AvatarUrl,
    };

    public static OwnedVehicle ToModel(VehicleEntity entity)
    {
        var docs = entity.Documents ?? [];
        return new OwnedVehicle
        {
            Id = entity.Id,
            Nickname = entity.Nickname,
            Year = entity.Year,
            Make = entity.Make,
            Model = entity.Model,
            Trim = entity.Trim,
            Image = entity.Image,
            Mileage = entity.Mileage,
            LicensePlate = entity.LicensePlate,
            Vin = entity.Vin,
            EstimatedValue = entity.EstimatedValue,
            Finance = new FinanceInfo
            {
                Kind = entity.FinanceKind,
                Lender = entity.FinanceLender,
                StartDate = entity.FinanceStartDate,
                TermMonths = entity.FinanceTermMonths,
                MonthlyPayment = entity.FinanceMonthlyPayment,
                Apr = entity.FinanceApr,
                AmountFinanced = entity.FinanceAmountFinanced,
                DownPayment = entity.FinanceDownPayment,
                PayoffAmount = entity.FinancePayoffAmount,
                ResidualValue = entity.FinanceResidualValue,
                AnnualMileageAllowance = entity.FinanceAnnualMileageAllowance,
                Documents = docs.Where(d => d.Section == "Finance" && d.MaintenanceRecordId is null)
                    .Select(ToDocumentModel).ToList(),
            },
            Insurance = new InsuranceInfo
            {
                Insurer = entity.InsuranceInsurer,
                PolicyNumber = entity.InsurancePolicyNumber,
                CoverageType = entity.InsuranceCoverageType,
                MonthlyPremium = entity.InsuranceMonthlyPremium,
                Deductible = entity.InsuranceDeductible,
                EffectiveDate = entity.InsuranceEffectiveDate,
                RenewalDate = entity.InsuranceRenewalDate,
                AgentName = entity.InsuranceAgentName,
                AgentPhone = entity.InsuranceAgentPhone,
                Documents = docs.Where(d => d.Section == "Insurance" && d.MaintenanceRecordId is null)
                    .Select(ToDocumentModel).ToList(),
            },
            Warranty = new WarrantyInfo
            {
                Provider = entity.WarrantyProvider,
                PlanName = entity.WarrantyPlanName,
                ContractNumber = entity.WarrantyContractNumber,
                CoverageLevel = entity.WarrantyCoverageLevel,
                StartDate = entity.WarrantyStartDate,
                StartMileage = entity.WarrantyStartMileage,
                ExpirationDate = entity.WarrantyExpirationDate,
                ExpirationMileage = entity.WarrantyExpirationMileage,
                Deductible = entity.WarrantyDeductible,
                PricePaid = entity.WarrantyPricePaid,
                Transferable = entity.WarrantyTransferable,
                Notes = entity.WarrantyNotes,
                Documents = docs.Where(d => d.Section == "Warranty" && d.MaintenanceRecordId is null)
                    .Select(ToDocumentModel).ToList(),
            },
        };
    }

    public static VehicleDocument ToDocumentModel(VehicleDocumentEntity entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        Kind = entity.Kind,
        UploadedAt = entity.UploadedAt,
        Url = entity.Url,
    };

    public static MaintenanceRecord ToModel(MaintenanceRecordEntity entity) => new()
    {
        Id = entity.Id,
        VehicleId = entity.VehicleId,
        Type = entity.Type,
        Description = entity.Description,
        Date = entity.Date,
        Cost = entity.Cost,
        Mileage = entity.Mileage,
        Shop = entity.Shop,
        Documents = (entity.Documents ?? []).Select(ToDocumentModel).ToList(),
    };

    public static Conversation ToModel(ConversationEntity entity) => new()
    {
        Id = entity.Id,
        VehicleId = entity.VehicleId,
        Summary = entity.Summary,
        SharedWith = entity.SharedWith,
        Date = entity.Date,
        RelatedRecordIds = JsonSerializer.Deserialize<List<string>>(entity.RelatedRecordIdsJson, JsonOptions) ?? [],
        Messages = JsonSerializer.Deserialize<List<ChatMessage>>(entity.MessagesJson, JsonOptions) ?? [],
    };

    public static void ApplyVehicle(VehicleEntity entity, OwnedVehicle model, Guid userId)
    {
        entity.Id = model.Id;
        entity.UserId = userId;
        entity.Nickname = model.Nickname;
        entity.Year = model.Year;
        entity.Make = model.Make;
        entity.Model = model.Model;
        entity.Trim = model.Trim;
        entity.Image = model.Image;
        entity.Mileage = model.Mileage;
        entity.LicensePlate = model.LicensePlate;
        entity.Vin = model.Vin;
        entity.EstimatedValue = model.EstimatedValue;

        entity.FinanceKind = model.Finance.Kind;
        entity.FinanceLender = model.Finance.Lender;
        entity.FinanceStartDate = model.Finance.StartDate;
        entity.FinanceTermMonths = model.Finance.TermMonths;
        entity.FinanceMonthlyPayment = model.Finance.MonthlyPayment;
        entity.FinanceApr = model.Finance.Apr;
        entity.FinanceAmountFinanced = model.Finance.AmountFinanced;
        entity.FinanceDownPayment = model.Finance.DownPayment;
        entity.FinancePayoffAmount = model.Finance.PayoffAmount;
        entity.FinanceResidualValue = model.Finance.ResidualValue;
        entity.FinanceAnnualMileageAllowance = model.Finance.AnnualMileageAllowance;

        entity.InsuranceInsurer = model.Insurance.Insurer;
        entity.InsurancePolicyNumber = model.Insurance.PolicyNumber;
        entity.InsuranceCoverageType = model.Insurance.CoverageType;
        entity.InsuranceMonthlyPremium = model.Insurance.MonthlyPremium;
        entity.InsuranceDeductible = model.Insurance.Deductible;
        entity.InsuranceEffectiveDate = model.Insurance.EffectiveDate;
        entity.InsuranceRenewalDate = model.Insurance.RenewalDate;
        entity.InsuranceAgentName = model.Insurance.AgentName;
        entity.InsuranceAgentPhone = model.Insurance.AgentPhone;

        entity.WarrantyProvider = model.Warranty.Provider;
        entity.WarrantyPlanName = model.Warranty.PlanName;
        entity.WarrantyContractNumber = model.Warranty.ContractNumber;
        entity.WarrantyCoverageLevel = model.Warranty.CoverageLevel;
        entity.WarrantyStartDate = model.Warranty.StartDate;
        entity.WarrantyStartMileage = model.Warranty.StartMileage;
        entity.WarrantyExpirationDate = model.Warranty.ExpirationDate;
        entity.WarrantyExpirationMileage = model.Warranty.ExpirationMileage;
        entity.WarrantyDeductible = model.Warranty.Deductible;
        entity.WarrantyPricePaid = model.Warranty.PricePaid;
        entity.WarrantyTransferable = model.Warranty.Transferable;
        entity.WarrantyNotes = model.Warranty.Notes;
    }

    public static VehicleDocumentEntity ToDocumentEntity(
        VehicleDocument model,
        Guid userId,
        string vehicleId,
        string section,
        string? maintenanceRecordId = null) =>
        new()
        {
            Id = model.Id,
            UserId = userId,
            VehicleId = vehicleId,
            MaintenanceRecordId = maintenanceRecordId,
            Section = section,
            Name = model.Name,
            Kind = model.Kind,
            UploadedAt = model.UploadedAt,
            Url = model.Url,
        };

    public static void ApplyMaintenance(MaintenanceRecordEntity entity, MaintenanceRecord model, Guid userId)
    {
        entity.Id = model.Id;
        entity.UserId = userId;
        entity.VehicleId = model.VehicleId;
        entity.Type = model.Type;
        entity.Description = model.Description;
        entity.Date = model.Date;
        entity.Cost = model.Cost;
        entity.Mileage = model.Mileage;
        entity.Shop = model.Shop;
    }

    public static void ApplyConversation(ConversationEntity entity, Conversation model, Guid userId)
    {
        entity.Id = model.Id;
        entity.UserId = userId;
        entity.VehicleId = model.VehicleId;
        entity.Summary = model.Summary;
        entity.SharedWith = model.SharedWith;
        entity.Date = model.Date;
        entity.RelatedRecordIdsJson = JsonSerializer.Serialize(model.RelatedRecordIds, JsonOptions);
        entity.MessagesJson = JsonSerializer.Serialize(model.Messages, JsonOptions);
    }
}
