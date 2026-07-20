using System.Security.Cryptography;
using System.Text;

namespace Hwatu.Server.Auth;

public static class BootstrapTokenVerifier
{
    public const int MinimumLength = 32;

    public static bool IsConfigured(IConfiguration configuration)
    {
        var token = configuration["Bootstrap:Token"];
        return token is { Length: >= MinimumLength } && !string.IsNullOrWhiteSpace(token);
    }

    public static bool Verify(IConfiguration configuration, string? providedToken)
    {
        var expectedToken = configuration["Bootstrap:Token"];
        if (!IsConfigured(configuration) || string.IsNullOrEmpty(providedToken))
        {
            return false;
        }

        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expectedToken!));
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(providedToken));
        return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
    }
}
