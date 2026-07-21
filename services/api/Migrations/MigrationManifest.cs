using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Hwatu.Server.Migrations;

public sealed class MigrationValidationException(string message) : Exception(message);

public sealed class MigrationManifestDocument
{
    public int FormatVersion { get; init; }
    public string SchemaSha256 { get; init; } = "";
    public List<MigrationDefinition> Migrations { get; init; } = [];
}

public sealed class MigrationDefinition
{
    public string Id { get; init; } = "";
    public string Description { get; init; } = "";
    public string Up { get; init; } = "";
    public string Sha256 { get; init; } = "";
    public string Verify { get; init; } = "";
    public string VerifySha256 { get; init; } = "";
    public bool OnlineSafeWithPreviousApp { get; init; }
    public MigrationRollbackDefinition Rollback { get; init; } = new();
}

public sealed class MigrationRollbackDefinition
{
    public string Mode { get; init; } = "";
    public string? File { get; init; }
    public string? Sha256 { get; init; }
    public string? Verify { get; init; }
    public string? VerifySha256 { get; init; }
    public string? ManualGuide { get; init; }
    public string? ManualGuideSha256 { get; init; }
}

public sealed record LoadedMigration(
    MigrationDefinition Definition,
    string UpPath,
    string VerifyPath,
    string? RollbackPath,
    string? RollbackVerifyPath);

public sealed record LoadedMigrationManifest(
    string ContentRoot,
    MigrationManifestDocument Document,
    IReadOnlyList<LoadedMigration> Migrations);

public static partial class MigrationManifestLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [GeneratedRegex("^[0-9]{4}_[a-z0-9_]+$")]
    private static partial Regex MigrationIdPattern();

    [GeneratedRegex("^[a-f0-9]{64}$")]
    private static partial Regex Sha256Pattern();

    public static LoadedMigrationManifest Load(string contentRoot)
    {
        var root = Path.GetFullPath(contentRoot);
        var schemaPath = Path.Combine(root, "database", "schema.sql");
        var migrationsRoot = Path.Combine(root, "database", "migrations");
        var manifestPath = Path.Combine(migrationsRoot, "manifest.json");
        RequireFile(schemaPath, "schema.sql");
        RequireFile(manifestPath, "migration manifest");

        var document = JsonSerializer.Deserialize<MigrationManifestDocument>(
            File.ReadAllText(manifestPath), JsonOptions)
            ?? throw new MigrationValidationException("Migration manifest is empty.");
        if (document.FormatVersion != 1)
        {
            throw new MigrationValidationException("Unsupported migration manifest version.");
        }
        ValidateChecksum(document.SchemaSha256, "schema checksum");
        if (!string.Equals(ComputeSha256(schemaPath), document.SchemaSha256, StringComparison.Ordinal))
        {
            throw new MigrationValidationException("schema.sql checksum does not match the manifest.");
        }

        var loaded = new List<LoadedMigration>();
        var seenIds = new HashSet<string>(StringComparer.Ordinal);
        string? previousId = null;
        foreach (var migration in document.Migrations)
        {
            if (!MigrationIdPattern().IsMatch(migration.Id) || !seenIds.Add(migration.Id))
            {
                throw new MigrationValidationException("Migration IDs must be unique NNNN_name values.");
            }
            if (previousId is not null && string.CompareOrdinal(previousId, migration.Id) >= 0)
            {
                throw new MigrationValidationException("Migrations must be sorted by ID.");
            }
            previousId = migration.Id;
            if (string.IsNullOrWhiteSpace(migration.Description))
            {
                throw new MigrationValidationException("Migration descriptions are required.");
            }
            var upPath = ResolveCheckedFile(migrationsRoot, migration.Up, migration.Sha256, "up SQL");
            var verifyPath = ResolveCheckedFile(
                migrationsRoot, migration.Verify, migration.VerifySha256, "verification SQL");
            string? rollbackPath = null;
            string? rollbackVerifyPath = null;
            switch (migration.Rollback.Mode)
            {
                case "automatic":
                    if (!migration.OnlineSafeWithPreviousApp)
                    {
                        throw new MigrationValidationException(
                            "Automatic migration entries must be safe with the previous app.");
                    }
                    rollbackPath = ResolveCheckedFile(
                        migrationsRoot, migration.Rollback.File, migration.Rollback.Sha256, "rollback SQL");
                    rollbackVerifyPath = ResolveCheckedFile(
                        migrationsRoot,
                        migration.Rollback.Verify,
                        migration.Rollback.VerifySha256,
                        "rollback verification SQL");
                    break;
                case "manual":
                    ResolveCheckedFile(
                        migrationsRoot,
                        migration.Rollback.ManualGuide,
                        migration.Rollback.ManualGuideSha256,
                        "manual recovery guide");
                    break;
                default:
                    throw new MigrationValidationException("Rollback mode must be automatic or manual.");
            }
            loaded.Add(new LoadedMigration(
                migration, upPath, verifyPath, rollbackPath, rollbackVerifyPath));
        }
        return new LoadedMigrationManifest(root, document, loaded);
    }

    public static string ComputeSha256(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexStringLower(SHA256.HashData(stream));
    }

    private static string ResolveCheckedFile(
        string root,
        string? relativePath,
        string? expectedChecksum,
        string label)
    {
        if (string.IsNullOrWhiteSpace(relativePath) ||
            Path.GetFileName(relativePath) != relativePath)
        {
            throw new MigrationValidationException($"{label} must be a file in the migration directory.");
        }
        ValidateChecksum(expectedChecksum, label);
        var path = Path.Combine(root, relativePath);
        RequireFile(path, label);
        if (!string.Equals(ComputeSha256(path), expectedChecksum, StringComparison.Ordinal))
        {
            throw new MigrationValidationException($"{label} checksum does not match.");
        }
        return path;
    }

    private static void ValidateChecksum(string? checksum, string label)
    {
        if (checksum is null || !Sha256Pattern().IsMatch(checksum))
        {
            throw new MigrationValidationException($"{label} must be a lowercase SHA-256 value.");
        }
    }

    private static void RequireFile(string path, string label)
    {
        if (!File.Exists(path))
        {
            throw new MigrationValidationException($"{label} file is missing.");
        }
    }
}
