using System.Security.Cryptography;
using System.Text;
using CarCare.Identity.Domain;

namespace CarCare.Identity.Application;

public interface IIdentityRepository
{
    Task<User?> FindByEmailAsync(string email, CancellationToken ct);
    Task AddAsync(User user, CancellationToken ct);
    Task AddResetAsync(PasswordReset reset, CancellationToken ct);
    Task<PasswordReset?> FindResetAsync(string tokenHash, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
}

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string hash, string password);
}

public interface ITokenProvider
{
    string Create(User user);
}

public interface IEmailSender
{
    Task SendPasswordResetAsync(string email, string name, string resetUrl, CancellationToken ct);
}

public sealed record AuthResult(Guid UserId, string Name, string Email, string Token);

public sealed class IdentityService(
    IIdentityRepository repository,
    IPasswordService passwords,
    ITokenProvider tokens,
    IEmailSender emailSender
)
{
    public async Task<AuthResult> RegisterAsync(
        string name,
        string email,
        string password,
        CancellationToken ct
    )
    {
        if (
            string.IsNullOrWhiteSpace(name)
            || string.IsNullOrWhiteSpace(email)
            || password.Length < 8
        )
            throw new ArgumentException(
                "Informe nome, e-mail e uma senha com pelo menos 8 caracteres."
            );
        if (await repository.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct) is not null)
            throw new InvalidOperationException("Este e-mail já está cadastrado.");
        var user = new User(name, email, passwords.Hash(password));
        await repository.AddAsync(user, ct);
        await repository.SaveAsync(ct);
        return new(user.Id, user.Name, user.Email, tokens.Create(user));
    }

    public async Task<AuthResult> LoginAsync(string email, string password, CancellationToken ct)
    {
        var user = await repository.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
        if (user is null || !passwords.Verify(user.PasswordHash, password))
            throw new UnauthorizedAccessException("E-mail ou senha inválidos.");
        return new(user.Id, user.Name, user.Email, tokens.Create(user));
    }

    public async Task RequestResetAsync(string email, string frontendUrl, CancellationToken ct)
    {
        var user = await repository.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
        if (user is null)
            return;
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        await repository.AddResetAsync(
            new(user.Id, Sha256(rawToken), DateTime.UtcNow.AddHours(1)),
            ct
        );
        await repository.SaveAsync(ct);
        await emailSender.SendPasswordResetAsync(
            user.Email,
            user.Name,
            $"{frontendUrl.TrimEnd('/')}/redefinir-senha?token={rawToken}",
            ct
        );
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct)
    {
        if (newPassword.Length < 8)
            throw new ArgumentException("A senha deve ter pelo menos 8 caracteres.");
        var reset = await repository.FindResetAsync(Sha256(token), ct);
        if (reset is null || !reset.IsValid(DateTime.UtcNow))
            throw new InvalidOperationException("Link inválido ou expirado.");
        reset.User.ChangePassword(passwords.Hash(newPassword));
        reset.MarkUsed();
        await repository.SaveAsync(ct);
    }

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
