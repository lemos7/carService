using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json;

internal static class ApiSmoke
{
    public static async Task Run(string backendPath)
    {
        var root = Directory.CreateTempSubdirectory("carcare-security-").FullName;
        var processes = new List<Process>();
        var startupErrors = new System.Collections.Concurrent.ConcurrentQueue<string>();
        using var rsa = RSA.Create(3072);
        var internalKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        int Port()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }
        var identityPort = Port();
        var vehiclesPort = Port();
        var maintenancePort = Port();
        void Start(string name, int port)
        {
            var directory = Directory.CreateDirectory(Path.Combine(root, name)).FullName;
            var dll = Path.GetFullPath(
                Path.Combine(
                    backendPath,
                    "src",
                    name,
                    $"CarCare.{name}.Api",
                    "bin",
                    "Debug",
                    "net10.0",
                    $"CarCare.{name}.Api.dll"
                )
            );
            if (!File.Exists(dll))
                throw new InvalidOperationException(
                    "Build backend/CarCare.sln before API smoke checks."
                );
            var start = new ProcessStartInfo("dotnet")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = directory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            start.ArgumentList.Add(dll);
            start.ArgumentList.Add("--urls");
            start.ArgumentList.Add($"http://127.0.0.1:{port}");
            start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
            start.Environment["FrontendUrl"] = "https://garage.test";
            start.Environment["Jwt__Issuer"] = "CarCare";
            start.Environment["Jwt__Audience"] = "CarCare.Web";
            start.Environment["Jwt__PublicKey"] = rsa.ExportSubjectPublicKeyInfoPem();
            if (name == "Identity")
                start.Environment["Jwt__PrivateKey"] = rsa.ExportPkcs8PrivateKeyPem();
            start.Environment["InternalApiKey"] = internalKey;
            start.Environment["Smtp__Host"] = "smtp.test";
            start.Environment["Smtp__Username"] = "test";
            start.Environment["Smtp__Password"] = "test-only";
            start.Environment["Smtp__From"] = "test@garage.test";
            start.Environment["Smtp__Port"] = "587";
            start.Environment["ConnectionStrings__Database"] =
                $"Data Source={Path.Combine(directory, "test.db")}";
            start.Environment["Services__Vehicles"] = $"http://127.0.0.1:{vehiclesPort}";
            start.Environment["Services__Maintenance"] = $"http://127.0.0.1:{maintenancePort}";
            start.Environment["Logging__LogLevel__Default"] = "Warning";
            var process = Process.Start(start)!;
            process.ErrorDataReceived += (_, e) =>
            {
                if (e.Data is not null)
                    startupErrors.Enqueue(name + ": " + e.Data);
            };
            // Drain without printing HTTP logs or credentials.
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            processes.Add(process);
        }
        static void Assert(bool condition, string description)
        {
            if (!condition)
                throw new InvalidOperationException($"API FAIL: {description}");
            Console.WriteLine($"API PASS: {description}");
        }
        using var http = new HttpClient(new HttpClientHandler { UseCookies = false })
        {
            Timeout = TimeSpan.FromSeconds(15),
        };
        http.DefaultRequestHeaders.Add("X-CarCare-Request", "1");
        http.DefaultRequestHeaders.Add("Origin", "https://garage.test");
        try
        {
            Start("Identity", identityPort);
            Start("Vehicles", vehiclesPort);
            Start("Maintenance", maintenancePort);
            foreach (var port in new[] { identityPort, vehiclesPort, maintenancePort })
            {
                var ready = false;
                for (var attempt = 0; attempt < 80; attempt++)
                {
                    if (processes.Any(p => p.HasExited))
                        throw new InvalidOperationException(
                            "An API exited during startup. "
                                + string.Join(Environment.NewLine, startupErrors)
                        );
                    try
                    {
                        using var health = await http.GetAsync($"http://127.0.0.1:{port}/health");
                        ready = health.IsSuccessStatusCode;
                    }
                    catch (HttpRequestException) { }
                    if (ready)
                        break;
                    await Task.Delay(250);
                }
                Assert(ready, $"API starts with production security settings on port {port}");
            }
            var identity = $"http://127.0.0.1:{identityPort}";
            var vehicles = $"http://127.0.0.1:{vehiclesPort}";
            var maintenance = $"http://127.0.0.1:{maintenancePort}";
            using var anonymous = await http.GetAsync(vehicles + "/api/vehicles/");
            Assert(
                anonymous.StatusCode == HttpStatusCode.Unauthorized,
                "anonymous vehicle access denied"
            );
            using var register = await http.PostAsJsonAsync(
                identity + "/api/auth/register",
                new
                {
                    name = "Smoke",
                    email = "smoke@garage.test",
                    password = "Smoke-test-password-123!",
                }
            );
            register.EnsureSuccessStatusCode();
            var user = await register.Content.ReadFromJsonAsync<JsonElement>();
            Assert(!user.TryGetProperty("token", out _), "register never returns JWT in JSON");
            var cookie = register.Headers.GetValues("Set-Cookie").Single();
            Assert(
                cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase)
                    && cookie.Contains("secure", StringComparison.OrdinalIgnoreCase),
                "actual Identity cookie is HttpOnly/Secure"
            );
            http.DefaultRequestHeaders.Add("Cookie", cookie.Split(';')[0]);
            using var session = await http.GetAsync(identity + "/api/auth/session");
            Assert(session.IsSuccessStatusCode, "session restored via cookie");
            using var create = await http.PostAsJsonAsync(
                vehicles + "/api/vehicles/",
                new
                {
                    year = 2020,
                    model = "Smoke",
                    licensePlate = "TST1234",
                    color = "White",
                    engine = "2.0",
                    odometerKm = 1000,
                }
            );
            create.EnsureSuccessStatusCode();
            var vehicle = await create.Content.ReadFromJsonAsync<JsonElement>();
            var vehicleId = vehicle.GetProperty("id").GetGuid();
            var userId = user.GetProperty("userId").GetGuid();

            using (var internalVehicleRequest = new HttpRequestMessage(
                HttpMethod.Get,
                vehicles + $"/internal/vehicles/{vehicleId}?userId={userId}"
            ))
            {
                internalVehicleRequest.Headers.Add("X-Internal-Key", internalKey);
                using var internalVehicle = await http.SendAsync(internalVehicleRequest);
                internalVehicle.EnsureSuccessStatusCode();
                var internalData = await internalVehicle.Content.ReadFromJsonAsync<JsonElement>();
                Assert(
                    internalData.GetProperty("id").GetGuid() == vehicleId
                        && internalData.GetProperty("model").GetString() == "Smoke",
                    "internal vehicle report lookup returns the owner's vehicle"
                );
            }
            using (var wrongOwnerRequest = new HttpRequestMessage(
                HttpMethod.Get,
                vehicles + $"/internal/vehicles/{vehicleId}?userId={Guid.NewGuid()}"
            ))
            {
                wrongOwnerRequest.Headers.Add("X-Internal-Key", internalKey);
                using var wrongOwner = await http.SendAsync(wrongOwnerRequest);
                Assert(
                    wrongOwner.StatusCode == HttpStatusCode.NotFound,
                    "internal vehicle report lookup hides another user's vehicle"
                );
            }
            using (var unknownVehicleRequest = new HttpRequestMessage(
                HttpMethod.Get,
                vehicles + $"/internal/vehicles/{Guid.NewGuid()}?userId={userId}"
            ))
            {
                unknownVehicleRequest.Headers.Add("X-Internal-Key", internalKey);
                using var unknownVehicle = await http.SendAsync(unknownVehicleRequest);
                Assert(
                    unknownVehicle.StatusCode == HttpStatusCode.NotFound,
                    "internal vehicle report lookup returns 404 for unknown vehicle"
                );
            }
            using var missingInternalKey = await http.GetAsync(
                vehicles + $"/internal/vehicles/{vehicleId}?userId={userId}"
            );
            Assert(
                missingInternalKey.StatusCode == HttpStatusCode.Unauthorized,
                "internal vehicle report lookup rejects missing key"
            );
            using var fuel = await http.PostAsJsonAsync(
                maintenance + "/api/maintenance/fuel",
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
            var result = await fuel.Content.ReadFromJsonAsync<JsonElement>();
            Assert(
                result.GetProperty("kmPerLiter").GetDecimal() == 10,
                "authenticated fuel operation and internal odometer synchronization"
            );
            using var list = await http.GetAsync(vehicles + "/api/vehicles/");
            var records = await list.Content.ReadFromJsonAsync<JsonElement>();
            Assert(
                records[0].GetProperty("odometerKm").GetInt32() == 1100,
                "vehicle mileage updated across APIs"
            );
            await CostChecks.ApiAsync(http, maintenance, vehicleId);
            using (var otherUser = new HttpClient(new HttpClientHandler { UseCookies = false }))
            {
                otherUser.DefaultRequestHeaders.Add("X-CarCare-Request", "1");
                otherUser.DefaultRequestHeaders.Add("Origin", "https://garage.test");
                using var otherRegistration = await otherUser.PostAsJsonAsync(
                    identity + "/api/auth/register",
                    new
                    {
                        name = "Other",
                        email = "other@garage.test",
                        password = "Other-test-password-123!",
                    }
                );
                otherRegistration.EnsureSuccessStatusCode();
                otherUser.DefaultRequestHeaders.Add(
                    "Cookie",
                    otherRegistration.Headers.GetValues("Set-Cookie").Single().Split(';')[0]
                );
                foreach (
                    var path in new[]
                    {
                        $"/api/maintenance/fuel/{vehicleId}",
                        $"/api/maintenance/history/{vehicleId}",
                    }
                )
                {
                    using var isolated = await otherUser.GetAsync(maintenance + path);
                    isolated.EnsureSuccessStatusCode();
                    Assert(
                        (await isolated.Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength()
                            == 0,
                        "cost history is not exposed to another user"
                    );
                }
                using var isolatedReport = await otherUser.GetAsync(
                    maintenance + $"/api/maintenance/reports/vehicles/{vehicleId}"
                );
                Assert(
                    isolatedReport.StatusCode == HttpStatusCode.NotFound,
                    "vehicle report does not reveal another user's vehicle"
                );
            }
            using var unauthorized = await http.PutAsJsonAsync(
                vehicles + "/internal/odometer",
                new
                {
                    userId = user.GetProperty("userId").GetGuid(),
                    vehicleId,
                    odometerKm = 1200,
                }
            );
            Assert(
                unauthorized.StatusCode == HttpStatusCode.Unauthorized,
                "internal endpoint rejects missing key"
            );
            using var logout = await http.PostAsJsonAsync(identity + "/api/auth/logout", new { });
            Assert(
                logout.IsSuccessStatusCode
                    && logout
                        .Headers.GetValues("Set-Cookie")
                        .Single()
                        .Contains("expires=", StringComparison.OrdinalIgnoreCase),
                "logout expires browser cookie"
            );
            http.DefaultRequestHeaders.Remove("Cookie");
            using var ended = await http.GetAsync(identity + "/api/auth/session");
            Assert(
                ended.StatusCode == HttpStatusCode.Unauthorized,
                "session absent after cookie removal"
            );
        }
        finally
        {
            foreach (var process in processes)
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                    await process.WaitForExitAsync();
                }
                process.Dispose();
            }
            // Only the unique directory created above is removed; no existing databases are touched.
            Directory.Delete(root, recursive: true);
        }
    }
}
