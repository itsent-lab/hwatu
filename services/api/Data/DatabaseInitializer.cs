using Dapper;
using Hwatu.Server.Migrations;

namespace Hwatu.Server.Data;

public sealed class DatabaseInitializer(HwatuDb database, IWebHostEnvironment environment)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var schemaPath = Path.Combine(environment.ContentRootPath, "database", "schema.sql");
        var schema = await File.ReadAllTextAsync(schemaPath, cancellationToken);
        var statements = schema
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(statement => !string.IsNullOrWhiteSpace(statement));

        await using var connection = database.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        var isNewDatabase = !await HasTableAsync(connection, "users", cancellationToken);
        foreach (var statement in statements)
        {
            await connection.ExecuteAsync(new CommandDefinition(statement, cancellationToken: cancellationToken));
        }

        if (!await HasColumnAsync(connection, "users", "auth_version", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER is_active",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "opponent_balance", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN opponent_balance BIGINT NOT NULL DEFAULT 500000 AFTER virtual_balance",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "gostop_computer_a_balance", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN gostop_computer_a_balance BIGINT NOT NULL DEFAULT 500000 AFTER opponent_balance",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "gostop_computer_b_balance", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN gostop_computer_b_balance BIGINT NOT NULL DEFAULT 500000 AFTER gostop_computer_a_balance",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "profile_image", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN profile_image MEDIUMBLOB NULL AFTER opponent_balance",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "profile_image_content_type", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN profile_image_content_type VARCHAR(32) NULL AFTER profile_image",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "users", "profile_image_updated_at", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE users ADD COLUMN profile_image_updated_at DATETIME(6) NULL AFTER profile_image_content_type",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "match_history", "opponent_balance_after", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE match_history ADD COLUMN opponent_balance_after BIGINT NOT NULL DEFAULT 500000 AFTER balance_after",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "match_history", "gostop_computer_a_balance_after", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE match_history ADD COLUMN gostop_computer_a_balance_after BIGINT NOT NULL DEFAULT 500000 AFTER opponent_balance_after",
                cancellationToken: cancellationToken));
        }
        if (!await HasColumnAsync(connection, "match_history", "gostop_computer_b_balance_after", cancellationToken))
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "ALTER TABLE match_history ADD COLUMN gostop_computer_b_balance_after BIGINT NOT NULL DEFAULT 500000 AFTER gostop_computer_a_balance_after",
                cancellationToken: cancellationToken));
        }

        if (isNewDatabase)
        {
            await MigrationRunner.BaselineNewDatabaseAsync(
                connection, environment.ContentRootPath, cancellationToken);
        }

    }

    private static async Task<bool> HasTableAsync(
        MySqlConnector.MySqlConnection connection,
        string tableName,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = @TableName
            """;
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql, new { TableName = tableName }, cancellationToken: cancellationToken)) > 0;
    }

    private static async Task<bool> HasColumnAsync(
        MySqlConnector.MySqlConnection connection,
        string tableName,
        string columnName,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = @TableName
              AND column_name = @ColumnName
            """;
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql, new { TableName = tableName, ColumnName = columnName }, cancellationToken: cancellationToken)) > 0;
    }

}
