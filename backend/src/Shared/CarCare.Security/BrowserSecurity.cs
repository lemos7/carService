using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace CarCare.Security;

public static class BrowserSecurity
{
    public static string CookieName(IHostEnvironment environment) =>
        environment.IsDevelopment() ? "carcare.session" : "__Host-carcare.session";

    public static CookieOptions CookieOptions(IHostEnvironment environment) =>
        new()
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/",
            MaxAge = TimeSpan.FromHours(1),
            IsEssential = true,
        };

    public static void UseBrowserSecurity(this WebApplication app)
    {
        var expectedOrigin = new Uri(app.Configuration["FrontendUrl"]!).GetLeftPart(
            UriPartial.Authority
        );
        app.Use(
            async (context, next) =>
            {
                context.Response.Headers.CacheControl = "no-store";
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
                context.Response.Headers["Referrer-Policy"] = "no-referrer";
                // Cookie authentication requires CSRF protection. Angular supplies a non-simple header;
                // cross-origin requests cannot add it without an allowed CORS preflight (no CORS enabled).
                if (
                    context.Request.Path.StartsWithSegments("/api")
                    && !HttpMethods.IsGet(context.Request.Method)
                    && !HttpMethods.IsHead(context.Request.Method)
                )
                {
                    var origin = context.Request.Headers.Origin.ToString();
                    if (
                        context.Request.Headers["X-CarCare-Request"] != "1"
                        || (
                            !string.IsNullOrEmpty(origin)
                            && !string.Equals(
                                origin,
                                expectedOrigin,
                                StringComparison.OrdinalIgnoreCase
                            )
                        )
                        || context.Request.Headers["Sec-Fetch-Site"] == "cross-site"
                    )
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return;
                    }
                }
                await next(context);
            }
        );
    }
}
