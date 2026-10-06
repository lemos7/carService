using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using CarCare.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var passed = 0;
await CostChecks.SchemaAsync();
void Check(bool condition, string name)
{
    if (!condition)
        throw new InvalidOperationException($"FAIL: {name}");
    Console.WriteLine($"PASS: {name}");
    passed++;
}
void Reject(Action action, string name)
{
    try
    {
        action();
    }
    catch (Exception e)
        when (e is InvalidOperationException or SecurityTokenException or ArgumentException)
    {
        Check(true, name);
        return;
    }
    throw new InvalidOperationException($"FAIL: accepted {name}");
}
using var rsa = RSA.Create(3072);
using var oldRsa = RSA.Create(3072);
var values = new Dictionary<string, string?>
{
    ["Jwt:PrivateKey"] = rsa.ExportPkcs8PrivateKeyPem(),
    ["Jwt:PublicKey"] = rsa.ExportSubjectPublicKeyInfoPem(),
    ["Jwt:Issuer"] = "CarCare",
    ["Jwt:Audience"] = "CarCare.Web",
    ["InternalApiKey"] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
    ["FrontendUrl"] = "https://garage.test",
    ["Smtp:Host"] = "smtp.test",
    ["Smtp:Username"] = "mailer",
    ["Smtp:Password"] = "test-credential",
    ["Smtp:From"] = "sender@garage.test",
    ["Smtp:Port"] = "587",
};
IConfigurationRoot Config(string? key = null, string? value = null)
{
    var result = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    if (key is not null)
        result[key] = value;
    return result;
}
var production = new TestEnvironment();
SecurityConfiguration.LoadAndValidate(Config(), production, true);
Check(true, "valid production configuration");
foreach (
    var key in new[]
    {
        "Jwt:PrivateKey",
        "Jwt:PublicKey",
        "Smtp:Password",
        "Smtp:Host",
        "FrontendUrl",
    }
)
    Reject(
        () => SecurityConfiguration.LoadAndValidate(Config(key, ""), production, true),
        $"fail-fast missing {key}"
    );
Reject(
    () =>
        SecurityConfiguration.LoadAndValidate(
            Config("FrontendUrl", "http://garage.test"),
            production,
            true
        ),
    "production HTTP rejected"
);
Reject(
    () =>
        SecurityConfiguration.LoadAndValidate(
            Config("Jwt:PublicKeyFile", "nonexistent-secret-file"),
            production,
            true
        ),
    "missing secret file rejected"
);
Reject(
    () =>
        SecurityConfiguration.LoadAndValidate(
            Config("Jwt:PrivateKey", oldRsa.ExportPkcs8PrivateKeyPem()),
            production,
            true
        ),
    "mismatched RSA pair rejected"
);
using (var weak = RSA.Create(2048))
    Reject(
        () =>
            SecurityConfiguration.LoadAndValidate(
                Config("Jwt:PublicKey", weak.ExportSubjectPublicKeyInfoPem()),
                production,
                false
            ),
        "weak RSA key rejected"
    );
foreach (var weak in new[] { "", "development-internal-key", Convert.ToBase64String(new byte[32]) })
    Reject(
        () => SecurityConfiguration.ValidateInternalKey(weak),
        "missing/default/low-diversity internal secret rejected"
    );
Check(
    SecurityConfiguration.ValidInternalKey(values["InternalApiKey"]!, values["InternalApiKey"]!),
    "internal key accepted"
);
Check(
    !SecurityConfiguration.ValidInternalKey("", values["InternalApiKey"]!),
    "empty internal key denied"
);
Check(
    !SecurityConfiguration.ValidInternalKey("wrong", values["InternalApiKey"]!),
    "wrong internal key denied"
);

string Token(IConfiguration config, string audience = "CarCare.Web", DateTime? expires = null) =>
    new JwtSecurityTokenHandler().WriteToken(
        new JwtSecurityToken(
            "CarCare",
            audience,
            [new Claim("sub", Guid.NewGuid().ToString())],
            expires: expires ?? DateTime.UtcNow.AddMinutes(5),
            signingCredentials: new SigningCredentials(
                SecurityConfiguration.SigningKey(config),
                SecurityAlgorithms.RsaSha256
            )
        )
    );
var validator = new JwtSecurityTokenHandler();
validator.ValidateToken(Token(Config()), SecurityConfiguration.Validation(Config()), out _);
Check(true, "RSA token validates with public key");
Reject(
    () =>
        validator.ValidateToken(
            Token(Config(), "other"),
            SecurityConfiguration.Validation(Config()),
            out _
        ),
    "wrong audience rejected"
);
Reject(
    () =>
        validator.ValidateToken(
            Token(Config(), expires: DateTime.UtcNow.AddMinutes(-5)),
            SecurityConfiguration.Validation(Config()),
            out _
        ),
    "expired token rejected"
);
var previousSigner = Config("Jwt:PrivateKey", oldRsa.ExportPkcs8PrivateKeyPem());
var oldToken = Token(previousSigner);
validator.ValidateToken(
    oldToken,
    SecurityConfiguration.Validation(
        Config("Jwt:PreviousPublicKey", oldRsa.ExportSubjectPublicKeyInfoPem())
    ),
    out _
);
Check(true, "previous public key supports rotation overlap");
Reject(
    () => validator.ValidateToken(oldToken, SecurityConfiguration.Validation(Config()), out _),
    "retired signing key rejected"
);
var hmac = validator.WriteToken(
    new JwtSecurityToken(
        "CarCare",
        "CarCare.Web",
        expires: DateTime.UtcNow.AddMinutes(5),
        signingCredentials: new SigningCredentials(
            new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(32)),
            SecurityAlgorithms.HmacSha256
        )
    )
);
Reject(
    () => validator.ValidateToken(hmac, SecurityConfiguration.Validation(Config()), out _),
    "HMAC tokens rejected after migration"
);

var builder = WebApplication.CreateBuilder(
    new WebApplicationOptions { EnvironmentName = "Production" }
);
builder.Logging.ClearProviders();
builder.Configuration.AddInMemoryCollection(values);
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Services.AddAuthenticationLimits();
builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = SecurityConfiguration.Validation(builder.Configuration);
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = c =>
            {
                c.Token = c.Request.Cookies[BrowserSecurity.CookieName(builder.Environment)];
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();
await using var app = builder.Build();
app.UseBrowserSecurity();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapPost(
    "/api/auth/login",
    (HttpContext c) =>
    {
        c.Response.Cookies.Append(
            BrowserSecurity.CookieName(app.Environment),
            Token(Config()),
            BrowserSecurity.CookieOptions(app.Environment)
        );
        return Results.Ok();
    }
);
app.MapGet("/api/private", () => Results.Ok()).RequireAuthorization();
await app.StartAsync();
using var client = new HttpClient(new HttpClientHandler { UseCookies = false })
{
    BaseAddress = new Uri(app.Urls.Single()),
};
async Task<HttpResponseMessage> Post(string? origin = null, bool header = true)
{
    using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
    if (header)
        request.Headers.Add("X-CarCare-Request", "1");
    if (origin is not null)
        request.Headers.Add("Origin", origin);
    return await client.SendAsync(request);
}
using (var response = await Post("https://attacker.test"))
    Check(response.StatusCode == HttpStatusCode.Forbidden, "cross-origin POST denied");
using (var response = await Post("https://garage.test", false))
    Check(response.StatusCode == HttpStatusCode.Forbidden, "missing CSRF header denied");
using (var response = await Post("https://garage.test"))
{
    Check(response.StatusCode == HttpStatusCode.OK, "same-origin POST accepted");
    var cookie = response.Headers.GetValues("Set-Cookie").Single();
    Check(
        cookie.Contains("__Host-carcare.session")
            && cookie.Contains("secure", StringComparison.OrdinalIgnoreCase)
            && cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase)
            && cookie.Contains("samesite=strict", StringComparison.OrdinalIgnoreCase),
        "production cookie flags"
    );
    Check(response.Headers.CacheControl?.NoStore == true, "session responses are not cacheable");
    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/private");
    request.Headers.Add("Cookie", cookie.Split(';')[0]);
    using var authenticated = await client.SendAsync(request);
    Check(authenticated.StatusCode == HttpStatusCode.OK, "cookie authenticates protected endpoint");
}
using (var response = await client.GetAsync("/api/private"))
    Check(response.StatusCode == HttpStatusCode.Unauthorized, "anonymous access denied");
for (var i = 0; i < 59; i++)
{
    using var response = await Post();
}
using (var response = await Post())
    Check((int)response.StatusCode == 429, "authentication rate limit enforced");
using (var request = new HttpRequestMessage(HttpMethod.Post, "/API/auth/Login/"))
{
    request.Headers.Add("X-CarCare-Request", "1");
    using var response = await client.SendAsync(request);
    Check(
        (int)response.StatusCode == 429,
        "rate limit cannot be bypassed by case or trailing slash"
    );
}
await app.StopAsync();
Console.WriteLine($"Completed {passed} security checks.");
if (args.Length == 2 && args[0] == "--api-smoke")
    await ApiSmoke.Run(args[1]);
if (args.Length == 2 && args[0] == "--gateway-smoke")
    await GatewaySmoke.Run(args[1]);

sealed class TestEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Production";
    public string ApplicationName { get; set; } = "SecurityChecks";
    public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
