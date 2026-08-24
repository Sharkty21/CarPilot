using CarPilot.Server.Data;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

using Pgvector.EntityFrameworkCore;

namespace CarPilot.Server;

/// <summary>Enables `dotnet ef` migrations without a running Aspire AppHost.</summary>
public sealed class CarPilotDbContextFactory : IDesignTimeDbContextFactory<CarPilotDbContext>
{
    public CarPilotDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CarPilotDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=127.0.0.1;Port=5432;Database=carpilot;Username=postgres;Password=postgres",
            npgsql => npgsql.UseVector());
        return new CarPilotDbContext(optionsBuilder.Options);
    }
}
