using CarCare.Vehicles.Domain;

namespace CarCare.Vehicles.Application;

public sealed record VehicleInput(
    int Year,
    string Model,
    string LicensePlate,
    string Color,
    string Engine,
    int OdometerKm
);

public interface IVehicleRepository
{
    Task<IReadOnlyList<Vehicle>> ListAsync(Guid userId, CancellationToken ct);
    Task<Vehicle?> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task AddAsync(Vehicle vehicle, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
}

public interface IOdometerPublisher
{
    Task PublishAsync(Guid userId, Guid vehicleId, int odometerKm, CancellationToken ct);
}

public sealed class VehicleService(IVehicleRepository repository, IOdometerPublisher publisher)
{
    public Task<IReadOnlyList<Vehicle>> ListAsync(Guid userId, CancellationToken ct) =>
        repository.ListAsync(userId, ct);

    public async Task<Vehicle> CreateAsync(Guid userId, VehicleInput input, CancellationToken ct)
    {
        var vehicle = new Vehicle(
            userId,
            input.Year,
            input.Model,
            input.LicensePlate,
            input.Color,
            input.Engine,
            input.OdometerKm
        );
        await repository.AddAsync(vehicle, ct);
        await repository.SaveAsync(ct);
        await publisher.PublishAsync(userId, vehicle.Id, vehicle.OdometerKm, ct);
        return vehicle;
    }

    public async Task<Vehicle> UpdateAsync(
        Guid id,
        Guid userId,
        VehicleInput input,
        CancellationToken ct
    )
    {
        var vehicle =
            await repository.GetAsync(id, userId, ct)
            ?? throw new KeyNotFoundException("Veículo não encontrado.");
        vehicle.Update(
            input.Year,
            input.Model,
            input.LicensePlate,
            input.Color,
            input.Engine,
            input.OdometerKm
        );
        await repository.SaveAsync(ct);
        await publisher.PublishAsync(userId, vehicle.Id, vehicle.OdometerKm, ct);
        return vehicle;
    }

    public async Task<string> SetPhotoAsync(
        Guid id,
        Guid userId,
        string extension,
        Stream content,
        string uploadsPath,
        CancellationToken ct
    )
    {
        var vehicle =
            await repository.GetAsync(id, userId, ct)
            ?? throw new KeyNotFoundException("Veículo não encontrado.");
        Directory.CreateDirectory(uploadsPath);
        var name = $"{vehicle.Id}{extension.ToLowerInvariant()}";
        var full = Path.Combine(uploadsPath, name);
        await using var file = File.Create(full);
        await content.CopyToAsync(file, ct);
        vehicle.SetPhoto($"/uploads/{name}");
        await repository.SaveAsync(ct);
        return vehicle.PhotoPath!;
    }

    public async Task UpdateOdometerAsync(
        Guid id,
        Guid userId,
        int odometerKm,
        CancellationToken ct
    )
    {
        var vehicle =
            await repository.GetAsync(id, userId, ct)
            ?? throw new KeyNotFoundException("Veículo não encontrado.");
        vehicle.UpdateOdometer(odometerKm);
        await repository.SaveAsync(ct);
        await publisher.PublishAsync(userId, vehicle.Id, vehicle.OdometerKm, ct);
    }
}
