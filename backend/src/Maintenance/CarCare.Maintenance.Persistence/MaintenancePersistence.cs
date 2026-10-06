using System.Net.Http.Json;
using CarCare.Maintenance.Application;
using CarCare.Maintenance.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CarCare.Maintenance.Persistence;

public sealed class MaintenanceDbContext(DbContextOptions<MaintenanceDbContext> options)
    : DbContext(options)
{
    public DbSet<MaintenanceItem> MaintenanceItems => Set<MaintenanceItem>();
    public DbSet<FuelEntry> FuelEntries => Set<FuelEntry>();
    public DbSet<VehicleMileage> VehicleMileages => Set<VehicleMileage>();
    public DbSet<ServiceRecord> ServiceRecords => Set<ServiceRecord>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<MaintenanceItem>().HasKey(x => x.Id);
        b.Entity<FuelEntry>().HasKey(x => x.Id);
        b.Entity<FuelEntry>().Property(x => x.TotalCost).HasPrecision(12, 2);
        b.Entity<ServiceRecord>().Property(x => x.TotalCost).HasPrecision(12, 2);
        b.Entity<ServiceRecord>().Property(x => x.Category).HasMaxLength(80);
        b.Entity<FuelEntry>().Property(x => x.Liters).HasPrecision(10, 2);
        b.Entity<FuelEntry>().Property(x => x.KmPerLiter).HasPrecision(10, 2);
        b.Entity<VehicleMileage>().HasKey(x => x.VehicleId);
        b.Entity<ServiceRecord>().HasKey(x => x.Id);
        b.Entity<ServiceRecord>().Property(x => x.Details).HasMaxLength(4000);
        b.Entity<ServiceRecord>().Property(x => x.DocumentName).HasMaxLength(255);
        b.Entity<ServiceRecord>()
            .HasIndex(x => new
            {
                x.UserId,
                x.VehicleId,
                x.CreatedAtUtc,
            });
        b.Entity<MaintenanceItem>()
            .HasIndex(x => new
            {
                x.UserId,
                x.VehicleId,
                x.CompletedAtUtc,
            });
    }
}

public sealed class MaintenanceRepository(MaintenanceDbContext db) : IMaintenanceRepository
{
    public async Task<IReadOnlyList<MaintenanceItem>> ListAsync(
        Guid userId,
        Guid? vehicleId,
        CancellationToken ct
    ) =>
        await db
            .MaintenanceItems.Where(x =>
                x.UserId == userId && (!vehicleId.HasValue || x.VehicleId == vehicleId)
            )
            .OrderBy(x => x.CompletedAtUtc)
            .ThenBy(x => x.DueKm)
            .ToListAsync(ct);

    public Task<MaintenanceItem?> GetAsync(Guid id, Guid userId, CancellationToken ct) =>
        db.MaintenanceItems.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

    public async Task<IReadOnlyList<ServiceRecord>> ListServiceRecordsAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken ct
    ) =>
        await db
            .ServiceRecords.Where(x => x.UserId == userId && x.VehicleId == vehicleId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(ct);

    public Task<ServiceRecord?> GetServiceRecordAsync(Guid id, Guid userId, CancellationToken ct) =>
        db.ServiceRecords.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

    public Task<VehicleMileage?> GetMileageAsync(
        Guid vehicleId,
        Guid userId,
        CancellationToken ct
    ) =>
        db.VehicleMileages.FirstOrDefaultAsync(
            x => x.VehicleId == vehicleId && x.UserId == userId,
            ct
        );

    public async Task<IReadOnlyList<FuelEntry>> ListFuelAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken ct
    ) =>
        await db
            .FuelEntries.AsNoTracking()
            .Where(x => x.UserId == userId && x.VehicleId == vehicleId)
            .OrderByDescending(x => x.FueledOn)
            .ToListAsync(ct);

    public Task<FuelEntry?> LastFuelAsync(Guid vehicleId, Guid userId, CancellationToken ct) =>
        db
            .FuelEntries.Where(x => x.VehicleId == vehicleId && x.UserId == userId)
            .OrderByDescending(x => x.OdometerKm)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(MaintenanceItem item, CancellationToken ct) =>
        await db.MaintenanceItems.AddAsync(item, ct);

    public async Task AddFuelAsync(FuelEntry entry, CancellationToken ct) =>
        await db.FuelEntries.AddAsync(entry, ct);

    public async Task AddServiceRecordAsync(ServiceRecord record, CancellationToken ct) =>
        await db.ServiceRecords.AddAsync(record, ct);

    public async Task UpsertMileageAsync(Guid vehicleId, Guid userId, int km, CancellationToken ct)
    {
        var current = await GetMileageAsync(vehicleId, userId, ct);
        if (current is null)
            await db.VehicleMileages.AddAsync(new(userId, vehicleId, km), ct);
        else
            current.Update(km);
    }

    public Task SaveAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}

public sealed class VehicleOdometerUpdater(HttpClient client, string internalApiKey)
    : IVehicleOdometerUpdater
{
    public async Task UpdateAsync(Guid userId, Guid vehicleId, int odometerKm, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/internal/odometer")
        {
            Content = JsonContent.Create(
                new
                {
                    userId,
                    vehicleId,
                    odometerKm,
                }
            ),
        };
        request.Headers.Add("X-Internal-Key", internalApiKey);
        using var response = await client.SendAsync(request, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new KeyNotFoundException("Veículo não encontrado.");
        if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
            throw new ArgumentException(
                "A quilometragem informada não pode ser menor que a quilometragem atual do veículo."
            );
        response.EnsureSuccessStatusCode();
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddMaintenancePersistence(
        this IServiceCollection services,
        IConfiguration config
    ) =>
        services
            .AddDbContext<MaintenanceDbContext>(o =>
                o.UseSqlite(config.GetConnectionString("Database"))
            )
            .AddScoped<IMaintenanceRepository, MaintenanceRepository>()
            .AddScoped<IVehicleOdometerUpdater>(_ => new VehicleOdometerUpdater(
                new HttpClient
                {
                    BaseAddress = new Uri(
                        config["Services:Vehicles"] ?? "http://vehicles-api:8080"
                    ),
                },
                config["InternalApiKey"]
                    ?? throw new InvalidOperationException("InternalApiKey is required.")
            ));
}
