using System.Globalization;
using System.Text.RegularExpressions;

using CarPilot.Server.Contracts;
using CarPilot.Server.Models;
using CarPilot.Server.Repositories;

namespace CarPilot.Server.Services;

/// <summary>
/// Rule-based stand-in for the RAG agent. Answers are grounded in the vehicle's
/// own records and documents so the citation UI has real targets to link to.
/// </summary>
public partial class AssistantService(IGarageRepository repository) : IAssistantService
{
    private static readonly CultureInfo Culture = CultureInfo.GetCultureInfo("en-US");

    public AssistantAnswer? Ask(string vehicleId, AskAssistantRequest request)
    {
        var vehicle = repository.FindVehicle(vehicleId);
        if (vehicle is null) return null;

        var records = repository.GetMaintenanceRecords(vehicleId);
        var asked = request.Question.ToLowerInvariant();
        var vehicleName = $"{vehicle.Year} {vehicle.Make} {vehicle.Model}";

        if (request.AttachmentNames.Count > 0)
        {
            return AttachmentAnswer(request.AttachmentNames, vehicle, vehicleName);
        }

        if (OilQuestion().IsMatch(asked) && MostRecent(records, OilRecord()) is { } oilChange)
        {
            return OilAnswer(oilChange, vehicle, vehicleName);
        }

        if (BrakeQuestion().IsMatch(asked) && MostRecent(records, BrakeRecord()) is { } brakeJob)
        {
            return BrakeAnswer(brakeJob);
        }

        if (WarrantyQuestion().IsMatch(asked))
        {
            return WarrantyAnswer(vehicle, vehicleName);
        }

        if (InsuranceQuestion().IsMatch(asked))
        {
            return InsuranceAnswer(vehicle.Insurance);
        }

        if (FinanceQuestion().IsMatch(asked))
        {
            return FinanceAnswer(vehicle, vehicleName);
        }

        if (ValueQuestion().IsMatch(asked))
        {
            return ValueAnswer(vehicle, vehicleName, records.Count);
        }

        return OverviewAnswer(vehicle, vehicleName, records);
    }

    private static AssistantAnswer AttachmentAnswer(
        List<string> attachmentNames,
        OwnedVehicle vehicle,
        string vehicleName)
    {
        var first = attachmentNames[0];
        var subject = attachmentNames.Count == 1
            ? $"**{first}**"
            : $"the {attachmentNames.Count} files you attached";

        return new AssistantAnswer
        {
            Content =
                $"I read through {subject} and pulled out what looks like service information for your {vehicleName}." +
                "\n\nHere is what I extracted:\n\n- Type: Maintenance\n- Description: Service items listed on the uploaded document" +
                $"\n- Odometer: {Number(vehicle.Mileage)} mi" +
                "\n\nI have not saved anything yet. Open the maintenance section and use Add record to confirm the details, " +
                "or tell me to save it and I will create the record with these values attached to the file.",
            Citations = [.. attachmentNames.Select(name => DocumentCitation(name, "Uploaded in this conversation"))],
        };
    }

    private static AssistantAnswer OilAnswer(
        MaintenanceRecord oilChange,
        OwnedVehicle vehicle,
        string vehicleName)
    {
        var since = oilChange.Mileage.HasValue ? vehicle.Mileage - oilChange.Mileage.Value : (int?)null;
        var whenDone = Date(oilChange.Date) is { Length: > 0 } date
            ? date
            : "recorded without a date";
        var atMileage = oilChange.Mileage.HasValue ? $" at {Number(oilChange.Mileage.Value)} mi" : "";
        var howLongAgo = since.HasValue ? $", so about {Number(since.Value)} mi ago" : "";
        var headroom = since.HasValue ? Number(Math.Max(10000 - since.Value, 0)) : "several thousand";

        return new AssistantAnswer
        {
            Content =
                $"Your last oil change was {whenDone}{atMileage}." +
                $"\n\nYou are at {Number(vehicle.Mileage)} mi now{howLongAgo}. The recommended interval for full synthetic " +
                "on this platform is 10,000 miles or 12 months, whichever comes first." +
                $"\n\nBased on that, you have roughly {headroom} mi of headroom before the next change is due.",
            Citations =
            [
                RecordCitation(oilChange),
                WebCitation(
                    $"{vehicleName} maintenance schedule — 10,000 mi oil interval",
                    "Manufacturer maintenance guide"),
            ],
        };
    }

    private static AssistantAnswer BrakeAnswer(MaintenanceRecord brakeJob)
    {
        var cost = brakeJob.Cost.HasValue ? $" for {Currency(brakeJob.Cost)}" : "";
        var shop = string.IsNullOrWhiteSpace(brakeJob.Shop) ? "" : $" at {brakeJob.Shop}";

        return new AssistantAnswer
        {
            Content =
                "Brake work on this vehicle is already on file, so start there before paying for a diagnosis." +
                $"\n\n{brakeJob.Description} was done {Date(brakeJob.Date)}{cost}{shop}." +
                "\n\nMost shops back pad replacement with a 12-month workmanship warranty, so a comeback inspection should " +
                "be free. Ask them to verify the anti-rattle shims and check rotor runout with a dial indicator.",
            Citations =
            [
                RecordCitation(brakeJob),
                .. brakeJob.Documents.Select(document =>
                    DocumentCitation(document.Name, "Parts and labor warranty terms")),
            ],
        };
    }

    private static AssistantAnswer WarrantyAnswer(OwnedVehicle vehicle, string vehicleName)
    {
        var warranty = vehicle.Warranty;

        if (string.IsNullOrWhiteSpace(warranty.Provider) && string.IsNullOrWhiteSpace(warranty.ExpirationDate))
        {
            return new AssistantAnswer
            {
                Content =
                    $"There is no purchased warranty or service contract on file for this {vehicleName}, and at " +
                    $"{Number(vehicle.Mileage)} mi the factory basic coverage has almost certainly lapsed." +
                    "\n\nIf you bought an extended warranty, upload the contract in the warranty section and I can check " +
                    "the exclusions against any repair you are considering.",
                Citations =
                [
                    WebCitation($"{vehicleName} factory warranty terms", "Manufacturer warranty guide"),
                ],
            };
        }

        var plan = string.IsNullOrWhiteSpace(warranty.PlanName)
            ? "coverage"
            : $"the {warranty.PlanName} plan";
        var contract = string.IsNullOrWhiteSpace(warranty.ContractNumber) ? "" : $" ({warranty.ContractNumber})";
        var expirationMileage = warranty.ExpirationMileage.HasValue
            ? $" or {Number(warranty.ExpirationMileage.Value)} mi"
            : "";
        var remaining = warranty.ExpirationMileage.HasValue
            ? $" At {Number(vehicle.Mileage)} mi you have about " +
              $"{Number(warranty.ExpirationMileage.Value - vehicle.Mileage)} mi of coverage left."
            : "";
        var expiration = Date(warranty.ExpirationDate) is { Length: > 0 } expiresOn
            ? expiresOn
            : "an unrecorded date";
        var deductible = Currency(warranty.Deductible) is { Length: > 0 } amount ? amount : "not recorded";

        return new AssistantAnswer
        {
            Content =
                $"You have {plan} through {warranty.Provider ?? "an unlisted provider"}{contract}." +
                $"\n\nIt is {warranty.CoverageLevel?.ToLowerInvariant() ?? "unspecified"} coverage running through " +
                $"{expiration}{expirationMileage}.{remaining}" +
                $"\n\nYour deductible is {deductible} per visit. Get pre-authorization before any work starts — " +
                "claims opened after a repair are commonly denied.",
            Citations = warranty.Documents.Count > 0
                ? [.. warranty.Documents.Select(document => DocumentCitation(document.Name, "Warranty section"))]
                : [WebCitation("Vehicle service contract claim process")],
        };
    }

    private static AssistantAnswer InsuranceAnswer(InsuranceInfo insurance)
    {
        var policy = string.IsNullOrWhiteSpace(insurance.PolicyNumber) ? "" : $" under {insurance.PolicyNumber}";
        var deductible = Currency(insurance.Deductible) is { Length: > 0 } amount ? amount : "unlisted";
        var premium = Currency(insurance.MonthlyPremium) is { Length: > 0 } monthly ? monthly : "unlisted";
        var renewal = Date(insurance.RenewalDate) is { Length: > 0 } renews
            ? renews
            : "on a date I do not have";

        return new AssistantAnswer
        {
            Content =
                $"Your policy is with {insurance.Insurer ?? "an insurer I do not have on file"}{policy}." +
                $"\n\nCoverage is listed as {insurance.CoverageType ?? "unspecified"} with a {deductible} deductible " +
                $"and a {premium} monthly premium. The policy renews {renewal}." +
                "\n\nIf you are weighing a repair against a claim, the deductible is the number that matters most — " +
                "anything under it is cheaper to pay out of pocket.",
            Citations = insurance.Documents.Count > 0
                ? [.. insurance.Documents.Select(document => DocumentCitation(document.Name, "Insurance section"))]
                : [WebCitation("General auto policy deductible guidance")],
        };
    }

    private static AssistantAnswer FinanceAnswer(OwnedVehicle vehicle, string vehicleName)
    {
        var finance = vehicle.Finance;

        if (finance.Kind == "Owned")
        {
            return new AssistantAnswer
            {
                Content =
                    $"You own this {vehicleName} outright — there is no loan or lease on file, so every dollar of its " +
                    "value is equity. The title document on file confirms a clear title.",
                Citations = [.. finance.Documents.Select(document => DocumentCitation(document.Name, "Finance section"))],
            };
        }

        var term = finance.TermMonths?.ToString(Culture) ?? "?";
        var started = Date(finance.StartDate) is { Length: > 0 } startedOn
            ? startedOn
            : "on an unrecorded date";
        var payment = Currency(finance.MonthlyPayment) is { Length: > 0 } monthly
            ? monthly
            : "an unlisted payment";
        var apr = finance.Apr.HasValue ? $" and {finance.Apr.Value.ToString("0.##", Culture)}% APR" : "";
        var equity = finance.PayoffAmount.HasValue
            ? $" Your current payoff is {Currency(finance.PayoffAmount)}, which against an estimated value of " +
              $"{Currency(vehicle.EstimatedValue)} puts you roughly " +
              $"{Currency((vehicle.EstimatedValue ?? 0m) - finance.PayoffAmount.Value)} in positive equity."
            : "";

        return new AssistantAnswer
        {
            Content =
                $"This {vehicleName} is under {finance.Kind.ToLowerInvariant()} with " +
                $"{finance.Lender ?? "an unlisted lender"}." +
                $"\n\nThe {term}-month term started {started} at {payment} per month{apr}.{equity}",
            Citations = [.. finance.Documents.Select(document => DocumentCitation(document.Name, "Finance section"))],
        };
    }

    private static AssistantAnswer ValueAnswer(OwnedVehicle vehicle, string vehicleName, int recordCount) => new()
    {
        Content =
            $"Comparable {vehicleName} listings with similar mileage are trading around " +
            $"{Currency(vehicle.EstimatedValue)} in private-party condition. Your documented service history helps " +
            $"here: a complete record of {recordCount} maintenance entries typically supports the top of the range " +
            "rather than the middle.",
        Citations = [WebCitation($"{vehicleName} private-party value range", "Market listings search")],
    };

    private static AssistantAnswer OverviewAnswer(
        OwnedVehicle vehicle,
        string vehicleName,
        IReadOnlyList<MaintenanceRecord> records)
    {
        var recent = records
            .OrderByDescending(record => record.Date ?? "", StringComparer.Ordinal)
            .FirstOrDefault();
        var recordWord = records.Count == 1 ? "record" : "records";
        var mostRecent = string.IsNullOrWhiteSpace(recent?.Description)
            ? ""
            : $", the most recent being \"{recent!.Description}\"" +
              (Date(recent.Date) is { Length: > 0 } on ? $" on {on}" : "");

        return new AssistantAnswer
        {
            Content =
                $"Here is what I know about your {vehicleName} ({vehicle.Nickname})." +
                $"\n\nIt has {Number(vehicle.Mileage)} mi on the odometer and {records.Count} maintenance " +
                $"{recordWord} on file{mostRecent}." +
                "\n\nAsk me about a specific noise or symptom, whether a quoted price is fair, what service is due next, " +
                "or upload a receipt and I will pull the details out of it for you.",
            Citations = recent is null ? [] : [RecordCitation(recent)],
        };
    }

    private static MaintenanceRecord? MostRecent(IReadOnlyList<MaintenanceRecord> records, Regex match) =>
        records
            .Where(record => match.IsMatch(record.Description ?? ""))
            .OrderByDescending(record => record.Date ?? "", StringComparer.Ordinal)
            .FirstOrDefault();

    private static ChatCitation RecordCitation(MaintenanceRecord record) => new()
    {
        Id = NewId("cite"),
        Kind = "record",
        Label = record.Description ?? $"{record.Type} record",
        Detail = string.Join(" · ", new[] { Date(record.Date), Currency(record.Cost) }.Where(part => part.Length > 0)),
        RecordId = record.Id,
    };

    private static ChatCitation DocumentCitation(string name, string? detail = null) => new()
    {
        Id = NewId("cite"),
        Kind = "document",
        Label = name,
        Detail = detail,
    };

    private static ChatCitation WebCitation(string label, string? detail = null) => new()
    {
        Id = NewId("cite"),
        Kind = "web",
        Label = label,
        Detail = detail,
        Url = "https://example.com",
    };

    private static string NewId(string prefix) => $"{prefix}-{Guid.NewGuid()}";

    private static string Currency(decimal? value) =>
        value.HasValue ? value.Value.ToString("C2", Culture) : "";

    private static string Number(int value) => value.ToString("N0", Culture);

    private static string Date(string? value) =>
        DateTime.TryParse(value, Culture, DateTimeStyles.None, out var parsed)
            ? parsed.ToString("MMM d, yyyy", Culture)
            : "";

    [GeneratedRegex("oil|filter|service due|next service")]
    private static partial Regex OilQuestion();

    [GeneratedRegex("oil", RegexOptions.IgnoreCase)]
    private static partial Regex OilRecord();

    [GeneratedRegex("brake|squeal|grind|rotor|pad")]
    private static partial Regex BrakeQuestion();

    [GeneratedRegex("brake", RegexOptions.IgnoreCase)]
    private static partial Regex BrakeRecord();

    [GeneratedRegex("warranty|service contract|is it covered|covered under")]
    private static partial Regex WarrantyQuestion();

    [GeneratedRegex("insurance|policy|premium|deductible|claim")]
    private static partial Regex InsuranceQuestion();

    [GeneratedRegex("lease|finance|loan|payment|equity|payoff|owe")]
    private static partial Regex FinanceQuestion();

    [GeneratedRegex("worth|value|sell|trade")]
    private static partial Regex ValueQuestion();
}
