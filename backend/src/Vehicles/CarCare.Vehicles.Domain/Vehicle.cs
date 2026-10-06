namespace CarCare.Vehicles.Domain;

public sealed class Vehicle
{
    private Vehicle() { }

    public Vehicle(
        Guid userId,
        int year,
        string model,
        string licensePlate,
        string color,
        string engine,
        int odometerKm
    )
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Update(year, model, licensePlate, color, engine, odometerKm);
        CreatedAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public int Year { get; private set; }
    public string Model { get; private set; } = string.Empty;
    public string LicensePlate { get; private set; } = string.Empty;
    public string Color { get; private set; } = string.Empty;
    public string Engine { get; private set; } = string.Empty;
    public int OdometerKm { get; private set; }
    public string? PhotoPath { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

    public void Update(
        int year,
        string model,
        string licensePlate,
        string color,
        string engine,
        int odometerKm
    )
    {
        if (year < 1886 || odometerKm < 0 || string.IsNullOrWhiteSpace(model))
            throw new ArgumentException("Dados do veículo inválidos.");
        if (odometerKm < OdometerKm)
            throw new ArgumentException("A quilometragem não pode diminuir.");
        Year = year;
        Model = model.Trim();
        LicensePlate = licensePlate.Trim().ToUpperInvariant();
        Color = color.Trim();
        Engine = engine.Trim();
        OdometerKm = odometerKm;
    }

    public void SetPhoto(string path) => PhotoPath = path;

    public void UpdateOdometer(int odometerKm)
    {
        if (odometerKm < OdometerKm)
            throw new ArgumentException("A quilometragem não pode diminuir.");
        OdometerKm = odometerKm;
    }
}
