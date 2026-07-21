using System.Text.Json;
using MySqlConnector;

namespace Hwatu.Server.Migrations;

public static class MigrationConnectionSettings
{
    public static MySqlConnectionStringBuilder Load(string configPath)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(configPath));
        var connectionString = document.RootElement
            .GetProperty("ConnectionStrings")
            .GetProperty("Hwatu")
            .GetString();
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("The migration connection string is empty.");
        }
        return new MySqlConnectionStringBuilder(connectionString);
    }

    public static void WriteClientOptionFile(MySqlConnectionStringBuilder settings, string outputPath)
    {
        var lines = new[]
        {
            "[client]",
            $"host=\"{Escape(settings.Server)}\"",
            $"port={settings.Port}",
            $"user=\"{Escape(settings.UserID)}\"",
            $"password=\"{Escape(settings.Password)}\"",
            "default-character-set=utf8mb4"
        };
        File.WriteAllLines(outputPath, lines);
        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(outputPath, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
    }

    private static string Escape(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("\"", "\\\"", StringComparison.Ordinal)
        .Replace("\r", "\\r", StringComparison.Ordinal)
        .Replace("\n", "\\n", StringComparison.Ordinal);
}
