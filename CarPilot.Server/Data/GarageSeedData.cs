using CarPilot.Server.Models;

namespace CarPilot.Server.Data;

/// <summary>
/// Stands in for a database until one exists. Every request reads through the
/// repository, so swapping this for real storage does not touch the API surface.
/// </summary>
internal static class GarageSeedData
{
    private static VehicleDocument Doc(string id, string name, string kind, string uploadedAt) =>
        new() { Id = id, Name = name, Kind = kind, UploadedAt = uploadedAt };

    public static UserProfile User() => new()
    {
        Name = "Rafael Davis",
        Email = "rafael.davis@example.com",
        AvatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=faces",
    };

    public static List<OwnedVehicle> Vehicles() =>
    [
        new()
        {
            Id = "veh-1",
            Nickname = "Daily Driver",
            Year = 2021,
            Make = "Toyota",
            Model = "RAV4",
            Trim = "XLE Premium AWD",
            Image = "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&h=800&fit=crop",
            Mileage = 48210,
            LicensePlate = "8JVK294",
            Vin = "JTMRWRFV8LD512873",
            EstimatedValue = 27400m,
            Finance = new FinanceInfo
            {
                Kind = "Financing",
                Lender = "Summit Credit Union",
                StartDate = "2021-04-15",
                TermMonths = 60,
                MonthlyPayment = 468.32m,
                Apr = 3.24m,
                AmountFinanced = 26000m,
                DownPayment = 5000m,
                PayoffAmount = 9840.55m,
                Documents =
                [
                    Doc("fin-doc-1", "Retail-Installment-Contract.pdf", "pdf", "2021-04-15"),
                    Doc("fin-doc-2", "Payment-History-2025.pdf", "pdf", "2026-01-08"),
                    Doc("fin-doc-3", "Autopay-Confirmation.pdf", "pdf", "2025-06-02"),
                ],
            },
            Insurance = new InsuranceInfo
            {
                Insurer = "Bluepoint Mutual",
                PolicyNumber = "BPM-4471-88231",
                CoverageType = "Full coverage",
                MonthlyPremium = 142.50m,
                Deductible = 500m,
                EffectiveDate = "2026-01-01",
                RenewalDate = "2026-12-31",
                AgentName = "Dana Whitfield",
                AgentPhone = "(555) 214-8890",
                Documents =
                [
                    Doc("ins-doc-1", "Policy-Declarations-2026.pdf", "pdf", "2026-01-02"),
                    Doc("ins-doc-2", "Insurance-ID-Card.pdf", "pdf", "2026-01-02"),
                    Doc("ins-doc-3", "Windshield-Claim-Photos.jpg", "image", "2025-09-19"),
                ],
            },
            Warranty = new WarrantyInfo
            {
                Provider = "Endurance Vehicle Protection",
                PlanName = "Supreme Exclusionary",
                ContractNumber = "EVP-2214-77390",
                CoverageLevel = "Exclusionary",
                StartDate = "2024-05-01",
                StartMileage = 32400,
                ExpirationDate = "2029-05-01",
                ExpirationMileage = 100000,
                Deductible = 100m,
                PricePaid = 2895m,
                Transferable = true,
                Notes = "Covers everything except listed exclusions. Wear items and routine maintenance are not covered.",
                Documents =
                [
                    Doc("war-doc-1", "Service-Contract-EVP-2214.pdf", "pdf", "2024-05-01"),
                    Doc("war-doc-2", "Covered-Components-Schedule.pdf", "pdf", "2024-05-01"),
                    Doc("war-doc-3", "Claim-Approval-Infotainment.pdf", "pdf", "2026-06-29"),
                ],
            },
        },
        new()
        {
            Id = "veh-2",
            Nickname = "Weekend Car",
            Year = 2019,
            Make = "Ford",
            Model = "Mustang GT",
            Trim = "Premium Fastback",
            Image = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&h=800&fit=crop",
            Mileage = 21470,
            LicensePlate = "PONY19",
            Vin = "1FA6P8CF7K5153902",
            EstimatedValue = 31200m,
            Finance = new FinanceInfo
            {
                Kind = "Owned",
                Documents =
                [
                    Doc("fin-doc-4", "Title-Clear.pdf", "pdf", "2023-08-11"),
                    Doc("fin-doc-5", "Bill-of-Sale.pdf", "pdf", "2019-07-30"),
                ],
            },
            Insurance = new InsuranceInfo
            {
                Insurer = "Crestline Auto",
                PolicyNumber = "CL-9982-01",
                CoverageType = "Full coverage + agreed value",
                MonthlyPremium = 188.00m,
                Deductible = 1000m,
                EffectiveDate = "2025-11-15",
                RenewalDate = "2026-11-14",
                AgentName = "Marcus Reyes",
                AgentPhone = "(555) 903-1122",
                Documents = [Doc("ins-doc-4", "Agreed-Value-Endorsement.pdf", "pdf", "2025-11-15")],
            },
            Warranty = new WarrantyInfo
            {
                Provider = "Apex Performance",
                PlanName = "Tire & Wheel Protection",
                CoverageLevel = "Component",
                StartDate = "2026-04-09",
                ExpirationDate = "2029-04-09",
                Deductible = 0m,
                PricePaid = 640m,
                Transferable = false,
                Notes = "Road hazard coverage on the Pilot Sport 4S set only.",
                Documents = [Doc("war-doc-4", "Tire-Wheel-Certificate.pdf", "pdf", "2026-04-09")],
            },
        },
        new()
        {
            Id = "veh-3",
            Nickname = "Work Truck",
            Year = 2023,
            Make = "Chevrolet",
            Model = "Silverado 1500",
            Trim = "LT Trail Boss",
            Image = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&h=800&fit=crop",
            Mileage = 33905,
            LicensePlate = "TRL8842",
            Vin = "3GCUDGED4PG132776",
            EstimatedValue = 44800m,
            Finance = new FinanceInfo
            {
                Kind = "Leasing",
                Lender = "GM Financial",
                StartDate = "2023-09-01",
                TermMonths = 36,
                MonthlyPayment = 612.00m,
                AmountFinanced = 52400m,
                DownPayment = 3500m,
                ResidualValue = 31440m,
                AnnualMileageAllowance = 15000,
                Documents =
                [
                    Doc("fin-doc-6", "Lease-Agreement.pdf", "pdf", "2023-09-01"),
                    Doc("fin-doc-7", "Mileage-Statement-Q2.pdf", "pdf", "2026-07-05"),
                ],
            },
            Insurance = new InsuranceInfo
            {
                Insurer = "Bluepoint Mutual",
                PolicyNumber = "BPM-4471-88232",
                CoverageType = "Full coverage (lease required)",
                MonthlyPremium = 164.75m,
                Deductible = 500m,
                EffectiveDate = "2026-01-01",
                RenewalDate = "2026-12-31",
                AgentName = "Dana Whitfield",
                AgentPhone = "(555) 214-8890",
                Documents = [Doc("ins-doc-5", "Lessor-Loss-Payee-Letter.pdf", "pdf", "2026-01-04")],
            },
            Warranty = new WarrantyInfo
            {
                Provider = "GM Protection Plan",
                PlanName = "Platinum",
                ContractNumber = "GMPP-88104-2",
                CoverageLevel = "Exclusionary",
                StartDate = "2023-09-01",
                StartMileage = 12,
                ExpirationDate = "2028-09-01",
                ExpirationMileage = 75000,
                Deductible = 0m,
                PricePaid = 1840m,
                Transferable = true,
                Documents = [Doc("war-doc-5", "GMPP-Platinum-Contract.pdf", "pdf", "2023-09-01")],
            },
        },
        new()
        {
            Id = "veh-4",
            Nickname = "Hand-me-down",
            Year = 2012,
            Make = "Honda",
            Model = "Civic",
            Trim = "LX Sedan",
            Mileage = 168430,
            Vin = "2HGFB2F59CH301882",
            Finance = new FinanceInfo { Kind = "Owned" },
            Insurance = new InsuranceInfo
            {
                Insurer = "Crestline Auto",
                CoverageType = "Liability only",
                MonthlyPremium = 61.40m,
            },
            Warranty = new WarrantyInfo(),
        },
    ];

    public static List<MaintenanceRecord> MaintenanceRecords() =>
    [
        new()
        {
            Id = "rec-1",
            VehicleId = "veh-1",
            Type = "Maintenance",
            Description = "Full synthetic oil change and tire rotation",
            Date = "2026-07-12",
            Cost = 89.99m,
            Mileage = 46800,
            Shop = "Northside Toyota Service",
            Documents = [Doc("d1", "Invoice-71204.pdf", "pdf", "2026-07-12")],
        },
        new()
        {
            Id = "rec-2",
            VehicleId = "veh-1",
            Type = "Repair",
            Description = "Replaced front brake pads and resurfaced rotors",
            Date = "2026-05-02",
            Cost = 612.40m,
            Mileage = 44120,
            Shop = "Vasquez Auto Repair",
            Documents =
            [
                Doc("d2", "Brake-Estimate.pdf", "pdf", "2026-04-28"),
                Doc("d3", "Brake-Invoice.pdf", "pdf", "2026-05-02"),
            ],
        },
        new()
        {
            Id = "rec-3",
            VehicleId = "veh-1",
            Type = "Product",
            Description = "All-weather floor liners",
            Date = "2026-03-18",
            Cost = 149.00m,
            Documents = [Doc("d4", "Order-Receipt.pdf", "pdf", "2026-03-18")],
        },
        new()
        {
            Id = "rec-4",
            VehicleId = "veh-1",
            Type = "Maintenance",
            Description = "Cabin and engine air filter replacement",
            Date = "2026-02-01",
            Mileage = 41500,
            Shop = "Northside Toyota Service",
        },
        new()
        {
            Id = "rec-5",
            VehicleId = "veh-1",
            Type = "Repair",
            Description = "Windshield chip repair covered by insurance",
            Date = "2025-09-19",
            Cost = 0m,
            Documents = [Doc("d5", "Claim-Summary.pdf", "pdf", "2025-09-20")],
        },
        new()
        {
            Id = "rec-6",
            VehicleId = "veh-1",
            Type = "Maintenance",
            Description = "Coolant flush",
            Cost = 154.25m,
            Mileage = 39200,
            Shop = "Vasquez Auto Repair",
        },
        new()
        {
            Id = "rec-7",
            VehicleId = "veh-1",
            Type = "Product",
            Description = "Roof cross bars",
            Date = "2025-06-04",
            Cost = 279.95m,
            Documents = [Doc("d6", "Crossbar-Receipt.pdf", "pdf", "2025-06-04")],
        },
        new()
        {
            Id = "rec-8",
            VehicleId = "veh-2",
            Type = "Maintenance",
            Description = "Track day prep: oil, brake fluid, alignment check",
            Date = "2026-06-21",
            Cost = 384.00m,
            Mileage = 20880,
            Shop = "Apex Performance",
            Documents = [Doc("d7", "Apex-Invoice.pdf", "pdf", "2026-06-21")],
        },
        new()
        {
            Id = "rec-9",
            VehicleId = "veh-2",
            Type = "Product",
            Description = "Michelin Pilot Sport 4S tire set",
            Date = "2026-04-09",
            Cost = 1420.60m,
            Documents = [Doc("d8", "Tire-Invoice.pdf", "pdf", "2026-04-09")],
        },
        new()
        {
            Id = "rec-10",
            VehicleId = "veh-3",
            Type = "Maintenance",
            Description = "Scheduled 30,000 mile service",
            Date = "2026-05-30",
            Cost = 429.50m,
            Mileage = 30140,
            Shop = "Riverbend Chevrolet",
            Documents = [Doc("d9", "Service-Report.pdf", "pdf", "2026-05-30")],
        },
        new()
        {
            Id = "rec-11",
            VehicleId = "veh-3",
            Type = "Repair",
            Description = "Tailgate actuator replacement under warranty",
            Date = "2026-02-14",
            Cost = 0m,
            Mileage = 27600,
            Shop = "Riverbend Chevrolet",
        },
        new()
        {
            Id = "rec-12",
            VehicleId = "veh-4",
            Type = "Maintenance",
            Description = "Timing belt and water pump",
            Date = "2025-10-02",
            Cost = 940.00m,
            Mileage = 160200,
        },
    ];

    public static List<Conversation> Conversations() =>
    [
        new()
        {
            Id = "conv-1",
            VehicleId = "veh-1",
            Summary = "Brake noise diagnosis and whether pads are still under warranty",
            SharedWith = null,
            Date = "2026-08-14",
            RelatedRecordIds = ["rec-2"],
            Messages =
            [
                new()
                {
                    Id = "m1",
                    Role = "user",
                    Content = "I'm hearing a light squeal from the front when I brake at low speed. Didn't I just get the brakes done?",
                    CreatedAt = "2026-08-14T14:02:00Z",
                },
                new()
                {
                    Id = "m2",
                    Role = "assistant",
                    Content = "Yes — your front pads and rotors were serviced about three months ago, so this is worth following up on.\n\nA light squeal at low speed shortly after a pad replacement is usually one of two things: the pads haven't fully bedded in, or the anti-rattle shims were left off during reassembly. Since the invoice lists resurfaced rotors rather than new ones, a slightly uneven rotor surface is also possible.\n\nMost pad sets from that shop carry a 12-month workmanship warranty, so a comeback inspection should not cost you anything.",
                    CreatedAt = "2026-08-14T14:02:12Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c1",
                            Kind = "record",
                            Label = "Replaced front brake pads and resurfaced rotors",
                            Detail = "May 2, 2026 · $612.40",
                            RecordId = "rec-2",
                        },
                        new()
                        {
                            Id = "c2",
                            Kind = "document",
                            Label = "Brake-Invoice.pdf",
                            Detail = "Page 2 — parts and labor warranty terms",
                        },
                    ],
                },
                new()
                {
                    Id = "m3",
                    Role = "user",
                    Content = "What should I ask them for when I call?",
                    CreatedAt = "2026-08-14T14:04:30Z",
                },
                new()
                {
                    Id = "m4",
                    Role = "assistant",
                    Content = "Ask for a no-charge brake inspection under the workmanship warranty on invoice #71204, and specifically request that they verify the anti-rattle clips and shims were installed and check rotor runout with a dial indicator. If runout is out of spec, new rotors rather than another resurface is the right fix at this mileage.",
                    CreatedAt = "2026-08-14T14:04:41Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c3",
                            Kind = "web",
                            Label = "Toyota RAV4 front rotor runout spec (0.05 mm max)",
                            Detail = "Manufacturer service bulletin",
                            Url = "https://example.com/rav4-rotor-spec",
                        },
                    ],
                },
            ],
        },
        new()
        {
            Id = "conv-2",
            VehicleId = "veh-1",
            Summary = "Mechanic asked for service history before the 50k inspection",
            SharedWith = "Vasquez Auto Repair",
            Date = "2026-08-03",
            RelatedRecordIds = ["rec-1", "rec-4"],
            Messages =
            [
                new()
                {
                    Id = "m5",
                    Role = "user",
                    Content = "This is Luis at Vasquez. When was the last oil change and what filters have been done recently?",
                    CreatedAt = "2026-08-03T09:15:00Z",
                },
                new()
                {
                    Id = "m6",
                    Role = "assistant",
                    Content = "Last oil change was July 12, 2026 at 46,800 miles — full synthetic, done with a tire rotation at Northside Toyota Service.\n\nCabin and engine air filters were both replaced February 1, 2026 at 41,500 miles. Coolant was flushed at 39,200 miles, though that record has no date attached.\n\nThe vehicle is at 48,210 miles now, so it is roughly 1,400 miles into the current oil interval.",
                    CreatedAt = "2026-08-03T09:15:09Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c4",
                            Kind = "record",
                            Label = "Full synthetic oil change and tire rotation",
                            Detail = "July 12, 2026 · 46,800 mi",
                            RecordId = "rec-1",
                        },
                        new()
                        {
                            Id = "c5",
                            Kind = "record",
                            Label = "Cabin and engine air filter replacement",
                            Detail = "February 1, 2026 · 41,500 mi",
                            RecordId = "rec-4",
                        },
                    ],
                },
            ],
        },
        new()
        {
            Id = "conv-3",
            VehicleId = "veh-1",
            Summary = "Whether the extended warranty covers the infotainment unit",
            SharedWith = null,
            Date = "2026-06-27",
            RelatedRecordIds = [],
            Messages =
            [
                new()
                {
                    Id = "m7",
                    Role = "user",
                    Content = "Does my warranty cover the touchscreen freezing?",
                    CreatedAt = "2026-06-27T18:41:00Z",
                },
                new()
                {
                    Id = "m8",
                    Role = "assistant",
                    Content = "Most likely yes, through your extended coverage rather than the factory warranty.\n\nToyota's basic new-vehicle warranty covered the head unit for 3 years or 36,000 miles, and your RAV4 is past both. However, you purchased the Endurance Supreme Exclusionary contract in May 2024, which runs to 100,000 miles. Exclusionary contracts cover anything not specifically excluded, and the covered-components schedule does not list the infotainment display among the exclusions.\n\nYou would owe the $100 deductible. Call Endurance for pre-authorization before the shop starts work — claims opened after the repair are frequently denied.",
                    CreatedAt = "2026-06-27T18:41:11Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c6",
                            Kind = "document",
                            Label = "Covered-Components-Schedule.pdf",
                            Detail = "Exclusions list — infotainment not excluded",
                        },
                        new()
                        {
                            Id = "c11",
                            Kind = "document",
                            Label = "Service-Contract-EVP-2214.pdf",
                            Detail = "$100 deductible, pre-authorization required",
                        },
                        new()
                        {
                            Id = "c12",
                            Kind = "web",
                            Label = "Toyota new-vehicle limited warranty: 36 mo / 36,000 mi basic",
                            Url = "https://example.com/toyota-warranty",
                        },
                    ],
                },
            ],
        },
        new()
        {
            Id = "conv-4",
            VehicleId = "veh-2",
            Summary = "Tire pressure and alignment questions after the new tire set",
            SharedWith = "Apex Performance",
            Date = "2026-06-22",
            RelatedRecordIds = ["rec-9", "rec-8"],
            Messages =
            [
                new()
                {
                    Id = "m9",
                    Role = "user",
                    Content = "What pressures were the new Pilot Sport 4S set to?",
                    CreatedAt = "2026-06-22T11:00:00Z",
                },
                new()
                {
                    Id = "m10",
                    Role = "assistant",
                    Content = "The tire invoice does not list delivery pressures. The door jamb placard for a 2019 Mustang GT on 19-inch wheels calls for 32 psi front and 30 psi rear cold. The alignment check from the track day prep visit the following day found all four corners in spec.",
                    CreatedAt = "2026-06-22T11:00:08Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c7",
                            Kind = "record",
                            Label = "Track day prep: oil, brake fluid, alignment check",
                            Detail = "June 21, 2026 · $384.00",
                            RecordId = "rec-8",
                        },
                        new()
                        {
                            Id = "c8",
                            Kind = "document",
                            Label = "Tire-Invoice.pdf",
                            Detail = "No pressure data found",
                        },
                    ],
                },
            ],
        },
        new()
        {
            Id = "conv-5",
            VehicleId = "veh-3",
            Summary = "Lease mileage overage risk before turn-in",
            SharedWith = null,
            Date = "2026-07-08",
            RelatedRecordIds = ["rec-10"],
            Messages =
            [
                new()
                {
                    Id = "m11",
                    Role = "user",
                    Content = "Am I going to go over on miles before the lease ends?",
                    CreatedAt = "2026-07-08T16:20:00Z",
                },
                new()
                {
                    Id = "m12",
                    Role = "assistant",
                    Content = "Probably, yes. Your lease started September 1, 2023 with a 15,000 mile annual allowance, which is 45,000 miles over the 36-month term.\n\nAt 33,905 miles across roughly 34 months you are averaging about 997 miles per month, which projects to about 35,900 miles at turn-in. That puts you comfortably under the allowance — you have roughly 11,000 miles of headroom.\n\nGM Financial's excess mileage charge on this contract is $0.25 per mile, so there is no overage exposure at your current pace.",
                    CreatedAt = "2026-07-08T16:20:14Z",
                    Citations =
                    [
                        new()
                        {
                            Id = "c9",
                            Kind = "document",
                            Label = "Lease-Agreement.pdf",
                            Detail = "Section 12 — excess mileage charges",
                        },
                        new()
                        {
                            Id = "c10",
                            Kind = "document",
                            Label = "Mileage-Statement-Q2.pdf",
                            Detail = "Reported odometer 33,905",
                        },
                    ],
                },
            ],
        },
    ];
}
