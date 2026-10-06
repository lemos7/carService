using System.Security.Claims;
using System.Text;
using CarCare.Security;
using CarCare.Vehicles.Application;
using CarCare.Vehicles.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
SecurityConfiguration.LoadAndValidate(builder.Configuration, builder.Environment, identity: false);
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddVehiclePersistence(builder.Configuration);
builder.Services.AddScoped<VehicleService>();
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
            : 500;
        await Results
            .Problem(
                context.Response.StatusCode == 500 ? "Erro inesperado." : e?.Message,
                statusCode: context.Response.StatusCode
            )
            .ExecuteAsync(context);
    })
);
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapPut(
    "/internal/odometer",
    async (
        HttpRequest request,
        OdometerUpdate input,
        VehicleService service,
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
        await service.UpdateOdometerAsync(input.VehicleId, input.UserId, input.OdometerKm, ct);
        return Results.NoContent();
    }
);
var api = app.MapGroup("/api/vehicles").RequireAuthorization();
api.MapGet(
    "/",
    async (ClaimsPrincipal user, VehicleService service, CancellationToken ct) =>
        Results.Ok(await service.ListAsync(UserId(user), ct))
);
api.MapPost(
    "/",
    async (
        VehicleInput input,
        ClaimsPrincipal user,
        VehicleService service,
        CancellationToken ct
    ) => Results.Created("/api/vehicles", await service.CreateAsync(UserId(user), input, ct))
);
api.MapPut(
    "/{id:guid}",
    async (
        Guid id,
        VehicleInput input,
        ClaimsPrincipal user,
        VehicleService service,
        CancellationToken ct
    ) => Results.Ok(await service.UpdateAsync(id, UserId(user), input, ct))
);
api.MapPost(
        "/{id:guid}/photo",
        async (
            Guid id,
            IFormFile photo,
            ClaimsPrincipal user,
            VehicleService service,
            IWebHostEnvironment env,
            CancellationToken ct
        ) =>
        {
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var ext = Path.GetExtension(photo.FileName);
            if (!allowed.Contains(ext.ToLowerInvariant()) || photo.Length > 5_000_000)
                return Results.BadRequest(new { message = "Envie JPG, PNG ou WEBP de até 5 MB." });
            await using var stream = photo.OpenReadStream();
            return Results.Ok(
                new
                {
                    photoUrl = await service.SetPhotoAsync(
                        id,
                        UserId(user),
                        ext,
                        stream,
                        Path.Combine(env.ContentRootPath, "wwwroot", "uploads"),
                        ct
                    ),
                }
            );
        }
    )
    .DisableAntiforgery();
Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "data"));
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<VehiclesDbContext>();
    await db.Database.EnsureCreatedAsync();
}
app.Run();
static Guid UserId(ClaimsPrincipal user) =>
    Guid.Parse(
        user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException()
    );

public sealed record OdometerUpdate(Guid UserId, Guid VehicleId, int OdometerKm);
