using CarPilot.Server.Contracts;
using CarPilot.Server.Models;
using CarPilot.Server.Repositories;

namespace CarPilot.Server.Services;

public class GarageService(IGarageRepository repository) : IGarageService
{
    public UserProfile GetUser() => repository.GetUser();

    public IReadOnlyList<OwnedVehicle> GetVehicles() => repository.GetVehicles();

    public OwnedVehicle AddVehicle(CreateVehicleRequest request)
    {
        var vehicle = new OwnedVehicle
        {
            Id = NewId("veh"),
            Nickname = request.Nickname,
            Year = request.Year,
            Make = request.Make,
            Model = request.Model,
            Trim = request.Trim,
            Image = request.Image,
            Mileage = request.Mileage,
            LicensePlate = request.LicensePlate,
            Vin = request.Vin,
            EstimatedValue = request.EstimatedValue,
            Finance = new FinanceInfo { Kind = "Owned" },
            Insurance = new InsuranceInfo(),
            Warranty = new WarrantyInfo(),
        };

        repository.AddVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? UpdateDetails(string vehicleId, VehicleDetailsRequest request)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        vehicle.Nickname = request.Nickname;
        vehicle.Year = request.Year;
        vehicle.Make = request.Make;
        vehicle.Model = request.Model;
        vehicle.Trim = request.Trim;
        vehicle.Image = request.Image;
        vehicle.Mileage = request.Mileage;
        vehicle.LicensePlate = request.LicensePlate;
        vehicle.Vin = request.Vin;
        vehicle.EstimatedValue = request.EstimatedValue;

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? UpdateFinance(string vehicleId, FinanceRequest request)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        // Documents carry over because they are managed through their own endpoints.
        vehicle.Finance = new FinanceInfo
        {
            Kind = request.Kind,
            Lender = request.Lender,
            StartDate = request.StartDate,
            TermMonths = request.TermMonths,
            MonthlyPayment = request.MonthlyPayment,
            Apr = request.Apr,
            AmountFinanced = request.AmountFinanced,
            DownPayment = request.DownPayment,
            PayoffAmount = request.PayoffAmount,
            ResidualValue = request.ResidualValue,
            AnnualMileageAllowance = request.AnnualMileageAllowance,
            Documents = vehicle.Finance.Documents,
        };

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? UpdateInsurance(string vehicleId, InsuranceRequest request)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        vehicle.Insurance = new InsuranceInfo
        {
            Insurer = request.Insurer,
            PolicyNumber = request.PolicyNumber,
            CoverageType = request.CoverageType,
            MonthlyPremium = request.MonthlyPremium,
            Deductible = request.Deductible,
            EffectiveDate = request.EffectiveDate,
            RenewalDate = request.RenewalDate,
            AgentName = request.AgentName,
            AgentPhone = request.AgentPhone,
            Documents = vehicle.Insurance.Documents,
        };

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? UpdateWarranty(string vehicleId, WarrantyRequest request)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        vehicle.Warranty = new WarrantyInfo
        {
            Provider = request.Provider,
            PlanName = request.PlanName,
            ContractNumber = request.ContractNumber,
            CoverageLevel = request.CoverageLevel,
            StartDate = request.StartDate,
            StartMileage = request.StartMileage,
            ExpirationDate = request.ExpirationDate,
            ExpirationMileage = request.ExpirationMileage,
            Deductible = request.Deductible,
            PricePaid = request.PricePaid,
            Transferable = request.Transferable,
            Notes = request.Notes,
            Documents = vehicle.Warranty.Documents,
        };

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? AddDocuments(
        string vehicleId,
        DocumentSection section,
        IEnumerable<VehicleDocument> documents)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        var added = documents
            .Select(document => new VehicleDocument
            {
                Id = string.IsNullOrWhiteSpace(document.Id) ? NewId("doc") : document.Id,
                Name = document.Name,
                Kind = document.Kind,
                UploadedAt = document.UploadedAt,
                Url = document.Url,
            })
            .ToList();

        // Newest first, matching how the document grids read.
        DocumentsFor(vehicle, section).InsertRange(0, added);

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public OwnedVehicle? RemoveDocument(string vehicleId, DocumentSection section, string documentId)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        DocumentsFor(vehicle, section).RemoveAll(document => document.Id == documentId);

        repository.UpdateVehicle(vehicle);
        return vehicle;
    }

    public IReadOnlyList<MaintenanceRecord>? GetMaintenanceRecords(string vehicleId) =>
        repository.FindVehicle(vehicleId) is null
            ? null
            : repository.GetMaintenanceRecords(vehicleId);

    public MaintenanceRecord? SaveMaintenanceRecord(
        string vehicleId,
        string recordId,
        MaintenanceRecord record)
    {
        if (repository.FindVehicle(vehicleId) is null) return null;

        record.Id = recordId;
        record.VehicleId = vehicleId;
        repository.UpsertMaintenanceRecord(record);
        return record;
    }

    public IReadOnlyList<Conversation>? GetConversations(string vehicleId) =>
        repository.FindVehicle(vehicleId) is null
            ? null
            : repository.GetConversations(vehicleId);

    public Conversation? SaveConversation(
        string vehicleId,
        string conversationId,
        Conversation conversation)
    {
        if (repository.FindVehicle(vehicleId) is null) return null;

        conversation.Id = conversationId;
        conversation.VehicleId = vehicleId;
        repository.UpsertConversation(conversation);
        return conversation;
    }

    private static List<VehicleDocument> DocumentsFor(OwnedVehicle vehicle, DocumentSection section) =>
        section switch
        {
            DocumentSection.Finance => vehicle.Finance.Documents,
            DocumentSection.Insurance => vehicle.Insurance.Documents,
            DocumentSection.Warranty => vehicle.Warranty.Documents,
            _ => throw new ArgumentOutOfRangeException(nameof(section)),
        };

    private static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid()}";
}
