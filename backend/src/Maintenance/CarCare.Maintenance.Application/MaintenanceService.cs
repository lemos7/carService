using CarCare.Maintenance.Domain;

namespace CarCare.Maintenance.Application;

public sealed record MaintenanceInput(
    Guid VehicleId,
    string Title,
    string? Notes,
    int DueKm,
    int WarningKm,
    int? RepeatEveryKm
);

public sealed record AlertResult(
    Guid MaintenanceId,
    Guid VehicleId,
    string Title,
    int DueKm,
    int CurrentKm,
    string Severity,
    string Message
);

public interface IVehicleOdometerUpdater
{
    Task UpdateAsync(Guid userId, Guid vehicleId, int odometerKm, CancellationToken ct);
}

public interface IMaintenanceRepository
{
    Task<IReadOnlyList<MaintenanceItem>> ListAsync(
        Guid userId,
        Guid? vehicleId,
        CancellationToken ct
    );
    Task<MaintenanceItem?> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task<IReadOnlyList<ServiceRecord>> ListServiceRecordsAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken ct
    );
    Task<ServiceRecord?> GetServiceRecordAsync(Guid id, Guid userId, CancellationToken ct);
    Task<VehicleMileage?> GetMileageAsync(Guid vehicleId, Guid userId, CancellationToken ct);
    Task<IReadOnlyList<FuelEntry>> ListFuelAsync(Guid userId, Guid vehicleId, CancellationToken ct);
    Task<FuelEntry?> LastFuelAsync(Guid vehicleId, Guid userId, CancellationToken ct);
    Task AddAsync(MaintenanceItem item, CancellationToken ct);
    Task AddFuelAsync(FuelEntry entry, CancellationToken ct);
    Task AddServiceRecordAsync(ServiceRecord record, CancellationToken ct);
    Task UpsertMileageAsync(Guid vehicleId, Guid userId, int km, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
}

public sealed class MaintenanceService(
    IMaintenanceRepository repository,
    IVehicleOdometerUpdater vehicleOdometerUpdater
)
{
    public Task<IReadOnlyList<MaintenanceItem>> ListAsync(
        Guid userId,
        Guid? vehicleId,
        CancellationToken ct
    ) => repository.ListAsync(userId, vehicleId, ct);

    public Task<IReadOnlyList<ServiceRecord>> ListServiceRecordsAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken ct
    ) => repository.ListServiceRecordsAsync(userId, vehicleId, ct);

    public Task<IReadOnlyList<FuelEntry>> ListFuelAsync(
        Guid userId,
        Guid vehicleId,
        CancellationToken ct
    ) => repository.ListFuelAsync(userId, vehicleId, ct);

    public Task<ServiceRecord?> GetServiceRecordAsync(Guid id, Guid userId, CancellationToken ct) =>
        repository.GetServiceRecordAsync(id, userId, ct);

    public async Task<ServiceRecord> CreateServiceRecordAsync(
        Guid userId,
        Guid vehicleId,
        int odometerKm,
        string details,
        string documentPath,
        string documentName,
        DateOnly serviceDate,
        decimal totalCost,
        string category,
        CancellationToken ct
    )
    {
        if (odometerKm < 0 || string.IsNullOrWhiteSpace(details) || details.Length > 4000)
            throw new ArgumentException("Informe a quilometragem e os detalhes do serviço.");

        ServiceRecord.ValidateCosts(serviceDate, totalCost, category);
        var mileage = await repository.GetMileageAsync(vehicleId, userId, ct);
        if (mileage is not null && odometerKm < mileage.OdometerKm)
            throw new ArgumentException("A quilometragem não pode ser menor que a atual.");

        await vehicleOdometerUpdater.UpdateAsync(userId, vehicleId, odometerKm, ct);
        var record = new ServiceRecord(
            userId,
            vehicleId,
            odometerKm,
            details,
            documentPath,
            documentName,
            serviceDate,
            totalCost,
            category
        );
        await repository.AddServiceRecordAsync(record, ct);
        await repository.UpsertMileageAsync(vehicleId, userId, odometerKm, ct);
        await repository.SaveAsync(ct);
        return record;
    }

    public async Task<MaintenanceItem> CreateAsync(
        Guid userId,
        MaintenanceInput input,
        CancellationToken ct
    )
    {
        if (input.DueKm < 0 || input.WarningKm < 0 || string.IsNullOrWhiteSpace(input.Title))
            throw new ArgumentException("Dados da manutenção inválidos.");
        var item = new MaintenanceItem(
            userId,
            input.VehicleId,
            input.Title,
            input.Notes,
            input.DueKm,
            input.WarningKm,
            input.RepeatEveryKm
        );
        await repository.AddAsync(item, ct);
        await repository.SaveAsync(ct);
        return item;
    }

    public async Task UpdateMileageAsync(Guid userId, Guid vehicleId, int km, CancellationToken ct)
    {
        await repository.UpsertMileageAsync(vehicleId, userId, km, ct);
        await repository.SaveAsync(ct);
    }

    public async Task<FuelEntry> AddFuelAsync(
        Guid userId,
        Guid vehicleId,
        int previousKm,
        int currentKm,
        decimal liters,
        decimal totalCost,
        DateOnly fueledOn,
        CancellationToken ct
    )
    {
        if (previousKm < 0 || currentKm < 0 || liters <= 0)
            throw new ArgumentException("Quilometragem e litros devem ser positivos.");
        if (currentKm <= previousKm)
            throw new ArgumentException(
                "A quilometragem depois de abastecer deve ser maior que a anterior."
            );

        FuelEntry.ValidateCosts(previousKm, currentKm, liters, totalCost, fueledOn);
        await vehicleOdometerUpdater.UpdateAsync(userId, vehicleId, currentKm, ct);
        var entry = new FuelEntry(
            userId,
            vehicleId,
            previousKm,
            currentKm,
            liters,
            totalCost,
            fueledOn
        );
        await repository.AddFuelAsync(entry, ct);
        await repository.UpsertMileageAsync(vehicleId, userId, currentKm, ct);
        await repository.SaveAsync(ct);
        return entry;
    }

    public async Task<IReadOnlyList<AlertResult>> AlertsAsync(Guid userId, CancellationToken ct)
    {
        var items = await repository.ListAsync(userId, null, ct);
        var alerts = new List<AlertResult>();
        foreach (var item in items.Where(x => x.CompletedAtUtc is null))
        {
            var mileage = await repository.GetMileageAsync(item.VehicleId, userId, ct);
            if (mileage is null || mileage.OdometerKm < item.DueKm - item.WarningKm)
                continue;
            var overdue = mileage.OdometerKm >= item.DueKm;
            alerts.Add(
                new(
                    item.Id,
                    item.VehicleId,
                    item.Title,
                    item.DueKm,
                    mileage.OdometerKm,
                    overdue ? "error" : "warning",
                    overdue
                        ? $"{item.Title} está atrasada em {mileage.OdometerKm - item.DueKm:N0} km."
                        : $"{item.Title} vence em {item.DueKm - mileage.OdometerKm:N0} km."
                )
            );
        }
        return alerts;
    }

    public async Task CompleteAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var item =
            await repository.GetAsync(id, userId, ct)
            ?? throw new KeyNotFoundException("Manutenção não encontrada.");
        if (item.CompletedAtUtc is not null)
            return;

        var mileage = await repository.GetMileageAsync(item.VehicleId, userId, ct);
        var currentKm = mileage?.OdometerKm ?? item.DueKm;
        item.Complete(currentKm);
        if (item.RepeatEveryKm is > 0)
            await repository.AddAsync(
                new(
                    userId,
                    item.VehicleId,
                    item.Title,
                    item.Notes,
                    currentKm + item.RepeatEveryKm.Value,
                    item.WarningKm,
                    item.RepeatEveryKm
                ),
                ct
            );
        await repository.SaveAsync(ct);
    }
}
