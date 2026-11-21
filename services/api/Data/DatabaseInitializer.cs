using Dapper;
using Hwatu.Server.Migrations;

namespace Hwatu.Server.Data;

public sealed class DatabaseInitializer(HwatuDb database, IWebHostEnvironment environment)
{
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var schemaPath = Path.Combine(environment.ContentRootPath, "database", "schema.sql");
        var schema = await File.ReadAllTextAsync(schemaPath, cancellationToken);
        await using var connection = database.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            "SELECT pg_advisory_xact_lock(hashtextextended('hwatu-initializer', 0))",
            transaction: transaction, cancellationToken: cancellationToken));
        var isNewDatabase = await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
            "SELECT to_regclass('users') IS NULL", transaction: transaction, cancellationToken: cancellationToken));
        await connection.ExecuteAsync(new CommandDefinition(schema, transaction: transaction, cancellationToken: cancellationToken));
        if (isNewDatabase)
        {
            await MigrationRunner.BaselineNewDatabaseAsync(connection, environment.ContentRootPath, cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }
}
