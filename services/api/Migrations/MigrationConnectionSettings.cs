using System.Text.Json;
using Npgsql;

namespace Hwatu.Server.Migrations;

public static class MigrationConnectionSettings
{
    public static NpgsqlConnectionStringBuilder Load(string configPath)
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
        return new NpgsqlConnectionStringBuilder(connectionString);
    }

    public static void WriteClientOptionFile(NpgsqlConnectionStringBuilder settings, string outputPath)
    {
        var values = new Dictionary<string, string?>
        {
            ["host"] = settings.Host,
            ["port"] = settings.Port.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["dbname"] = settings.Database,
            ["user"] = settings.Username,
            ["password"] = settings.Password,
            ["sslmode"] = settings.SslMode switch
            {
                SslMode.VerifyCA => "verify-ca",
                SslMode.VerifyFull => "verify-full",
                _ => settings.SslMode.ToString().ToLowerInvariant()
            },
            ["sslrootcert"] = settings.RootCertificate
        };
        if (values.Values.Any(value => value?.IndexOfAny(['\r', '\n', '\0']) >= 0))
        {
            throw new InvalidOperationException("Invalid multiline database service option.");
        }
        var options = new FileStreamOptions { Mode = FileMode.OpenOrCreate, Access = FileAccess.Write, Share = FileShare.None };
        if (!OperatingSystem.IsWindows())
        {
            options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }
        using var file = new FileStream(outputPath, options);
        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(file.SafeFileHandle, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        file.SetLength(0);
        using var writer = new StreamWriter(file);
        writer.WriteLine("[hwatu]");
        foreach (var pair in values.Where(pair => !string.IsNullOrEmpty(pair.Value)))
        {
            writer.WriteLine($"{pair.Key}={pair.Value}");
        }
    }
}
