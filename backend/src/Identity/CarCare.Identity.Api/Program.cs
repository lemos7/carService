using System.Security.Claims;
using System.Threading.RateLimiting;
using CarCare.Identity.Application;
using CarCare.Identity.Persistence;
using CarCare.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
SecurityConfiguration.LoadAndValidate(builder.Configuration, builder.Environment, identity: true);
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = SecurityConfiguration.Validation(builder.Configuration);
        options.Events = new JwtBearerEvents
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
builder.Services.AddAuthenticationLimits();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddIdentityPersistence(builder.Configuration);
builder.Services.AddScoped<IdentityService>();
var app = builder.Build();
app.UseBrowserSecurity();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseExceptionHandler(handler =>
    handler.Run(async context =>
    {
        var error = context
            .Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()
            ?.Error;
        context.Response.StatusCode =
            error is UnauthorizedAccessException ? 401
            : error is InvalidOperationException or ArgumentException ? 400
            : 500;
        await Results
            .Problem(
                context.Response.StatusCode == 500 ? "Erro inesperado." : error?.Message,
                statusCode: context.Response.StatusCode
            )
            .ExecuteAsync(context);
    })
);
app.MapHealthChecks("/health");
app.MapPost(
    "/api/auth/register",
    async (RegisterRequest r, IdentityService service, HttpContext context, CancellationToken ct) =>
        Session(
            await service.RegisterAsync(r.Name, r.Email, r.Password, ct),
            context,
            app.Environment
        )
);
app.MapPost(
    "/api/auth/login",
    async (LoginRequest r, IdentityService service, HttpContext context, CancellationToken ct) =>
        Session(await service.LoginAsync(r.Email, r.Password, ct), context, app.Environment)
);
app.MapPost(
    "/api/auth/forgot-password",
    async (ForgotRequest r, IdentityService service, IConfiguration c, CancellationToken ct) =>
    {
        await service.RequestResetAsync(r.Email, c["FrontendUrl"]!, ct);
        return Results.Ok(
            new { message = "Se o e-mail estiver cadastrado, você receberá as instruções." }
        );
    }
);
app.MapPost(
    "/api/auth/reset-password",
    async (ResetRequest r, IdentityService service, CancellationToken ct) =>
    {
        await service.ResetPasswordAsync(r.Token, r.NewPassword, ct);
        return Results.Ok(new { message = "Senha alterada com sucesso." });
    }
);
app.MapGet(
        "/api/auth/session",
        (ClaimsPrincipal user) =>
            Results.Ok(
                new
                {
                    userId = user.FindFirstValue(ClaimTypes.NameIdentifier),
                    name = user.FindFirstValue("name"),
                    email = user.FindFirstValue(ClaimTypes.Email),
                }
            )
    )
    .RequireAuthorization();
app.MapPost(
    "/api/auth/logout",
    (HttpContext context) =>
    {
        context.Response.Cookies.Delete(
            BrowserSecurity.CookieName(app.Environment),
            BrowserSecurity.CookieOptions(app.Environment)
        );
        return Results.NoContent();
    }
);
Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "data"));
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    await db.Database.EnsureCreatedAsync();
}
app.Run();

static IResult Session(AuthResult result, HttpContext context, IHostEnvironment environment)
{
    context.Response.Cookies.Append(
        BrowserSecurity.CookieName(environment),
        result.Token,
        BrowserSecurity.CookieOptions(environment)
    );
    return Results.Ok(
        new
        {
            result.UserId,
            result.Name,
            result.Email,
        }
    );
}

public sealed record RegisterRequest(string Name, string Email, string Password);

public sealed record LoginRequest(string Email, string Password);

public sealed record ForgotRequest(string Email);

public sealed record ResetRequest(string Token, string NewPassword);
