using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CarCare.Maintenance.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

internal static class CostChecks
{
    private static void Check(bool condition, string message)
    {
        if (!condition)
            throw new InvalidOperationException("COST FAIL: " + message);
        Console.WriteLine("COST PASS: " + message);
    }

    public static async Task SchemaAsync()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = new MaintenanceDbContext(
            new DbContextOptionsBuilder<MaintenanceDbContext>().UseSqlite(connection).Options
        );
        await db.Database.EnsureCreatedAsync();
        // Simulate the schema shipped before cost tracking, with a real legacy row.
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE ServiceRecords DROP COLUMN ServiceDate;
            ALTER TABLE ServiceRecords DROP COLUMN TotalCost;
            ALTER TABLE ServiceRecords DROP COLUMN Category;
            ALTER TABLE FuelEntries DROP COLUMN TotalCost;
            ALTER TABLE FuelEntries DROP COLUMN FueledOn;
            INSERT INTO ServiceRecords (Id,UserId,VehicleId,OdometerKm,Details,DocumentPath,DocumentName,CreatedAtUtc)
            VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333',1000,'Legacy','old.pdf','old.pdf','2025-01-01 00:00:00');
            """
        );
        await CostSchemaUpgrade.ApplyAsync(db);
        await CostSchemaUpgrade.ApplyAsync(db);
        var record = await db.ServiceRecords.SingleAsync();
        Check(
            record.Details == "Legacy" && record.ServiceDate is null && record.TotalCost is null,
            "legacy schema upgrade preserves rows and unknown values; second run is safe"
        );
        await db.FuelEntries.ToListAsync();
        Check(true, "upgraded fuel schema is readable");
    }

    public static async Task ApiAsync(HttpClient http, string maintenance, Guid vehicleId)
    {
        using var decreasingMileage = await http.PostAsJsonAsync(
            maintenance + "/api/maintenance/fuel",
            new
            {
                vehicleId,
                previousOdometerKm = 1000,
                odometerKm = 1050,
                liters = 15,
                totalCost = 105,
                fueledOn = "2026-01-15",
            }
        );
        Check(
            decreasingMileage.StatusCode == HttpStatusCode.BadRequest,
            "fuel below current vehicle mileage returns 400 instead of 500"
        );
        var mileageError = await decreasingMileage.Content.ReadFromJsonAsync<JsonElement>();
        Check(
            mileageError.GetProperty("detail").GetString()!.Contains("quilometragem atual"),
            "fuel mileage validation provides an actionable message"
        );
        using var fuelList = await http.GetAsync(
            maintenance + $"/api/maintenance/fuel/{vehicleId}"
        );
        fuelList.EnsureSuccessStatusCode();
        var fuels = await fuelList.Content.ReadFromJsonAsync<JsonElement>();
        Check(
            fuels.GetArrayLength() == 1
                && fuels[0].GetProperty("totalCost").GetDecimal() == 60
                && fuels[0].GetProperty("fueledOn").GetString() == "2026-01-15",
            "fuel cost/date persist and are returned for the vehicle"
        );
        foreach (var cost in new[] { 0m, -1m, 1.001m })
        {
            using var invalid = await http.PostAsJsonAsync(
                maintenance + "/api/maintenance/fuel",
                new
                {
                    vehicleId,
                    previousOdometerKm = 1100,
                    odometerKm = 1200,
                    liters = 10,
                    totalCost = cost,
                    fueledOn = "2026-01-15",
                }
            );
            Check(
                invalid.StatusCode == HttpStatusCode.BadRequest,
                "invalid fuel value rejected: " + cost
            );
        }
        using var missingFuel = await http.PostAsJsonAsync(
            maintenance + "/api/maintenance/fuel",
            new
            {
                vehicleId,
                previousOdometerKm = 1100,
                odometerKm = 1200,
                liters = 10,
            }
        );
        Check(missingFuel.StatusCode == HttpStatusCode.BadRequest, "fuel date and value required");

        MultipartFormDataContent Service(
            string? date,
            string? cost = "250.75",
            string category = "Preventiva"
        )
        {
            var form = new MultipartFormDataContent();
            form.Add(new StringContent(vehicleId.ToString()), "vehicleId");
            form.Add(new StringContent("1100"), "odometerKm");
            form.Add(new StringContent("Troca de filtros"), "details");
            form.Add(new StringContent(category), "category");
            if (date is not null)
                form.Add(new StringContent(date), "serviceDate");
            if (cost is not null)
                form.Add(new StringContent(cost), "totalCost");
            form.Add(
                new ByteArrayContent(System.Text.Encoding.ASCII.GetBytes("%PDF-1.4\n%%EOF")),
                "document",
                "receipt.pdf"
            );
            return form;
        }
        foreach (
            var input in new[]
            {
                Service(null),
                Service("2026-01-15", null),
                Service("2026-01-15", "-1"),
                Service("2026-01-15", "1", "Invalid"),
                Service("2999-01-01"),
            }
        )
        {
            using (input)
            using (
                var rejected = await http.PostAsync(maintenance + "/api/maintenance/history", input)
            )
                Check(
                    rejected.StatusCode == HttpStatusCode.BadRequest,
                    "invalid maintenance date, cost or category rejected"
                );
        }
        using var content = Service("2026-01-15");
        using var created = await http.PostAsync(maintenance + "/api/maintenance/history", content);
        created.EnsureSuccessStatusCode();
        using var history = await http.GetAsync(
            maintenance + $"/api/maintenance/history/{vehicleId}"
        );
        var records = await history.Content.ReadFromJsonAsync<JsonElement>();
        Check(
            records.GetArrayLength() == 1
                && records[0].GetProperty("totalCost").GetDecimal() == 250.75m
                && records[0].GetProperty("serviceDate").GetString() == "2026-01-15"
                && records[0].GetProperty("category").GetString() == "Preventiva",
            "maintenance form saves date, total and category and history returns them"
        );
        using var otherVehicle = await http.GetAsync(
            maintenance + $"/api/maintenance/fuel/{Guid.NewGuid()}"
        );
        Check(
            (await otherVehicle.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength() == 0,
            "fuel history isolated by vehicle"
        );
        using var other = await http.PostAsJsonAsync(
            maintenance + "/api/maintenance/fuel",
            new
            {
                vehicleId = Guid.NewGuid(),
                previousOdometerKm = 1100,
                odometerKm = 1200,
                liters = 10,
                totalCost = 50,
                fueledOn = "2026-01-15",
            }
        );
        Check(
            other.StatusCode == HttpStatusCode.NotFound,
            "fuel cannot be created for an unknown vehicle"
        );
    }
}
