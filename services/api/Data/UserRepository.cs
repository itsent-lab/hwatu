using Dapper;
using Hwatu.Server.Models;

namespace Hwatu.Server.Data;

public sealed class UserRepository(HwatuDb database)
{
    private const long DefaultBalance = 500_000;
    private const long RefillBalance = DefaultBalance;
    private const string UserColumns = """
        id AS Id,
        username AS Username,
        display_name AS DisplayName,
        password_hash AS PasswordHash,
        role AS Role,
        is_active AS IsActive,
        auth_version AS AuthVersion,
        virtual_balance AS VirtualBalance,
        opponent_balance AS OpponentBalance,
        gostop_computer_a_balance AS GostopComputerABalance,
        gostop_computer_b_balance AS GostopComputerBBalance,
        profile_image_updated_at AS ProfileImageUpdatedAt,
        last_login_at AS LastLoginAt,
        created_at AS CreatedAt
        """;

    public async Task<int> CountAsync()
    {
        await using var connection = database.OpenConnection();
        return await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users");
    }

    public async Task<AppUser?> FindByUsernameAsync(string username)
    {
        await using var connection = database.OpenConnection();
        return await connection.QuerySingleOrDefaultAsync<AppUser>(
            $"SELECT {UserColumns} FROM users WHERE rtrim(username) = rtrim(@Username) LIMIT 1",
            new { Username = username });
    }

    public async Task<AppUser?> FindByIdAsync(long id)
    {
        await using var connection = database.OpenConnection();
        return await connection.QuerySingleOrDefaultAsync<AppUser>(
            $"SELECT {UserColumns} FROM users WHERE id = @Id LIMIT 1",
            new { Id = id });
    }

    public async Task<IReadOnlyList<AppUser>> ListAsync()
    {
        await using var connection = database.OpenConnection();
        var users = await connection.QueryAsync<AppUser>(
            $"SELECT {UserColumns} FROM users ORDER BY (role = 'admin') DESC, display_name ASC");
        return users.AsList();
    }

    public async Task<long> CreateAsync(
        string username,
        string displayName,
        string passwordHash,
        string role)
    {
        const string sql = """
            INSERT INTO users
                (username, display_name, password_hash, role, virtual_balance, opponent_balance)
            VALUES
                (@Username, @DisplayName, @PasswordHash, @Role, @DefaultBalance, @DefaultBalance)
            RETURNING id
            """;
        await using var connection = database.OpenConnection();
        await connection.OpenAsync();
        return await connection.ExecuteScalarAsync<long>(sql, new
        {
            Username = username,
            DisplayName = displayName,
            PasswordHash = passwordHash,
            Role = role,
            DefaultBalance
        });
    }

    public async Task<long?> TryCreateInitialAdminAsync(
        string username,
        string displayName,
        string passwordHash)
    {
        const string insertSql = """
            INSERT INTO users
                (username, display_name, password_hash, role, virtual_balance, opponent_balance)
            VALUES
                (@Username, @DisplayName, @PasswordHash, 'admin', @DefaultBalance, @DefaultBalance)
            RETURNING id
            """;

        await using var connection = database.OpenConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await connection.ExecuteAsync("SET LOCAL lock_timeout = '5s'", transaction: transaction);
        await connection.ExecuteAsync(
            "SELECT pg_advisory_xact_lock(hashtextextended('hwatu-bootstrap', 0))",
            transaction: transaction);
        if (await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users", transaction: transaction) != 0)
        {
            return null;
        }

        var id = await connection.ExecuteScalarAsync<long>(insertSql, new
        {
            Username = username,
            DisplayName = displayName,
            PasswordHash = passwordHash,
            DefaultBalance
        }, transaction);
        await transaction.CommitAsync();
        return id;
    }

    public async Task TouchLoginAsync(long id)
    {
        await using var connection = database.OpenConnection();
        await connection.ExecuteAsync("UPDATE users SET last_login_at = date_trunc('second', statement_timestamp()::timestamp) WHERE id = @Id", new { Id = id });
    }

    public async Task<bool> ToggleActiveAsync(long id)
    {
        await using var connection = database.OpenConnection();
        var affected = await connection.ExecuteAsync(
            "UPDATE users SET is_active = NOT is_active, auth_version = auth_version + 1 WHERE id = @Id",
            new { Id = id });
        return affected == 1;
    }

    public async Task<bool> ChangePasswordAsync(long id, string passwordHash)
    {
        await using var connection = database.OpenConnection();
        var affected = await connection.ExecuteAsync(
            "UPDATE users SET password_hash = @PasswordHash, auth_version = auth_version + 1 WHERE id = @Id",
            new { Id = id, PasswordHash = passwordHash });
        return affected == 1;
    }

    public async Task<bool> SaveProfileImageAsync(long id, byte[] data, string contentType)
    {
        await using var connection = database.OpenConnection();
        var affected = await connection.ExecuteAsync("""
            UPDATE users
            SET profile_image = @Data,
                profile_image_content_type = @ContentType,
                profile_image_updated_at = (clock_timestamp() AT TIME ZONE 'UTC')
            WHERE id = @Id
            """, new { Id = id, Data = data, ContentType = contentType });
        return affected == 1;
    }

    public async Task<UserProfileImage?> GetProfileImageAsync(long id)
    {
        await using var connection = database.OpenConnection();
        return await connection.QuerySingleOrDefaultAsync<UserProfileImage>("""
            SELECT profile_image AS Data,
                   profile_image_content_type AS ContentType,
                   profile_image_updated_at AS UpdatedAt
            FROM users
            WHERE id = @Id AND profile_image IS NOT NULL
            LIMIT 1
            """, new { Id = id });
    }

    public async Task<long?> RefillVirtualBalanceAsync(long id)
    {
        await using var connection = database.OpenConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        var affected = await connection.ExecuteAsync(
            "UPDATE users SET virtual_balance = @RefillBalance WHERE id = @Id AND virtual_balance = 0",
            new { Id = id, RefillBalance }, transaction);
        var balance = await connection.ExecuteScalarAsync<long?>(
            "SELECT virtual_balance FROM users WHERE id = @Id LIMIT 1",
            new { Id = id }, transaction);
        await transaction.CommitAsync();
        return affected == 1 ? balance : null;
    }

    public async Task<DashboardStats> TodayStatsAsync(long userId)
    {
        const string sql = """
            SELECT COUNT(*) AS Games,
                   COUNT(*) FILTER (WHERE result = 'win') AS Wins,
                   CAST(COALESCE(SUM(settlement_amount), 0) AS bigint) AS Settlement
            FROM match_history
            WHERE user_id = @UserId AND played_at >= CURRENT_DATE
            """;
        await using var connection = database.OpenConnection();
        return await connection.QuerySingleAsync<DashboardStats>(sql, new { UserId = userId });
    }
}
