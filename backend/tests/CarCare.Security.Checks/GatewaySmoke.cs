using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using UglyToad.PdfPig;

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
        using var vehicleResponse = await client.PostAsJsonAsync(
            "/api/vehicles/",
            new
            {
                year = 2020,
                model = "Gateway Vectra",
                licensePlate = $"GW{Random.Shared.Next(10000, 99999)}",
                color = "Preto",
                engine = "2.0",
                odometerKm = 1000,
            }
        );
        vehicleResponse.EnsureSuccessStatusCode();
        var vehicle = await vehicleResponse.Content.ReadFromJsonAsync<JsonElement>();
        var vehicleId = vehicle.GetProperty("id").GetGuid();
        using var fuel = await client.PostAsJsonAsync(
            "/api/maintenance/fuel",
            new
            {
                vehicleId,
                previousOdometerKm = 1000,
                odometerKm = 1100,
                liters = 10,
                totalCost = 60,
                fueledOn = "2026-01-15",
            }
        );
        fuel.EnsureSuccessStatusCode();
        using var serviceForm = new MultipartFormDataContent
        {
            { new StringContent(vehicleId.ToString()), "vehicleId" },
            { new StringContent("1100"), "odometerKm" },
            { new StringContent(string.Empty), "details" },
            { new StringContent("2026-01-15"), "serviceDate" },
            { new StringContent("250.75"), "totalCost" },
            { new StringContent("Preventiva"), "category" },
        };
        using var service = await client.PostAsync("/api/maintenance/history", serviceForm);
        service.EnsureSuccessStatusCode();
        using var report = await client.GetAsync(
            $"/api/maintenance/reports/vehicles/{vehicleId}"
        );
        report.EnsureSuccessStatusCode();
        var reportBytes = await report.Content.ReadAsByteArrayAsync();
        using (var pdf = PdfDocument.Open(reportBytes))
        {
            var reportText = string.Join(" ", pdf.GetPages().Select(x => x.Text));
            Check(
                reportText.Contains("Gateway Vectra")
                    && reportText.Contains("Abastecimentos")
                    && reportText.Contains("Manutenções realizadas")
                    && reportText.Contains("R$ 60,00")
                    && reportText.Contains("R$ 250,75"),
                "vehicle report downloads through gateway with expected histories and totals"
            );
        }
        using (var otherHandler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (request, certificate, _, _) =>
                request.RequestUri?.Host == "localhost"
                && certificate is not null
                && certificate.RawData.SequenceEqual(pinned.RawData),
        })
        using (var other = new HttpClient(otherHandler) { BaseAddress = client.BaseAddress })
        {
            other.DefaultRequestHeaders.Add("Origin", "https://localhost:14443");
            other.DefaultRequestHeaders.Add("X-CarCare-Request", "1");
            using var otherRegistration = await other.PostAsJsonAsync(
                "/api/auth/register",
                new
                {
                    name = "Gateway other",
                    email = $"gateway-other-{Guid.NewGuid():N}@garage.test",
                    password = "Only-test-password-123!",
                }
            );
            otherRegistration.EnsureSuccessStatusCode();
            using var isolated = await other.GetAsync(
                $"/api/maintenance/reports/vehicles/{vehicleId}"
            );
            Check(
                isolated.StatusCode == HttpStatusCode.NotFound,
                "vehicle report hides another user's vehicle through gateway"
            );
        }
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
