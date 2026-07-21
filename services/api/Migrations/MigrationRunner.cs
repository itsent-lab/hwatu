using MySqlConnector;

namespace Hwatu.Server.Migrations;

public sealed record MigrationPlan(
    IReadOnlyList<LoadedMigration> Pending,
    bool AutomaticDeploymentAllowed);

public sealed class MigrationRunner(
    LoadedMigrationManifest manifest,
    MySqlConnectionStringBuilder connectionSettings)
{
    public async Task<MigrationPlan> PlanAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = new MySqlConnection(connectionSettings.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        var store = new MigrationStore(connection);
        return BuildPlan(await store.LoadLatestAsync(cancellationToken));
    }

    public async Task<IReadOnlyList<string>> ApplyAsync(
        string runId,
        CancellationToken cancellationToken = default)
    {
        ValidateRunId(runId);
        await using var connection = new MySqlConnection(connectionSettings.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        var store = new MigrationStore(connection);
        await store.AcquireLockAsync(cancellationToken);
        try
        {
            await store.EnsureLedgerAsync(cancellationToken);
            var plan = BuildPlan(await store.LoadLatestAsync(cancellationToken));
            if (!plan.AutomaticDeploymentAllowed)
            {
                throw new InvalidOperationException("A pending migration requires manual recovery planning.");
            }

            var applied = new List<(LoadedMigration Migration, long AttemptId)>();
            foreach (var migration in plan.Pending)
            {
                var attemptId = await store.StartAttemptAsync(
                    migration, runId, "running", cancellationToken);
                try
                {
                    await ExecuteScriptAsync(connection, migration.UpPath, cancellationToken);
                    await VerifyScriptAsync(connection, migration.VerifyPath, cancellationToken);
                    await store.UpdateAttemptAsync(
                        attemptId, "applied", null, null, cancellationToken);
                    applied.Add((migration, attemptId));
                }
                catch (Exception exception)
                {
                    await store.UpdateAttemptAsync(
                        attemptId,
                        "failed",
                        "apply-or-verify",
                        FailureCode(exception),
                        cancellationToken);
                    var rollbackTargets = new List<(LoadedMigration Migration, long AttemptId)>
                    {
                        (migration, attemptId)
                    };
                    rollbackTargets.AddRange(applied.AsEnumerable().Reverse());
                    var rollbackSucceeded = await RollbackTargetsAsync(
                        connection, store, rollbackTargets, cancellationToken);
                    throw new InvalidOperationException(
                        rollbackSucceeded
                            ? "Migration failed and the explicit rollback completed."
                            : "Migration failed and database recovery requires manual action.");
                }
            }
            return applied.Select(item => item.Migration.Definition.Id).ToArray();
        }
        finally
        {
            await store.ReleaseLockAsync();
        }
    }

    public async Task RollbackRunAsync(
        string runId,
        CancellationToken cancellationToken = default)
    {
        ValidateRunId(runId);
        await using var connection = new MySqlConnection(connectionSettings.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        var store = new MigrationStore(connection);
        await store.AcquireLockAsync(cancellationToken);
        try
        {
            await store.EnsureLedgerAsync(cancellationToken);
            var applied = await store.LoadAppliedRunAsync(runId, cancellationToken);
            var byId = manifest.Migrations.ToDictionary(
                item => item.Definition.Id, StringComparer.Ordinal);
            var targets = applied.Select(state =>
            {
                if (!byId.TryGetValue(state.MigrationId, out var migration) ||
                    !string.Equals(state.Checksum, migration.Definition.Sha256, StringComparison.Ordinal))
                {
                    throw new InvalidOperationException("Applied migration metadata does not match the manifest.");
                }
                return (migration, state.AttemptId);
            }).ToList();
            if (!await RollbackTargetsAsync(connection, store, targets, cancellationToken))
            {
                throw new InvalidOperationException("Database recovery requires manual action.");
            }
        }
        finally
        {
            await store.ReleaseLockAsync();
        }
    }

    public async Task VerifyAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = new MySqlConnection(connectionSettings.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        var store = new MigrationStore(connection);
        var plan = BuildPlan(await store.LoadLatestAsync(cancellationToken));
        if (plan.Pending.Count != 0)
        {
            throw new InvalidOperationException("Pending migrations remain.");
        }
        foreach (var migration in manifest.Migrations)
        {
            await VerifyScriptAsync(connection, migration.VerifyPath, cancellationToken);
        }
    }

    public static async Task BaselineNewDatabaseAsync(
        MySqlConnection connection,
        string contentRoot,
        CancellationToken cancellationToken = default)
    {
        var manifest = MigrationManifestLoader.Load(contentRoot);
        var store = new MigrationStore(connection);
        await store.BaselineAsync(manifest, cancellationToken);
    }

    private MigrationPlan BuildPlan(IReadOnlyDictionary<string, MigrationState> states)
    {
        var knownIds = manifest.Migrations
            .Select(item => item.Definition.Id)
            .ToHashSet(StringComparer.Ordinal);
        if (states.Values.Any(state =>
            !knownIds.Contains(state.MigrationId) &&
            state.State is "applied" or "baselined" or "running" or "rollback_failed"))
        {
            throw new InvalidOperationException("The database contains an unknown active migration.");
        }

        var pending = new List<LoadedMigration>();
        foreach (var migration in manifest.Migrations)
        {
            if (!states.TryGetValue(migration.Definition.Id, out var state) || state.State == "rolled_back")
            {
                pending.Add(migration);
                continue;
            }
            if (state.State is "running" or "failed" or "rollback_failed")
            {
                throw new InvalidOperationException("A previous migration attempt requires recovery.");
            }
            if (state.State is not ("applied" or "baselined") ||
                !string.Equals(state.Checksum, migration.Definition.Sha256, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("An applied migration checksum has changed.");
            }
        }
        return new MigrationPlan(
            pending,
            pending.All(item => item.Definition.Rollback.Mode == "automatic"));
    }

    private static async Task<bool> RollbackTargetsAsync(
        MySqlConnection connection,
        MigrationStore store,
        IReadOnlyList<(LoadedMigration Migration, long AttemptId)> targets,
        CancellationToken cancellationToken)
    {
        var succeeded = true;
        foreach (var target in targets)
        {
            if (target.Migration.RollbackPath is null || target.Migration.RollbackVerifyPath is null)
            {
                await store.UpdateAttemptAsync(
                    target.AttemptId, "rollback_failed", "rollback", "manual-required", cancellationToken);
                succeeded = false;
                continue;
            }
            try
            {
                await ExecuteScriptAsync(connection, target.Migration.RollbackPath, cancellationToken);
                await VerifyScriptAsync(connection, target.Migration.RollbackVerifyPath, cancellationToken);
                await store.UpdateAttemptAsync(
                    target.AttemptId, "rolled_back", null, null, cancellationToken);
            }
            catch (Exception exception)
            {
                await store.UpdateAttemptAsync(
                    target.AttemptId,
                    "rollback_failed",
                    "rollback-or-verify",
                    FailureCode(exception),
                    cancellationToken);
                succeeded = false;
            }
        }
        return succeeded;
    }

    private static async Task ExecuteScriptAsync(
        MySqlConnection connection,
        string path,
        CancellationToken cancellationToken)
    {
        await using var command = new MySqlCommand(await File.ReadAllTextAsync(path, cancellationToken), connection)
        {
            CommandTimeout = 300
        };
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task VerifyScriptAsync(
        MySqlConnection connection,
        string path,
        CancellationToken cancellationToken)
    {
        await using var command = new MySqlCommand(await File.ReadAllTextAsync(path, cancellationToken), connection)
        {
            CommandTimeout = 60
        };
        var result = await command.ExecuteScalarAsync(cancellationToken);
        if (Convert.ToInt32(result) != 1)
        {
            throw new InvalidOperationException("Migration verification did not return 1.");
        }
    }

    private static string FailureCode(Exception exception) => exception is MySqlException mySql
        ? $"mysql-{mySql.Number}"
        : exception.GetType().Name;

    private static void ValidateRunId(string runId)
    {
        if (string.IsNullOrWhiteSpace(runId) || runId.Length > 64 ||
            runId.Any(character => !char.IsAsciiLetterOrDigit(character) && character is not '-' and not '_'))
        {
            throw new InvalidOperationException("Migration run ID is invalid.");
        }
    }
}
