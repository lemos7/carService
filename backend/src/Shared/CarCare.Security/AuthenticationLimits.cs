using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace CarCare.Security;

public static class AuthenticationLimits
{
    public static void AddAuthenticationLimits(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var path = (context.Request.Path.Value ?? "").TrimEnd('/').ToLowerInvariant();
                // Four fixed partitions, never keyed by attacker-controlled arbitrary URLs/headers.
                if (
                    path
                    is not (
                        "/api/auth/login"
                        or "/api/auth/register"
                        or "/api/auth/forgot-password"
                        or "/api/auth/reset-password"
                    )
                )
                    return RateLimitPartition.GetNoLimiter("other");
                return RateLimitPartition.GetFixedWindowLimiter(
                    path,
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true,
                    }
                );
            });
        });
}
