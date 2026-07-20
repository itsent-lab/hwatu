using System.Text;
using System.Text.RegularExpressions;

namespace Hwatu.Server.Endpoints;

public static partial class Validation
{
    public const int MinimumPasswordLength = 15;

    [GeneratedRegex("^[가-힣a-z0-9_]{3,30}$")]
    private static partial Regex UsernamePattern();

    [GeneratedRegex("^[a-f0-9]{32}$")]
    private static partial Regex DevicePattern();

    public static string NormalizeUsername(string? username) => (username ?? "").Trim().Normalize(NormalizationForm.FormKC).ToLowerInvariant();
    public static bool IsUsername(string username) => UsernamePattern().IsMatch(username);
    public static bool IsPassword(string? password) => password is { Length: >= MinimumPasswordLength and <= 128 };
    public static bool IsDisplayName(string? displayName) => !string.IsNullOrWhiteSpace(displayName) && displayName.Trim().Length <= 20;
    public static bool IsDeviceId(string? deviceId) => string.IsNullOrEmpty(deviceId) || DevicePattern().IsMatch(deviceId);
}
