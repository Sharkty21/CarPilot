using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Pgvector;

#nullable disable

namespace CarPilot.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialGarage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    AvatarBucket = table.Column<string>(type: "text", nullable: true),
                    AvatarKey = table.Column<string>(type: "text", nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nickname = table.Column<string>(type: "text", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Make = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Trim = table.Column<string>(type: "text", nullable: true),
                    Image = table.Column<string>(type: "text", nullable: true),
                    Mileage = table.Column<int>(type: "integer", nullable: false),
                    LicensePlate = table.Column<string>(type: "text", nullable: true),
                    Vin = table.Column<string>(type: "text", nullable: false),
                    EstimatedValue = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceKind = table.Column<string>(type: "text", nullable: false),
                    FinanceLender = table.Column<string>(type: "text", nullable: true),
                    FinanceStartDate = table.Column<string>(type: "text", nullable: true),
                    FinanceTermMonths = table.Column<int>(type: "integer", nullable: true),
                    FinanceMonthlyPayment = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceApr = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceAmountFinanced = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceDownPayment = table.Column<decimal>(type: "numeric", nullable: true),
                    FinancePayoffAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceResidualValue = table.Column<decimal>(type: "numeric", nullable: true),
                    FinanceAnnualMileageAllowance = table.Column<int>(type: "integer", nullable: true),
                    InsuranceInsurer = table.Column<string>(type: "text", nullable: true),
                    InsurancePolicyNumber = table.Column<string>(type: "text", nullable: true),
                    InsuranceCoverageType = table.Column<string>(type: "text", nullable: true),
                    InsuranceMonthlyPremium = table.Column<decimal>(type: "numeric", nullable: true),
                    InsuranceDeductible = table.Column<decimal>(type: "numeric", nullable: true),
                    InsuranceEffectiveDate = table.Column<string>(type: "text", nullable: true),
                    InsuranceRenewalDate = table.Column<string>(type: "text", nullable: true),
                    InsuranceAgentName = table.Column<string>(type: "text", nullable: true),
                    InsuranceAgentPhone = table.Column<string>(type: "text", nullable: true),
                    WarrantyProvider = table.Column<string>(type: "text", nullable: true),
                    WarrantyPlanName = table.Column<string>(type: "text", nullable: true),
                    WarrantyContractNumber = table.Column<string>(type: "text", nullable: true),
                    WarrantyCoverageLevel = table.Column<string>(type: "text", nullable: true),
                    WarrantyStartDate = table.Column<string>(type: "text", nullable: true),
                    WarrantyStartMileage = table.Column<int>(type: "integer", nullable: true),
                    WarrantyExpirationDate = table.Column<string>(type: "text", nullable: true),
                    WarrantyExpirationMileage = table.Column<int>(type: "integer", nullable: true),
                    WarrantyDeductible = table.Column<decimal>(type: "numeric", nullable: true),
                    WarrantyPricePaid = table.Column<decimal>(type: "numeric", nullable: true),
                    WarrantyTransferable = table.Column<bool>(type: "boolean", nullable: true),
                    WarrantyNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vehicles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "conversations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<string>(type: "character varying(64)", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    SharedWith = table.Column<string>(type: "text", nullable: true),
                    Date = table.Column<string>(type: "text", nullable: false),
                    RelatedRecordIdsJson = table.Column<string>(type: "text", nullable: false),
                    MessagesJson = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_conversations_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_records",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<string>(type: "character varying(64)", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Date = table.Column<string>(type: "text", nullable: true),
                    Cost = table.Column<decimal>(type: "numeric", nullable: true),
                    Mileage = table.Column<int>(type: "integer", nullable: true),
                    Shop = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_records", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_records_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_documents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<string>(type: "character varying(64)", nullable: false),
                    MaintenanceRecordId = table.Column<string>(type: "character varying(64)", nullable: true),
                    Section = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Kind = table.Column<string>(type: "text", nullable: false),
                    UploadedAt = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: true),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    StorageBucket = table.Column<string>(type: "text", nullable: true),
                    StorageKey = table.Column<string>(type: "text", nullable: true),
                    Url = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vehicle_documents_maintenance_records_MaintenanceRecordId",
                        column: x => x.MaintenanceRecordId,
                        principalTable: "maintenance_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_vehicle_documents_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "document_chunks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<string>(type: "character varying(64)", nullable: false),
                    Ordinal = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Embedding = table.Column<Vector>(type: "vector(384)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_chunks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_chunks_vehicle_documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "vehicle_documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_conversations_UserId_VehicleId",
                table: "conversations",
                columns: new[] { "UserId", "VehicleId" });

            migrationBuilder.CreateIndex(
                name: "IX_conversations_VehicleId",
                table: "conversations",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_document_chunks_DocumentId",
                table: "document_chunks",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_document_chunks_UserId_DocumentId",
                table: "document_chunks",
                columns: new[] { "UserId", "DocumentId" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_records_UserId_VehicleId",
                table: "maintenance_records",
                columns: new[] { "UserId", "VehicleId" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_records_VehicleId",
                table: "maintenance_records",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                table: "users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_documents_MaintenanceRecordId",
                table: "vehicle_documents",
                column: "MaintenanceRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_documents_UserId_VehicleId",
                table: "vehicle_documents",
                columns: new[] { "UserId", "VehicleId" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_documents_VehicleId",
                table: "vehicle_documents",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_UserId",
                table: "vehicles",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "conversations");

            migrationBuilder.DropTable(
                name: "document_chunks");

            migrationBuilder.DropTable(
                name: "vehicle_documents");

            migrationBuilder.DropTable(
                name: "maintenance_records");

            migrationBuilder.DropTable(
                name: "vehicles");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
