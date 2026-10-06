namespace CarCare.Identity.Domain;

public sealed class User
{
    private User() { }

    public User(string name, string email, string passwordHash)
    {
        Id = Guid.NewGuid();
        Name = name.Trim();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }
    public ICollection<PasswordReset> PasswordResets { get; private set; } = [];

    public void ChangePassword(string passwordHash) => PasswordHash = passwordHash;
}

public sealed class PasswordReset
{
    private PasswordReset() { }

    public PasswordReset(Guid userId, string tokenHash, DateTime expiresAtUtc)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAtUtc = expiresAtUtc;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? UsedAtUtc { get; private set; }
    public User User { get; private set; } = null!;

    public bool IsValid(DateTime now) => UsedAtUtc is null && ExpiresAtUtc > now;

    public void MarkUsed() => UsedAtUtc = DateTime.UtcNow;
}
