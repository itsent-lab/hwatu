using System.Text.Json;
using MySqlConnector;

namespace Hwatu.Server.Migrations;

public static class MigrationCommand
{
    public static async Task<int?> TryRunAsync(string[] args)
    {
        if (args.Length == 0 || args[0] != "migrations") return null;
        try
        {
            var command = args.ElementAtOrDefault(1) ?? "";
            if (command == "self-test")
            {
                MigrationSelfTests.Run();
                Console.WriteLine("Migration self-tests passed.");
                return 0;
            }

            var options = ParseOptions(args.Skip(2).ToArray());
            var contentRoot = GetRequired(options, "content-root");
            var manifest = MigrationManifestLoader.Load(contentRoot);
            if (command == "validate")
            {
                Console.WriteLine("Migration manifest validation passed.");
                return 0;
            }

            var configPath = GetRequired(options, "config");
            var settings = MigrationConnectionSettings.Load(configPath);
            if (command == "client-config")
            {
                MigrationConnectionSettings.WriteClientOptionFile(
                    settings, GetRequired(options, "output"));
                return 0;
            }
            if (command == "database-name")
            {
                Console.WriteLine(settings.Database);
                return 0;
            }

            var runner = new MigrationRunner(manifest, settings);
            switch (command)
            {
                case "pending-count":
                    var plan = await runner.PlanAsync();
                    if (!plan.AutomaticDeploymentAllowed) return 3;
                    Console.WriteLine(plan.Pending.Count);
                    return 0;
                case "apply":
                    var applied = await runner.ApplyAsync(GetRequired(options, "run-id"));
                    Console.WriteLine(JsonSerializer.Serialize(new { applied = applied.Count }));
                    return 0;
                case "rollback-run":
                    await runner.RollbackRunAsync(GetRequired(options, "run-id"));
                    Console.WriteLine("Migration run rollback completed.");
                    return 0;
                case "verify":
                    await runner.VerifyAsync();
                    Console.WriteLine("Migration database verification passed.");
                    return 0;
                default:
                    throw new InvalidOperationException("Unknown migration command.");
            }
        }
        catch (Exception exception)
        {
            var code = exception is MySqlException mySql
                ? $"mysql-{mySql.Number}"
                : exception.GetType().Name;
            Console.Error.WriteLine($"Migration command failed ({code}).");
            return 2;
        }
    }

    private static Dictionary<string, string> ParseOptions(string[] args)
    {
        var options = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index += 2)
        {
            if (index + 1 >= args.Length || !args[index].StartsWith("--", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Migration command options are invalid.");
            }
            options[args[index][2..]] = args[index + 1];
        }
        return options;
    }

    private static string GetRequired(IReadOnlyDictionary<string, string> options, string name) =>
        options.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"Required migration option is missing: {name}");
}
