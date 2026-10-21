using CarCare.Maintenance.Domain;

namespace CarCare.Maintenance.Application;

public sealed record VehicleReportVehicle(
    Guid Id,
    int Year,
    string Model,
    string LicensePlate,
    string Color,
    string Engine,
    int OdometerKm,
    byte[]? Photo
);

public sealed record VehicleReportPeriod(DateOnly? StartDate, DateOnly? EndDate)
{
    public static VehicleReportPeriod Create(DateOnly? startDate, DateOnly? endDate)
    {
        if (startDate.HasValue != endDate.HasValue)
            throw new ArgumentException("Informe as datas inicial e final do relatório.");
        if (startDate > endDate)
            throw new ArgumentException("A data inicial não pode ser posterior à data final.");
        return new(startDate, endDate);
    }

    public bool Includes(DateOnly date) =>
        !StartDate.HasValue || (date >= StartDate.Value && date <= EndDate!.Value);
}

public sealed record VehicleReportCategoryCost(string Category, decimal Total);

public sealed record VehicleReportSummary(
    decimal FuelCost,
    decimal MaintenanceCost,
    decimal TotalCost,
    int DistanceKm,
    decimal Liters,
    decimal? AverageKmPerLiter,
    decimal? AveragePricePerLiter,
    decimal? FuelCostPerKm,
    int OmittedFuelEntries,
    int OmittedServiceRecords,
    IReadOnlyList<VehicleReportCategoryCost> MaintenanceByCategory
);

public sealed record VehicleReportModel(
    VehicleReportVehicle Vehicle,
    VehicleReportPeriod Period,
    DateTime GeneratedAtUtc,
    VehicleReportSummary Summary,
    IReadOnlyList<FuelEntry> FuelEntries,
    IReadOnlyList<ServiceRecord> ServiceRecords,
    IReadOnlyList<MaintenanceItem> MaintenanceItems
);

public interface IVehicleReportClient
{
    Task<VehicleReportVehicle?> GetAsync(Guid userId, Guid vehicleId, CancellationToken ct);
}

public interface IVehicleReportRenderer
{
    byte[] Render(VehicleReportModel report);
}

public sealed class VehicleReportService(
    IMaintenanceRepository repository,
    IVehicleReportClient vehicleClient
)
{
    public async Task<VehicleReportModel> BuildAsync(
        Guid userId,
        Guid vehicleId,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken ct
    )
    {
        var period = VehicleReportPeriod.Create(startDate, endDate);
        var vehicle =
            await vehicleClient.GetAsync(userId, vehicleId, ct)
            ?? throw new KeyNotFoundException("Veículo não encontrado.");

        var fuels = await repository.ListFuelAsync(userId, vehicleId, ct);
        var services = await repository.ListServiceRecordsAsync(userId, vehicleId, ct);
        var maintenance = await repository.ListAsync(userId, vehicleId, ct);

        var selectedFuels = fuels
            .Where(x => !x.FueledOn.HasValue || period.Includes(x.FueledOn.Value))
            .OrderByDescending(x => x.FueledOn)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToArray();
        var selectedServices = services
            .Where(x => !x.ServiceDate.HasValue || period.Includes(x.ServiceDate.Value))
            .OrderByDescending(x => x.ServiceDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToArray();

        return new(
            vehicle,
            period,
            DateTime.UtcNow,
            Summarize(selectedFuels, selectedServices),
            selectedFuels,
            selectedServices,
            maintenance.ToArray()
        );
    }

    public static VehicleReportSummary Summarize(
        IReadOnlyCollection<FuelEntry> fuels,
        IReadOnlyCollection<ServiceRecord> services
    )
    {
        var validFuels = fuels
            .Where(x =>
                x.FueledOn.HasValue
                && x.TotalCost is > 0
                && x.PreviousOdometerKm.HasValue
                && x.OdometerKm > x.PreviousOdometerKm.Value
                && x.Liters > 0
            )
            .ToArray();
        var fuelCost = validFuels.Sum(x => x.TotalCost!.Value);
        var distance = validFuels.Sum(x => x.OdometerKm - x.PreviousOdometerKm!.Value);
        var liters = validFuels.Sum(x => x.Liters);

        var validServices = services
            .Where(x => x.ServiceDate.HasValue && x.TotalCost is >= 0)
            .ToArray();
        var maintenanceCost = validServices.Sum(x => x.TotalCost!.Value);
        var categories = validServices
            .GroupBy(x => string.IsNullOrWhiteSpace(x.Category) ? "Sem categoria" : x.Category!)
            .Select(x => new VehicleReportCategoryCost(x.Key, x.Sum(item => item.TotalCost!.Value)))
            .OrderByDescending(x => x.Total)
            .ThenBy(x => x.Category)
            .ToArray();

        return new(
            fuelCost,
            maintenanceCost,
            fuelCost + maintenanceCost,
            distance,
            liters,
            liters > 0 ? decimal.Round(distance / liters, 2) : null,
            liters > 0 ? decimal.Round(fuelCost / liters, 2) : null,
            distance > 0 ? decimal.Round(fuelCost / distance, 2) : null,
            fuels.Count - validFuels.Length,
            services.Count - validServices.Length,
            categories
        );
    }
}
