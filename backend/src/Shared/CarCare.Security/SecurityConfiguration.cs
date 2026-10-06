using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace CarCare.Security;

public static class SecurityConfiguration
{
    public static void LoadAndValidate(
        IConfiguration config,
        IHostEnvironment environment,
        bool identity
    )
    {
        LoadSecret(config, "Jwt:PublicKey", required: true);
        LoadSecret(config, "Jwt:PreviousPublicKey", required: false);
        if (identity)
            LoadSecret(config, "Jwt:PrivateKey", required: true);
        else
        {
            LoadSecret(config, "InternalApiKey", required: true);
            ValidateInternalKey(config["InternalApiKey"]);
        }

        using var publicRsa = ImportRsa(config["Jwt:PublicKey"]!);
        if (identity)
        {
            using var privateRsa = ImportRsa(config["Jwt:PrivateKey"]!);
            try
            {
                privateRsa.ExportParameters(true);
                if (
                    !publicRsa
                        .ExportSubjectPublicKeyInfo()
                        .SequenceEqual(privateRsa.ExportSubjectPublicKeyInfo())
                )
                    throw new InvalidOperationException("JWT private/public keys do not match.");
            }
            catch (CryptographicException)
            {
                throw new InvalidOperationException(
                    "Jwt:PrivateKey must contain an RSA private key."
                );
            }
        }
        if (!string.IsNullOrWhiteSpace(config["Jwt:PreviousPublicKey"]))
        {
            using var previous = ImportRsa(config["Jwt:PreviousPublicKey"]!);
        }
        foreach (var name in new[] { "Jwt:Issuer", "Jwt:Audience", "FrontendUrl" })
            if (string.IsNullOrWhiteSpace(config[name]))
                throw new InvalidOperationException($"Required configuration missing: {name}.");
        if (
            !Uri.TryCreate(config["FrontendUrl"], UriKind.Absolute, out var origin)
            || origin.AbsolutePath != "/"
            || origin.Query.Length != 0
            || origin.Fragment.Length != 0
            || origin.UserInfo.Length != 0
            || (
                origin.Scheme != "https"
                && !(environment.IsDevelopment() && origin.Scheme == "http" && origin.IsLoopback)
            )
        )
            throw new InvalidOperationException(
                "FrontendUrl must be an HTTPS origin (HTTP loopback only in Development)."
            );

        if (identity)
        {
            LoadSecret(config, "Smtp:Password", required: !environment.IsDevelopment());
            if (!environment.IsDevelopment())
            {
                foreach (var name in new[] { "Smtp:Host", "Smtp:Username", "Smtp:From" })
                    if (
                        string.IsNullOrWhiteSpace(config[name])
                        || config[name]!.Contains("example", StringComparison.OrdinalIgnoreCase)
                    )
                        throw new InvalidOperationException(
                            $"Production requires valid configuration: {name}."
                        );
                if (!int.TryParse(config["Smtp:Port"], out var port) || port < 1 || port > 65535)
                    throw new InvalidOperationException("Smtp:Port must be between 1 and 65535.");
                _ = new System.Net.Mail.MailAddress(config["Smtp:From"]!);
            }
        }
    }

    private static void LoadSecret(IConfiguration config, string name, bool required)
    {
        var file = config[$"{name}File"];
        if (!string.IsNullOrWhiteSpace(file))
        {
            try
            {
                config[name] = File.ReadAllText(file).Trim();
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                throw new InvalidOperationException($"Cannot read secret file for {name}.");
            }
        }
        if (required && string.IsNullOrWhiteSpace(config[name]))
            throw new InvalidOperationException(
                $"Required secret missing: {name}. Configure {name}File."
            );
    }

    public static void ValidateInternalKey(string? value)
    {
        try
        {
            var bytes = Convert.FromBase64String(value ?? "");
            if (bytes.Length < 32 || bytes.Distinct().Count() < 16)
                throw new FormatException();
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "InternalApiKey must be a randomly generated Base64 secret of at least 32 bytes."
            );
        }
    }

    private static RSA ImportRsa(string pem)
    {
        var rsa = RSA.Create();
        try
        {
            rsa.ImportFromPem(pem);
            if (rsa.KeySize < 3072)
                throw new CryptographicException();
            return rsa;
        }
        catch (Exception ex) when (ex is CryptographicException or ArgumentException)
        {
            rsa.Dispose();
            throw new InvalidOperationException(
                "JWT requires valid RSA PEM keys with at least 3072 bits."
            );
        }
    }

    public static RsaSecurityKey SigningKey(IConfiguration config)
    {
        using var rsa = ImportRsa(config["Jwt:PrivateKey"]!);
        return new RsaSecurityKey(rsa.ExportParameters(true)) { KeyId = KeyId(rsa) };
    }

    private static string KeyId(RSA rsa) =>
        Convert.ToHexString(SHA256.HashData(rsa.ExportSubjectPublicKeyInfo()));

    public static TokenValidationParameters Validation(IConfiguration config)
    {
        var keys = new List<SecurityKey>();
        foreach (var name in new[] { "Jwt:PublicKey", "Jwt:PreviousPublicKey" })
        {
            if (string.IsNullOrWhiteSpace(config[name]))
                continue;
            using var rsa = ImportRsa(config[name]!);
            keys.Add(new RsaSecurityKey(rsa.ExportParameters(false)) { KeyId = KeyId(rsa) });
        }
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKeys = keys,
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
        };
    }

    public static bool ValidInternalKey(string supplied, string expected) =>
        !string.IsNullOrWhiteSpace(supplied)
        && CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(supplied)),
            SHA256.HashData(Encoding.UTF8.GetBytes(expected))
        );
}
