using System.Text.Json;

namespace Hwatu.Server.Models;

public sealed record BootstrapRequest(
    string Username,
    string DisplayName,
    string Password,
    string PasswordConfirm);

public sealed record LoginRequest(string Username, string Password, bool Remember);

public sealed record CreateUserRequest(string Username, string DisplayName, string Password);

public sealed record ChangePasswordRequest(string Password);

public sealed record SaveGameRequest(
    string GameUuid,
    string GameMode,
    int StateVersion,
    int TurnNumber,
    string? DeviceId,
    JsonElement State);
