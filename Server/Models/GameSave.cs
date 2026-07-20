namespace Hwatu.Server.Models;

public sealed class GameSave
{
    public Guid GameUuid { get; init; }
    public string GameMode { get; init; } = "matgo";
    public string Status { get; init; } = "active";
    public int StateVersion { get; init; }
    public int TurnNumber { get; init; }
    public string StateJson { get; init; } = "{}";
    public string? DeviceId { get; init; }
    public DateTime UpdatedAt { get; init; }
}
