using System.Net.Http.Json;
using CarCare.Vehicles.Application;
using CarCare.Vehicles.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CarCare.Vehicles.Persistence;

public sealed class VehiclesDbContext(DbContextOptions<VehiclesDbContext> options)
    : DbContext(options)
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Vehicle>().HasKey(x => x.Id);
        b.Entity<Vehicle>().HasIndex(x => new { x.UserId, x.LicensePlate }).IsUnique();
        b.Entity<Vehicle>().Property(x => x.Model).HasMaxLength(120);
        b.Entity<Vehicle>().Property(x => x.LicensePlate).HasMaxLength(10);
    }
}

public sealed class VehicleRepository(VehiclesDbContext db) : IVehicleRepository
{
    public async Task<IReadOnlyList<Vehicle>> ListAsync(Guid userId, CancellationToken ct) =>
        await db.Vehicles.Where(x => x.UserId == userId).OrderBy(x => x.Model).ToListAsync(ct);

    public Task<Vehicle?> GetAsync(Guid id, Guid userId, CancellationToken ct) =>
        db.Vehicles.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

    public async Task AddAsync(Vehicle vehicle, CancellationToken ct) =>
        await db.Vehicles.AddAsync(vehicle, ct);

    public Task SaveAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}

public sealed class OdometerPublisher(
    HttpClient client,
    ILogger<OdometerPublisher> logger,
    string internalApiKey
) : IOdometerPublisher
{
    public async Task PublishAsync(
        Guid userId,
        Guid vehicleId,
        int odometerKm,
        CancellationToken ct
    )
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/internal/odometer")
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
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Serviço de manutenção indisponível ao publicar quilometragem do veículo {VehicleId}",
                vehicleId
            );
        }
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddVehiclePersistence(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.AddDbContext<VehiclesDbContext>(o =>
            o.UseSqlite(config.GetConnectionString("Database"))
        );
        services.AddScoped<IVehicleRepository, VehicleRepository>();
        services.AddScoped<IOdometerPublisher>(sp => new OdometerPublisher(
            new HttpClient
            {
                BaseAddress = new Uri(
                    config["Services:Maintenance"] ?? "http://maintenance-api:8080"
                ),
            },
            sp.GetRequiredService<ILogger<OdometerPublisher>>(),
            config["InternalApiKey"]
                ?? throw new InvalidOperationException("InternalApiKey is required.")
        ));
        return services;
    }
}
