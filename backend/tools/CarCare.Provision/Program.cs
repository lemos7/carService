using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;

var testTls = args.Length == 2 && args[0] == "--test-tls";
if (args.Length != 1 && !testTls)
{
    Console.Error.WriteLine(
        "Usage: dotnet run --project backend/tools/CarCare.Provision -- <new-secret-directory>"
    );
    return 1;
}
var target = Path.GetFullPath(testTls ? args[1] : args[0]);
if (Directory.Exists(target))
{
    Console.Error.WriteLine(
        "Refusing to overwrite an existing directory. Use a new directory for rotation."
    );
    return 1;
}
if (OperatingSystem.IsWindows())
{
    var security = new DirectorySecurity();
    security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
    security.AddAccessRule(
        new FileSystemAccessRule(
            WindowsIdentity.GetCurrent().User!,
            FileSystemRights.FullControl,
            InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
            PropagationFlags.None,
            AccessControlType.Allow
        )
    );
    new DirectoryInfo(target).Create(security);
}
else
    Directory.CreateDirectory(
        target,
        UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
    );

void WriteSecret(string name, string value)
{
    var path = Path.Combine(target, name);
    var options = new FileStreamOptions
    {
        Mode = FileMode.CreateNew,
        Access = FileAccess.Write,
        Share = FileShare.None,
    };
    if (!OperatingSystem.IsWindows())
        options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
    using var stream = new FileStream(path, options);
    using var writer = new StreamWriter(stream);
    writer.Write(value);
}
using var rsa = RSA.Create(3072);
if (testTls)
{
    var request = new CertificateRequest(
        "CN=localhost",
        rsa,
        HashAlgorithmName.SHA256,
        RSASignaturePadding.Pkcs1
    );
    var names = new SubjectAlternativeNameBuilder();
    names.AddDnsName("localhost");
    request.CertificateExtensions.Add(names.Build());
    using var certificate = request.CreateSelfSigned(
        DateTimeOffset.UtcNow.AddMinutes(-1),
        DateTimeOffset.UtcNow.AddDays(1)
    );
    WriteSecret("fullchain.pem", certificate.ExportCertificatePem());
    WriteSecret("privkey.pem", rsa.ExportPkcs8PrivateKeyPem());
    Console.WriteLine(
        "Generated a one-day localhost certificate for isolated TLS tests only; not for public deployment."
    );
    return 0;
}
WriteSecret("jwt-private.pem", rsa.ExportPkcs8PrivateKeyPem());
WriteSecret("jwt-public.pem", rsa.ExportSubjectPublicKeyInfoPem());
WriteSecret("internal-api-key", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));

// Empty until the operator supplies an actual SMTP credential. Production rejects this file.
WriteSecret("smtp-password", "");
Console.WriteLine(
    "Generated RSA-3072 key pair and random 256-bit internal key with restricted permissions."
);
Console.WriteLine(
    "No secret values were printed. Fill smtp-password securely before production deployment."
);
return 0;
