using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using CarCare.Identity.Application;
using CarCare.Identity.Domain;
using CarCare.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CarCare.Identity.Persistence;

public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<PasswordReset> PasswordResets => Set<PasswordReset>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasKey(x => x.Id);
        b.Entity<User>().HasIndex(x => x.Email).IsUnique();
        b.Entity<User>().Property(x => x.Name).HasMaxLength(120);
        b.Entity<User>().Property(x => x.Email).HasMaxLength(254);
        b.Entity<PasswordReset>().HasKey(x => x.Id);
        b.Entity<PasswordReset>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<PasswordReset>()
            .HasOne(x => x.User)
            .WithMany(x => x.PasswordResets)
            .HasForeignKey(x => x.UserId);
    }
}

public sealed class IdentityRepository(IdentityDbContext db) : IIdentityRepository
{
    public Task<User?> FindByEmailAsync(string email, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

    public async Task AddAsync(User user, CancellationToken ct) =>
        await db.Users.AddAsync(user, ct);

    public async Task AddResetAsync(PasswordReset reset, CancellationToken ct) =>
        await db.PasswordResets.AddAsync(reset, ct);

    public Task<PasswordReset?> FindResetAsync(string tokenHash, CancellationToken ct) =>
        db
            .PasswordResets.Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

    public Task SaveAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
}

public sealed class PasswordService : IPasswordService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(null!, password);

    public bool Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(null!, hash, password) != PasswordVerificationResult.Failed;
}

public sealed class JwtTokenProvider(IConfiguration config) : ITokenProvider
{
    public string Create(User user)
    {
        var credentials = new SigningCredentials(
            SecurityConfiguration.SigningKey(config),
            SecurityAlgorithms.RsaSha256
        );
        var token = new JwtSecurityToken(
            config["Jwt:Issuer"],
            config["Jwt:Audience"],
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("name", user.Name),
            ],
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed class SmtpEmailSender(
    IConfiguration config,
    ILogger<SmtpEmailSender> logger,
    IHostEnvironment environment
) : IEmailSender
{
    public async Task SendPasswordResetAsync(
        string email,
        string name,
        string resetUrl,
        CancellationToken ct
    )
    {
        var host = config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            if (!environment.IsDevelopment())
                throw new InvalidOperationException("SMTP is required outside Development.");
            logger.LogInformation("Recuperação de senha para {Email}: {ResetUrl}", email, resetUrl);
            return;
        }
        using var message = new MailMessage(
            config["Smtp:From"] ?? "no-reply@carcare.local",
            email,
            "Redefinição de senha",
            $"Olá, {name}. Redefina sua senha em: {resetUrl}"
        );
        using var client = new SmtpClient(host, config.GetValue("Smtp:Port", 587))
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(config["Smtp:Username"], config["Smtp:Password"]),
        };
        await client.SendMailAsync(message, ct);
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityPersistence(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.AddDbContext<IdentityDbContext>(o =>
            o.UseSqlite(config.GetConnectionString("Database"))
        );
        return services
            .AddScoped<IIdentityRepository, IdentityRepository>()
            .AddSingleton<IPasswordService, PasswordService>()
            .AddSingleton<ITokenProvider, JwtTokenProvider>()
            .AddScoped<IEmailSender, SmtpEmailSender>();
    }
}
