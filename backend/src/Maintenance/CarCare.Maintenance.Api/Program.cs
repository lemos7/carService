using System.Security.Claims;
using System.Text;
using CarCare.Maintenance.Api;
using CarCare.Maintenance.Application;
using CarCare.Maintenance.Persistence;
using CarCare.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
SecurityConfiguration.LoadAndValidate(builder.Configuration, builder.Environment, identity: false);
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddMaintenancePersistence(builder.Configuration);
builder.Services.AddScoped<MaintenanceService>();
builder.Services.AddScoped<VehicleReportService>();
builder.Services.AddSingleton<IVehicleReportRenderer, VehicleReportPdfRenderer>();
QuestPDF.Settings.License = LicenseType.Community;
var jwt = builder.Configuration.GetSection("Jwt");
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = SecurityConfiguration.Validation(builder.Configuration);
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies[
                    BrowserSecurity.CookieName(builder.Environment)
                ];
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseBrowserSecurity();
app.UseExceptionHandler(handler =>
    handler.Run(async context =>
    {
        var e = context
            .Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()
            ?.Error;
        context.Response.StatusCode =
            e is KeyNotFoundException ? 404
            : e is ArgumentException ? 400
            : e is HttpRequestException ? 503
            : 500;
        await Results
            .Problem(
                context.Response.StatusCode == 500 ? "Erro inesperado." : e?.Message,
                statusCode: context.Response.StatusCode
            )
            .ExecuteAsync(context);
    })
);
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapPost(
    "/internal/odometer",
    async (
        HttpRequest request,
        OdometerEvent e,
        MaintenanceService service,
        IConfiguration config,
        CancellationToken ct
    ) =>
    {
        if (
            !SecurityConfiguration.ValidInternalKey(
                request.Headers["X-Internal-Key"].ToString(),
                config["InternalApiKey"]!
            )
        )
            return Results.Unauthorized();
        await service.UpdateMileageAsync(e.UserId, e.VehicleId, e.OdometerKm, ct);
        return Results.Accepted();
    }
);
var api = app.MapGroup("/api/maintenance").RequireAuthorization();
api.MapGet(
    "/",
    async (
        Guid? vehicleId,
        ClaimsPrincipal user,
        MaintenanceService service,
        CancellationToken ct
    ) => Results.Ok(await service.ListAsync(UserId(user), vehicleId, ct))
);
api.MapPost(
    "/",
    async (
        MaintenanceInput input,
        ClaimsPrincipal user,
        MaintenanceService service,
        CancellationToken ct
    ) => Results.Created("/api/maintenance", await service.CreateAsync(UserId(user), input, ct))
);
api.MapGet(
    "/history/{vehicleId:guid}",
    async (
        Guid vehicleId,
        ClaimsPrincipal user,
        MaintenanceService service,
        CancellationToken ct
    ) => Results.Ok(await service.ListServiceRecordsAsync(UserId(user), vehicleId, ct))
);
api.MapPost(
        "/history",
        async (
            [FromForm] ServiceRecordRequest input,
            ClaimsPrincipal user,
            MaintenanceService service,
            IWebHostEnvironment env,
            CancellationToken ct
        ) =>
        {
            var storedName = string.Empty;
            string? fullPath = null;
            if (input.Document is not null)
            {
                if (input.Document.Length == 0 || input.Document.Length > 10_000_000)
                    return Results.BadRequest(new { message = "Envie um PDF de até 10 MB." });

                var extension = Path.GetExtension(input.Document.FileName);
                if (!extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
                    return Results.BadRequest(new { message = "O anexo deve ser um arquivo PDF." });

                await using var source = input.Document.OpenReadStream();
                var signature = new byte[5];
                if (
                    await source.ReadAsync(signature, ct) != signature.Length
                    || Encoding.ASCII.GetString(signature) != "%PDF-"
                )
                    return Results.BadRequest(
                        new { message = "O arquivo enviado não é um PDF válido." }
                    );
                source.Position = 0;

                var directory = Path.Combine(env.ContentRootPath, "documents");
                Directory.CreateDirectory(directory);
                storedName = $"{Guid.NewGuid():N}.pdf";
                fullPath = Path.Combine(directory, storedName);
                await using (var destination = File.Create(fullPath))
                    await source.CopyToAsync(destination, ct);
            }

            try
            {
                var record = await service.CreateServiceRecordAsync(
                    UserId(user),
                    input.VehicleId,
                    input.OdometerKm,
                    input.Details,
                    storedName,
                    input.Document is null
                        ? string.Empty
                        : Path.GetFileName(input.Document.FileName),
                    input.ServiceDate,
                    input.TotalCost
                        ?? throw new ArgumentException("Informe o valor total da manutenção."),
                    input.Category,
                    ct
                );
                return Results.Created($"/api/maintenance/history/{record.Id}", record);
            }
            catch
            {
                if (fullPath is not null)
                    File.Delete(fullPath);
                throw;
            }
        }
    )
    .DisableAntiforgery();
api.MapGet(
    "/history/document/{id:guid}",
    async (
        Guid id,
        ClaimsPrincipal user,
        MaintenanceService service,
        IWebHostEnvironment env,
        CancellationToken ct
    ) =>
    {
        var record = await service.GetServiceRecordAsync(id, UserId(user), ct);
        if (record is null)
            return Results.NotFound();
        var path = Path.Combine(env.ContentRootPath, "documents", record.DocumentPath);
        return File.Exists(path)
            ? Results.File(path, "application/pdf", record.DocumentName)
            : Results.NotFound();
    }
);
api.MapGet(
    "/alerts",
    async (ClaimsPrincipal user, MaintenanceService service, CancellationToken ct) =>
        Results.Ok(await service.AlertsAsync(UserId(user), ct))
);
api.MapPost(
    "/{id:guid}/complete",
    async (Guid id, ClaimsPrincipal user, MaintenanceService service, CancellationToken ct) =>
    {
        await service.CompleteAsync(id, UserId(user), ct);
        return Results.Ok(new { message = "Manutenção confirmada." });
    }
);
api.MapGet(
    "/fuel/{vehicleId:guid}",
    async (
        Guid vehicleId,
        ClaimsPrincipal user,
        MaintenanceService service,
        CancellationToken ct
    ) => Results.Ok(await service.ListFuelAsync(UserId(user), vehicleId, ct))
);
api.MapPost(
    "/fuel",
    async (
        FuelRequest input,
        ClaimsPrincipal user,
        MaintenanceService service,
        CancellationToken ct
    ) =>
        Results.Ok(
            await service.AddFuelAsync(
                UserId(user),
                input.VehicleId,
                input.PreviousOdometerKm,
                input.OdometerKm,
                input.Liters,
                input.TotalCost,
                input.FueledOn,
                ct
            )
        )
);
api.MapGet(
    "/reports/vehicles/{vehicleId:guid}",
    async (
        Guid vehicleId,
        DateOnly? startDate,
        DateOnly? endDate,
        ClaimsPrincipal user,
        VehicleReportService reportService,
        IVehicleReportRenderer renderer,
        CancellationToken ct
    ) =>
    {
        var report = await reportService.BuildAsync(
            UserId(user),
            vehicleId,
            startDate,
            endDate,
            ct
        );
        var safePlate = new string(
            report.Vehicle.LicensePlate.Where(char.IsLetterOrDigit).ToArray()
        ).ToUpperInvariant();
        var fileName = $"relatorio-{safePlate}-{DateTime.UtcNow:yyyy-MM-dd}.pdf";
        return Results.File(renderer.Render(report), "application/pdf", fileName);
    }
);
Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "data"));
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MaintenanceDbContext>();
    await db.Database.EnsureCreatedAsync();
    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "ServiceRecords" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_ServiceRecords" PRIMARY KEY,
            "UserId" TEXT NOT NULL,
            "VehicleId" TEXT NOT NULL,
            "OdometerKm" INTEGER NOT NULL,
            "Details" TEXT NOT NULL,
            "DocumentPath" TEXT NOT NULL,
            "DocumentName" TEXT NOT NULL,
            "CreatedAtUtc" TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IX_ServiceRecords_UserId_VehicleId_CreatedAtUtc"
        ON "ServiceRecords" ("UserId", "VehicleId", "CreatedAtUtc");
        """
    );
    await CostSchemaUpgrade.ApplyAsync(db);
}
app.Run();
static Guid UserId(ClaimsPrincipal user) =>
    Guid.Parse(
        user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException()
    );

public sealed record OdometerEvent(Guid UserId, Guid VehicleId, int OdometerKm);

public sealed record FuelRequest(
    Guid VehicleId,
    int PreviousOdometerKm,
    int OdometerKm,
    decimal Liters,
    decimal TotalCost,
    DateOnly FueledOn
);

public sealed class ServiceRecordRequest
{
    public Guid VehicleId { get; init; }
    public int OdometerKm { get; init; }
    public DateOnly ServiceDate { get; init; }
    public decimal? TotalCost { get; init; }
    public string Category { get; init; } = string.Empty;
    public string? Details { get; init; }
    public IFormFile? Document { get; init; }
}
