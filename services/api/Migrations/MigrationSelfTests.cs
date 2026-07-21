using System.Text.Json;

namespace Hwatu.Server.Migrations;

public static class MigrationSelfTests
{
    public static void Run()
    {
        var root = Path.Combine(Path.GetTempPath(), $"familyhwatu-migration-tests-{Guid.NewGuid():N}");
        try
        {
            var migrations = Path.Combine(root, "database", "migrations");
            Directory.CreateDirectory(migrations);
            var schemaPath = Path.Combine(root, "database", "schema.sql");
            File.WriteAllText(schemaPath, "CREATE TABLE example (id INT);\n");
            var up = Write(migrations, "0001_example.sql", "ALTER TABLE example ADD value INT;\n");
            var verify = Write(migrations, "0001_example.verify.sql", "SELECT 1;\n");
            var rollback = Write(migrations, "0001_example.rollback.sql", "ALTER TABLE example DROP value;\n");
            var rollbackVerify = Write(
                migrations, "0001_example.rollback.verify.sql", "SELECT 1;\n");
            var manifest = new MigrationManifestDocument
            {
                FormatVersion = 1,
                SchemaSha256 = MigrationManifestLoader.ComputeSha256(schemaPath),
                Migrations =
                [
                    new MigrationDefinition
                    {
                        Id = "0001_example",
                        Description = "test",
                        Up = Path.GetFileName(up),
                        Sha256 = MigrationManifestLoader.ComputeSha256(up),
                        Verify = Path.GetFileName(verify),
                        VerifySha256 = MigrationManifestLoader.ComputeSha256(verify),
                        OnlineSafeWithPreviousApp = true,
                        Rollback = new MigrationRollbackDefinition
                        {
                            Mode = "automatic",
                            File = Path.GetFileName(rollback),
                            Sha256 = MigrationManifestLoader.ComputeSha256(rollback),
                            Verify = Path.GetFileName(rollbackVerify),
                            VerifySha256 = MigrationManifestLoader.ComputeSha256(rollbackVerify)
                        }
                    }
                ]
            };
            var manifestPath = Path.Combine(migrations, "manifest.json");
            File.WriteAllText(manifestPath, JsonSerializer.Serialize(manifest));
            var loaded = MigrationManifestLoader.Load(root);
            Require(loaded.Migrations.Count == 1, "valid manifest");

            File.AppendAllText(up, "-- changed\n");
            RequireThrows(() => MigrationManifestLoader.Load(root), "checksum mutation");
            File.WriteAllText(up, "ALTER TABLE example ADD value INT;\n");

            manifest.Migrations[0] = new MigrationDefinition
            {
                Id = "bad-id",
                Description = "test",
                Up = Path.GetFileName(up),
                Sha256 = MigrationManifestLoader.ComputeSha256(up),
                Verify = Path.GetFileName(verify),
                VerifySha256 = MigrationManifestLoader.ComputeSha256(verify),
                OnlineSafeWithPreviousApp = true,
                Rollback = manifest.Migrations[0].Rollback
            };
            File.WriteAllText(manifestPath, JsonSerializer.Serialize(manifest));
            RequireThrows(() => MigrationManifestLoader.Load(root), "migration ordering ID");
        }
        finally
        {
            if (Directory.Exists(root))
            {
                Directory.Delete(root, recursive: true);
            }
        }
    }

    private static string Write(string root, string name, string content)
    {
        var path = Path.Combine(root, name);
        File.WriteAllText(path, content);
        return path;
    }

    private static void Require(bool condition, string label)
    {
        if (!condition) throw new InvalidOperationException($"Self-test failed: {label}");
    }

    private static void RequireThrows(Action action, string label)
    {
        try
        {
            action();
        }
        catch (MigrationValidationException)
        {
            return;
        }
        throw new InvalidOperationException($"Self-test failed: {label}");
    }
}
