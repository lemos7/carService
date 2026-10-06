using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

internal static class GatewaySmoke
{
    public static async Task Run(string certificatePath)
    {
        using var pinned = X509CertificateLoader.LoadCertificateFromFile(
            Path.GetFullPath(certificatePath)
        );
        using var handler = new HttpClientHandler
        {
            AllowAutoRedirect = false,
            ServerCertificateCustomValidationCallback = (request, certificate, _, _) =>
                request.RequestUri?.Host == "localhost"
                && certificate is not null
                && certificate.RawData.SequenceEqual(pinned.RawData),
        };
        using var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://localhost:14443"),
            Timeout = TimeSpan.FromSeconds(15),
        };
        client.DefaultRequestHeaders.Add("Origin", "https://localhost:14443");
        client.DefaultRequestHeaders.Add("X-CarCare-Request", "1");
        void Check(bool condition, string message)
        {
            if (!condition)
                throw new InvalidOperationException($"GATEWAY FAIL: {message}");
            Console.WriteLine($"GATEWAY PASS: {message}");
        }
        using var page = await client.GetAsync("/");
        Check(page.IsSuccessStatusCode, "TLS serves SPA with pinned test certificate");
        Check(
            page.Headers.Contains("Strict-Transport-Security")
                && page.Headers.Contains("Content-Security-Policy"),
            "HSTS and CSP present"
        );
        var html = await page.Content.ReadAsStringAsync();
        Check(!html.Contains("onload="), "CSS loading compatible with script CSP");
        using var redirect = await client.GetAsync("http://localhost:14080/");
        Check(
            (int)redirect.StatusCode == 308 && redirect.Headers.Location?.Scheme == "https",
            "HTTP redirects to HTTPS"
        );
        using var internalRoute = await client.GetAsync("/internal/odometer");
        Check(
            internalRoute.StatusCode == HttpStatusCode.NotFound,
            "gateway blocks internal routes"
        );
        using var anonymous = await client.GetAsync("/api/vehicles/");
        Check(
            anonymous.StatusCode == HttpStatusCode.Unauthorized,
            "private API denies anonymous request through proxy"
        );
        using var register = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                name = "Gateway check",
                email = $"gateway-{Guid.NewGuid():N}@garage.test",
                password = "Only-test-password-123!",
            }
        );
        register.EnsureSuccessStatusCode();
        var json = await register.Content.ReadFromJsonAsync<JsonElement>();
        Check(
            !json.TryGetProperty("token", out _),
            "gateway register response does not expose token"
        );
        var cookie = register.Headers.GetValues("Set-Cookie").Single();
        Check(
            cookie.Contains("__Host-carcare.session")
                && cookie.Contains("secure", StringComparison.OrdinalIgnoreCase)
                && cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase),
            "protected cookie survives reverse proxy"
        );
        using var session = await client.GetAsync("/api/auth/session");
        Check(session.IsSuccessStatusCode, "HTTPS session restored from secure cookie");
        using var crossSite = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        crossSite.Headers.Add("Origin", "https://attacker.test");
        using var denied = await client.SendAsync(crossSite);
        Check(denied.StatusCode == HttpStatusCode.Forbidden, "CSRF rejected through proxy");
        using var logout = await client.PostAsJsonAsync("/api/auth/logout", new { });
        Check(logout.IsSuccessStatusCode, "HTTPS logout succeeds");
        using var ended = await client.GetAsync("/api/auth/session");
        Check(
            ended.StatusCode == HttpStatusCode.Unauthorized,
            "cookie container removes session on logout"
        );
        var limited = false;
        for (var i = 0; i < 8; i++)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new { email = "missing@garage.test", password = "invalid-test-password" }
            );
            if ((int)response.StatusCode == 429)
            {
                limited = true;
                break;
            }
        }
        Check(limited, "Nginx IP rate limit returns 429");
    }
}
