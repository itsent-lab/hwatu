namespace Hwatu.Server.Models;

public sealed class AppUser
{
    public long Id { get; init; }
    public string Username { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string PasswordHash { get; init; } = "";
    public string Role { get; init; } = "member";
    public bool IsActive { get; init; }
    public int AuthVersion { get; init; } = 1;
    public long VirtualBalance { get; init; } = 500_000;
    public long OpponentBalance { get; init; } = 500_000;
    public long GostopComputerABalance { get; init; } = 500_000;
    public long GostopComputerBBalance { get; init; } = 500_000;
    public DateTime? ProfileImageUpdatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }
    public DateTime CreatedAt { get; init; }
}
