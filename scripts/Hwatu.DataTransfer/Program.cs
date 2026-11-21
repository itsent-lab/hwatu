using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using MySqlConnector;
using Npgsql;

if (args.Length != 2)
{
    Console.Error.WriteLine("Usage: Hwatu.DataTransfer <source-mysql-appsettings> <empty-target-postgres-appsettings>");
    return 2;
}

try
{
    await TransferAsync(args[0], args[1]);
    return 0;
}
catch (Exception e)
{
    // Provider messages can contain row contents or connection details.
    var reason = e switch
    {
        InvalidDataException => e.Message,
        PostgresException pg => $"PostgreSQL {pg.SqlState}",
        MySqlException mysql => $"MySQL {mysql.Number}",
        _ => e.GetType().Name
    };
    Console.Error.WriteLine($"Transfer stopped: {reason}");
    return 1;
}

static string ConnectionString(string path)
{
    using var json = JsonDocument.Parse(File.ReadAllText(path));
    return json.RootElement.GetProperty("ConnectionStrings").GetProperty("Hwatu").GetString()
        ?? throw new InvalidDataException("Missing connection setting.");
}

static async Task TransferAsync(string sourceConfig, string targetConfig)
{
    var sourceSettings = new MySqlConnectionStringBuilder(ConnectionString(sourceConfig))
    {
        GuidFormat = MySqlGuidFormat.None,
        TreatTinyAsBoolean = true
    };
    await using var source = new MySqlConnection(sourceSettings.ConnectionString);
    await using var target = new NpgsqlConnection(ConnectionString(targetConfig));
    await source.OpenAsync();
    await target.OpenAsync();
    // MySQL 8 otherwise caches AUTO_INCREMENT metadata even after deletes or explicit ID changes.
    await using (var metadata = new MySqlCommand("SET SESSION information_schema_stats_expiry = 0", source))
        await metadata.ExecuteNonQueryAsync();
    await using var snapshot = await source.BeginTransactionAsync(IsolationLevel.RepeatableRead, isReadOnly: true);
    await using var transaction = await target.BeginTransactionAsync();
    await using var mysqlOffset = new MySqlCommand("SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW())", source, snapshot);
    await using var postgresOffset = new NpgsqlCommand("SELECT EXTRACT(timezone FROM CURRENT_TIMESTAMP)::integer", target, transaction);
    if (Convert.ToInt32(await mysqlOffset.ExecuteScalarAsync()) != Convert.ToInt32(await postgresOffset.ExecuteScalarAsync()))
        throw new InvalidDataException("Session time zones differ. Check the source and target time zone before copying.");

    string[] tables = ["users", "game_saves", "match_history", "hwatu_schema_migration_attempts"];
    var sourceTables = new HashSet<string>(StringComparer.Ordinal);
    await using (var schema = new MySqlCommand(
        "SELECT table_name, engine FROM information_schema.tables WHERE table_schema = DATABASE()", source, snapshot))
    await using (var reader = await schema.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            if (!tables.Contains(reader.GetString(0)) || reader.IsDBNull(1) || reader.GetString(1) != "InnoDB")
                throw new InvalidDataException("Unexpected table, view, or nontransactional source. Check scope before importing.");
            sourceTables.Add(reader.GetString(0));
        }
    }
    if (!tables.Take(3).All(sourceTables.Contains))
        throw new InvalidDataException("Required family game tables are missing.");

    // Every table starts empty. One transaction covers rows, verification and identity restart.
    await using (var guard = new NpgsqlCommand(
        "LOCK TABLE users, game_saves, match_history, hwatu_schema_migration_attempts IN ACCESS EXCLUSIVE MODE", target, transaction))
        await guard.ExecuteNonQueryAsync();
    foreach (var table in tables)
    {
        await using var check = new NpgsqlCommand($"SELECT EXISTS (SELECT 1 FROM {table})", target, transaction);
        if (Equals(await check.ExecuteScalarAsync(), true))
            throw new InvalidDataException($"Target table {table} is not empty.");
    }

    foreach (var table in tables.Where(sourceTables.Contains))
    {
        var columns = new List<(string Name, string Type)>();
        await using (var schema = new NpgsqlCommand("""
            SELECT column_name, udt_name FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = @table ORDER BY ordinal_position
            """, target, transaction))
        {
            schema.Parameters.AddWithValue("table", table);
            await using var reader = await schema.ExecuteReaderAsync();
            while (await reader.ReadAsync()) columns.Add((reader.GetString(0), reader.GetString(1)));
        }
        await using (var schema = new MySqlCommand(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = @table",
            source, snapshot))
        {
            schema.Parameters.AddWithValue("@table", table);
            await using var reader = await schema.ExecuteReaderAsync();
            var names = new HashSet<string>(StringComparer.Ordinal);
            while (await reader.ReadAsync()) names.Add(reader.GetString(0));
            if (!names.SetEquals(columns.Select(c => c.Name)) ||
                columns.Any(c => !System.Text.RegularExpressions.Regex.IsMatch(c.Name, "^[a-z][a-z0-9_]*$")))
                throw new InvalidDataException($"Column mismatch in {table}.");
        }
        var pk = table == "hwatu_schema_migration_attempts" ? "attempt_id" : "id";
        var projection = string.Join(", ", columns.Select(c => c.Name));
        var select = $"SELECT {projection} FROM {table} ORDER BY {pk}";
        long count = 0;
        await using (var query = new MySqlCommand(select, source, snapshot))
        await using (var rows = await query.ExecuteReaderAsync())
        await using (var copy = await target.BeginBinaryImportAsync($"COPY {table} ({projection}) FROM STDIN (FORMAT BINARY)"))
        {
            while (await rows.ReadAsync())
            {
                await copy.StartRowAsync();
                for (var i = 0; i < columns.Count; ++i)
                {
                    if (rows.IsDBNull(i)) { await copy.WriteNullAsync(); continue; }
                    var value = ConvertValue(rows.GetValue(i), columns[i].Type);
                    await copy.WriteAsync(value, columns[i].Type);
                }
                ++count;
            }
            await copy.CompleteAsync();
        }

        await using (var original = new MySqlCommand(select, source, snapshot))
        await using (var imported = new NpgsqlCommand(select, target, transaction))
        await using (var a = await original.ExecuteReaderAsync())
        await using (var b = await imported.ExecuteReaderAsync())
        {
            while (await a.ReadAsync())
            {
                if (!await b.ReadAsync()) throw new InvalidDataException($"Missing row in {table}.");
                for (var i = 0; i < columns.Count; ++i)
                {
                    var type = columns[i].Type;
                    var left = a.IsDBNull(i) ? DBNull.Value : ConvertValue(a.GetValue(i), type);
                    var right = b.GetValue(i);
                    if (!EqualValue(left, right, type))
                        throw new InvalidDataException($"Mismatch in {table}.{columns[i].Name}.");
                }
            }
            if (await b.ReadAsync()) throw new InvalidDataException($"Extra row in {table}.");
        }
        // Preserve gaps, including the high-water mark of deleted rows.
        await using var identity = new MySqlCommand("""
            SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = @table
            """, source, snapshot);
        identity.Parameters.AddWithValue("@table", table);
        var next = Convert.ToInt64(await identity.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
        await using var max = new NpgsqlCommand($"SELECT COALESCE(MAX({pk}),0) FROM {table}", target, transaction);
        if (next <= Convert.ToInt64(await max.ExecuteScalarAsync()))
            throw new InvalidDataException($"Invalid source identity for {table}. Refresh source metadata.");
        await using var restart = new NpgsqlCommand($"ALTER TABLE {table} ALTER COLUMN {pk} RESTART WITH {next}", target, transaction);
        await restart.ExecuteNonQueryAsync();
        Console.WriteLine($"Compared {table}: {count} rows, {columns.Count} columns.");
    }
    await transaction.CommitAsync();
    Console.WriteLine("Transfer committed.");
}

static object ConvertValue(object value, string type) => type switch
{
    "int8" => Convert.ToInt64(value, CultureInfo.InvariantCulture),
    "int4" => Convert.ToInt32(value, CultureInfo.InvariantCulture),
    "bool" => Convert.ToBoolean(value, CultureInfo.InvariantCulture),
    "uuid" => Guid.Parse((string)value),
    "timestamp" => DateTime.SpecifyKind((DateTime)value, DateTimeKind.Unspecified),
    "bytea" => (byte[])value,
    "varchar" or "bpchar" or "jsonb" => (string)value,
    _ => throw new InvalidDataException($"Unsupported target type {type}.")
};

static bool EqualValue(object left, object right, string type)
{
    if (left is DBNull || right is DBNull) return left is DBNull && right is DBNull;
    if (left is byte[] bytes && right is byte[] stored) return bytes.AsSpan().SequenceEqual(stored);
    if (type == "jsonb") return JsonNode.DeepEquals(JsonNode.Parse((string)left), JsonNode.Parse((string)right));
    return Equals(left, right);
}
