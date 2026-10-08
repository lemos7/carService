using System.Net;
using System.Text;
using System.Text.Json;
using CarCare.Maintenance.Api;
using CarCare.Maintenance.Application;
using CarCare.Maintenance.Domain;
using CarCare.Maintenance.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;
using UglyToad.PdfPig;

internal static class ReportChecks
{
    private static void Check(bool condition, string message)
    {
        if (!condition)
            throw new InvalidOperationException("REPORT FAIL: " + message);
        Console.WriteLine("REPORT PASS: " + message);
    }

    public static async Task RunAsync()
    {
        await ClientAsync();
        await AggregationAsync();
        Pdf();
    }

    private static async Task ClientAsync()
    {
        var vehicleId = Guid.NewGuid();
        var handler = new StubHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath.StartsWith("/uploads/"))
                return new(HttpStatusCode.BadGateway);
            if (request.RequestUri.AbsolutePath.Contains(vehicleId.ToString()))
                return Json(
                    new
                    {
                        id = vehicleId,
                        year = 2020,
                        model = "Vectra",
                        licensePlate = "ABC1D23",
                        color = "Preto",
                        engine = "2.0",
                        odometerKm = 120000,
                        photoPath = "/uploads/missing.jpg",
                    }
                );
            return new(HttpStatusCode.NotFound);
        });
        var client = new VehicleReportClient(
            new HttpClient(handler) { BaseAddress = new Uri("http://vehicles.test") },
            "internal-test-key"
        );
        var vehicle = await client.GetAsync(Guid.NewGuid(), vehicleId, CancellationToken.None);
        Check(
            vehicle is { Model: "Vectra", Photo: null },
            "vehicle client returns data and tolerates unavailable photo"
        );
        Check(
            handler.Requests[0].Headers.GetValues("X-Internal-Key").Single()
                == "internal-test-key",
            "vehicle client authenticates the internal request"
        );
        Check(
            await client.GetAsync(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None) is null,
            "vehicle client maps 404 to an absent vehicle"
        );
    }

    private static async Task AggregationAsync()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<MaintenanceDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new MaintenanceDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        db.FuelEntries.AddRange(
            new FuelEntry(userId, vehicleId, 1000, 1100, 10, 60, new(2026, 1, 10)),
            new FuelEntry(userId, vehicleId, 1100, 1300, 20, 140, new(2026, 1, 31)),
            new FuelEntry(userId, vehicleId, 1300, 1400, 10, 80, new(2026, 2, 1)),
            new FuelEntry(otherUserId, vehicleId, 1000, 2000, 1, 999, new(2026, 1, 15))
        );
        db.ServiceRecords.AddRange(
            new ServiceRecord(
                userId,
                vehicleId,
                1100,
                "Troca de óleo",
                string.Empty,
                string.Empty,
                new(2026, 1, 20),
                250,
                "Óleo e filtros"
            ),
            new ServiceRecord(
                userId,
                vehicleId,
                1400,
                "Pneus",
                string.Empty,
                string.Empty,
                new(2026, 2, 1),
                800,
                "Pneus"
            ),
            new ServiceRecord(
                otherUserId,
                vehicleId,
                1100,
                "Outro usuário",
                string.Empty,
                string.Empty,
                new(2026, 1, 20),
                999,
                "Outros"
            )
        );
        db.MaintenanceItems.Add(new MaintenanceItem(userId, vehicleId, "Correia", null, 1500, 100, null));
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO ServiceRecords
            (Id, UserId, VehicleId, OdometerKm, Details, DocumentPath, DocumentName, CreatedAtUtc, ServiceDate, TotalCost, Category)
            VALUES ({0}, {1}, {2}, 1000, 'Legado', '', '', '2025-01-01', NULL, NULL, NULL)
            """,
            Guid.NewGuid(),
            userId,
            vehicleId
        );
        db.ChangeTracker.Clear();

        var reportService = new VehicleReportService(
            new MaintenanceRepository(db),
            new StubVehicleClient(
                new(vehicleId, 2020, "Vectra", "ABC1D23", "Preto", "2.0", 1400, null)
            )
        );
        var report = await reportService.BuildAsync(
            userId,
            vehicleId,
            new(2026, 1, 1),
            new(2026, 1, 31),
            CancellationToken.None
        );
        Check(report.FuelEntries.Count == 2, "period filter is inclusive and isolates fuel by user");
        Check(
            report.ServiceRecords.Count == 2
                && report.ServiceRecords.Any(x => x.ServiceDate is null),
            "dated services are filtered while legacy undated services remain visible"
        );
        Check(report.MaintenanceItems.Count == 1, "mileage reminders remain outside date filter");
        Check(
            report.Summary.FuelCost == 200
                && report.Summary.MaintenanceCost == 250
                && report.Summary.TotalCost == 450
                && report.Summary.DistanceKm == 300
                && report.Summary.Liters == 30
                && report.Summary.AverageKmPerLiter == 10
                && report.Summary.AveragePricePerLiter == 6.67m
                && report.Summary.FuelCostPerKm == 0.67m
                && report.Summary.OmittedServiceRecords == 1,
            "report calculations match the weighted frontend rules and count legacy omissions"
        );
        Check(
            report.Summary.MaintenanceByCategory.Single()
                == new VehicleReportCategoryCost("Óleo e filtros", 250),
            "maintenance costs are grouped by category"
        );

        foreach (
            var invalid in new (DateOnly? Start, DateOnly? End)[]
            {
                (new DateOnly(2026, 1, 1), null),
                (new DateOnly(2026, 2, 1), new DateOnly(2026, 1, 1)),
            }
        )
        {
            try
            {
                VehicleReportPeriod.Create(invalid.Start, invalid.End);
                Check(false, "invalid report period rejected");
            }
            catch (ArgumentException)
            {
                Check(true, "invalid report period rejected");
            }
        }

        var empty = VehicleReportService.Summarize([], []);
        Check(
            empty.AverageKmPerLiter is null
                && empty.AveragePricePerLiter is null
                && empty.FuelCostPerKm is null,
            "empty report does not divide by zero"
        );
    }

    private static void Pdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var userId = Guid.NewGuid();
        var vehicleId = Guid.NewGuid();
        var fuels = Enumerable
            .Range(0, 75)
            .Select(i =>
                new FuelEntry(
                    userId,
                    vehicleId,
                    1000 + i * 100,
                    1100 + i * 100,
                    10,
                    60,
                    new DateOnly(2026, 1, 1).AddDays(i)
                )
            )
            .ToArray();
        var services = new[]
        {
            new ServiceRecord(
                userId,
                vehicleId,
                1500,
                "Troca de filtros",
                "receipt.pdf",
                "comprovante.pdf",
                new(2026, 1, 15),
                300,
                "Preventiva"
            ),
        };
        var reminders = new[]
        {
            new MaintenanceItem(userId, vehicleId, "Revisão geral", null, 9000, 500, 10000),
        };
        var model = new VehicleReportModel(
            new(vehicleId, 2020, "Vectra Elegance", "ABC1D23", "Preto", "2.0", 8500, [1, 2, 3]),
            new(null, null),
            new DateTime(2026, 10, 8, 12, 0, 0, DateTimeKind.Utc),
            VehicleReportService.Summarize(fuels, services),
            fuels,
            services,
            reminders
        );
        var bytes = new VehicleReportPdfRenderer().Render(model);
        Check(Encoding.ASCII.GetString(bytes, 0, 5) == "%PDF-", "renderer produces a PDF signature");
        using var document = PdfDocument.Open(bytes);
        var text = string.Join(" ", document.GetPages().Select(x => x.Text));
        Check(document.NumberOfPages > 1, "long report paginates across multiple pages");
        Check(
            text.Contains("Vectra Elegance")
                && text.Contains("Abastecimentos")
                && text.Contains("Manutenções realizadas")
                && text.Contains("Lembretes de manutenção"),
            "generated PDF exposes all essential report sections"
        );
    }

    private sealed class StubVehicleClient(VehicleReportVehicle vehicle) : IVehicleReportClient
    {
        public Task<VehicleReportVehicle?> GetAsync(Guid userId, Guid vehicleId, CancellationToken ct) =>
            Task.FromResult<VehicleReportVehicle?>(vehicle.Id == vehicleId ? vehicle : null);
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> response)
        : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            Requests.Add(request);
            return Task.FromResult(response(request));
        }
    }

    private static HttpResponseMessage Json(object value) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(value),
                Encoding.UTF8,
                "application/json"
            ),
        };
}
