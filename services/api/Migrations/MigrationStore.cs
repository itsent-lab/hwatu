using MySqlConnector;

namespace Hwatu.Server.Migrations;

public sealed record MigrationState(
    long AttemptId,
    string MigrationId,
    string RunId,
    string Checksum,
    string State);

public sealed class MigrationStore(MySqlConnection connection)
{
    private const string LockName = "familyhwatu-schema-migrations-v1";

    public async Task AcquireLockAsync(CancellationToken cancellationToken)
    {
        await using var command = new MySqlCommand("SELECT GET_LOCK(@name, 0)", connection);
        command.Parameters.AddWithValue("@name", LockName);
        var result = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
        if (result != 1)
        {
            throw new InvalidOperationException("Another database migration is in progress.");
        }
    }

    public async Task ReleaseLockAsync()
    {
        try
        {
            await using var command = new MySqlCommand("SELECT RELEASE_LOCK(@name)", connection);
            await command.ExecuteScalarAsync();
        }
        catch
        {
            // Connection disposal also releases the advisory lock.
        }
    }

    public async Task EnsureLedgerAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS hwatu_schema_migration_attempts (
                attempt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                migration_id VARCHAR(128) NOT NULL,
                run_id VARCHAR(64) NOT NULL,
                checksum CHAR(64) NOT NULL,
                state VARCHAR(24) NOT NULL,
                failure_step VARCHAR(64) NULL,
                failure_code VARCHAR(64) NULL,
                started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                finished_at DATETIME(6) NULL,
                PRIMARY KEY (attempt_id),
                UNIQUE KEY migration_attempt_run_unique (migration_id, run_id),
                KEY migration_attempt_latest_idx (migration_id, attempt_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """;
        await using var command = new MySqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<string, MigrationState>> LoadLatestAsync(
        CancellationToken cancellationToken)
    {
        if (!await LedgerExistsAsync(cancellationToken))
        {
            return new Dictionary<string, MigrationState>(StringComparer.Ordinal);
        }
        const string sql = """
            SELECT a.attempt_id, a.migration_id, a.run_id, a.checksum, a.state
            FROM hwatu_schema_migration_attempts a
            INNER JOIN (
                SELECT migration_id, MAX(attempt_id) AS attempt_id
                FROM hwatu_schema_migration_attempts
                GROUP BY migration_id
            ) latest ON latest.attempt_id = a.attempt_id
            """;
        var result = new Dictionary<string, MigrationState>(StringComparer.Ordinal);
        await using var command = new MySqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var state = new MigrationState(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4));
            result[state.MigrationId] = state;
        }
        return result;
    }

    public async Task<IReadOnlyList<MigrationState>> LoadAppliedRunAsync(
        string runId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT attempt_id, migration_id, run_id, checksum, state
            FROM hwatu_schema_migration_attempts
            WHERE run_id = @runId AND state = 'applied'
            ORDER BY attempt_id DESC
            """;
        var result = new List<MigrationState>();
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@runId", runId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new MigrationState(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4)));
        }
        return result;
    }

    public async Task<long> StartAttemptAsync(
        LoadedMigration migration,
        string runId,
        string state,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO hwatu_schema_migration_attempts
                (migration_id, run_id, checksum, state)
            VALUES (@migrationId, @runId, @checksum, @state)
            """;
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@migrationId", migration.Definition.Id);
        command.Parameters.AddWithValue("@runId", runId);
        command.Parameters.AddWithValue("@checksum", migration.Definition.Sha256);
        command.Parameters.AddWithValue("@state", state);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return command.LastInsertedId;
    }

    public async Task UpdateAttemptAsync(
        long attemptId,
        string state,
        string? failureStep,
        string? failureCode,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE hwatu_schema_migration_attempts
            SET state = @state,
                failure_step = COALESCE(@failureStep, failure_step),
                failure_code = COALESCE(@failureCode, failure_code),
                finished_at = CURRENT_TIMESTAMP(6)
            WHERE attempt_id = @attemptId
            """;
        await using var command = new MySqlCommand(sql, connection);
        command.Parameters.AddWithValue("@state", state);
        command.Parameters.AddWithValue("@failureStep", (object?)failureStep ?? DBNull.Value);
        command.Parameters.AddWithValue("@failureCode", (object?)failureCode ?? DBNull.Value);
        command.Parameters.AddWithValue("@attemptId", attemptId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task BaselineAsync(
        LoadedMigrationManifest manifest,
        CancellationToken cancellationToken)
    {
        await EnsureLedgerAsync(cancellationToken);
        var current = await LoadLatestAsync(cancellationToken);
        foreach (var migration in manifest.Migrations)
        {
            if (current.ContainsKey(migration.Definition.Id))
            {
                continue;
            }
            var attemptId = await StartAttemptAsync(
                migration, "schema-initializer", "baselined", cancellationToken);
            await UpdateAttemptAsync(attemptId, "baselined", null, null, cancellationToken);
        }
    }

    private async Task<bool> LedgerExistsAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = 'hwatu_schema_migration_attempts'
            """;
        await using var command = new MySqlCommand(sql, connection);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }
}
