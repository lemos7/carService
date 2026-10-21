namespace CarCare.Maintenance.Domain;

public sealed class VehicleMileage
{
    private VehicleMileage() { }

    public VehicleMileage(Guid userId, Guid vehicleId, int odometerKm)
    {
        UserId = userId;
        VehicleId = vehicleId;
        OdometerKm = odometerKm;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public Guid VehicleId { get; private set; }
    public Guid UserId { get; private set; }
    public int OdometerKm { get; private set; }
    public DateTime UpdatedAtUtc { get; private set; }

    public void Update(int km)
    {
        if (km >= OdometerKm)
            OdometerKm = km;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}

public sealed class MaintenanceItem
{
    private MaintenanceItem() { }

    public MaintenanceItem(
        Guid userId,
        Guid vehicleId,
        string title,
        string? notes,
        int dueKm,
        int warningKm,
        int? repeatEveryKm
    )
    {
        Id = Guid.NewGuid();
        UserId = userId;
        VehicleId = vehicleId;
        Title = title.Trim();
        Notes = notes?.Trim();
        DueKm = dueKm;
        WarningKm = warningKm;
        RepeatEveryKm = repeatEveryKm;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid VehicleId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public int DueKm { get; private set; }
    public int WarningKm { get; private set; }
    public int? RepeatEveryKm { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public int? CompletedAtKm { get; private set; }

    public void Complete(int currentKm)
    {
        CompletedAtUtc = DateTime.UtcNow;
        CompletedAtKm = currentKm;
    }
}

public sealed class ServiceRecord
{
    private ServiceRecord() { }

    public ServiceRecord(
        Guid userId,
        Guid vehicleId,
        int odometerKm,
        string? details,
        string documentPath,
        string documentName,
        DateOnly serviceDate,
        decimal totalCost,
        string category
    )
    {
        if (odometerKm < 0 || details?.Length > 4000)
            throw new ArgumentException("Dados do serviço realizado inválidos.");

        ValidateCosts(serviceDate, totalCost, category);
        ServiceDate = serviceDate;
        TotalCost = totalCost;
        Category = category.Trim();
        Id = Guid.NewGuid();
        UserId = userId;
        VehicleId = vehicleId;
        OdometerKm = odometerKm;
        Details = details?.Trim() ?? string.Empty;
        DocumentPath = documentPath;
        DocumentName = documentName;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid VehicleId { get; private set; }
    public int OdometerKm { get; private set; }
    public static readonly string[] Categories =
    [
        "Preventiva",
        "Corretiva",
        "Pneus",
        "Óleo e filtros",
        "Outros",
    ];

    public static void ValidateCosts(DateOnly date, decimal cost, string category)
    {
        if (date == default || date > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Informe uma data de manutenção válida, não futura.");
        if (cost < 0 || cost > 999999999.99m || decimal.Round(cost, 2) != cost)
            throw new ArgumentException("Informe o valor total com até duas casas decimais.");
        if (!Categories.Contains(category?.Trim()))
            throw new ArgumentException("Selecione uma categoria válida.");
    }

    public DateOnly? ServiceDate { get; private set; }
    public decimal? TotalCost { get; private set; }
    public string? Category { get; private set; }
    public string Details { get; private set; } = string.Empty;
    public string DocumentPath { get; private set; } = string.Empty;
    public string DocumentName { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }
}

public sealed class FuelEntry
{
    private FuelEntry() { }

    public FuelEntry(
        Guid userId,
        Guid vehicleId,
        int previousOdometerKm,
        int odometerKm,
        decimal liters,
        decimal totalCost,
        DateOnly fueledOn
    )
    {
        Id = Guid.NewGuid();
        UserId = userId;
        VehicleId = vehicleId;
        OdometerKm = odometerKm;
        ValidateCosts(previousOdometerKm, odometerKm, liters, totalCost, fueledOn);
        TotalCost = totalCost;
        FueledOn = fueledOn;
        Liters = liters;
        PreviousOdometerKm = previousOdometerKm;
        KmPerLiter = decimal.Round((odometerKm - previousOdometerKm) / liters, 2);
        CreatedAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid VehicleId { get; private set; }
    public int OdometerKm { get; private set; }

    public static void ValidateCosts(
        int previousKm,
        int currentKm,
        decimal liters,
        decimal cost,
        DateOnly date
    )
    {
        if (previousKm < 0 || currentKm <= previousKm || liters <= 0)
            throw new ArgumentException("Informe uma distância e quantidade de litros válidas.");
        if (cost <= 0 || cost > 999999999.99m || decimal.Round(cost, 2) != cost)
            throw new ArgumentException(
                "Informe o valor abastecido positivo com até duas casas decimais."
            );
        if (date == default || date > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Informe uma data de abastecimento válida, não futura.");
    }

    public decimal? TotalCost { get; private set; }
    public DateOnly? FueledOn { get; private set; }
    public decimal Liters { get; private set; }
    public int? PreviousOdometerKm { get; private set; }
    public decimal? KmPerLiter { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
}
