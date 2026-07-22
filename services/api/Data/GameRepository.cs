using System.Text.Json;
using Dapper;
using Hwatu.Server.Models;

namespace Hwatu.Server.Data;

public sealed class GameRepository(HwatuDb database)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const long MaxVirtualBalance = 999_999_999_999;
    private const long OpponentRefillBalance = 500_000;

    public async Task<GameSave?> LoadMatgoAsync(long userId)
    {
        const string sql = """
            SELECT game_uuid AS GameUuid,
                   game_mode AS GameMode,
                   status AS Status,
                   state_version AS StateVersion,
                   turn_number AS TurnNumber,
                   state_json AS StateJson,
                   device_id AS DeviceId,
                   updated_at AS UpdatedAt
            FROM game_saves
            WHERE user_id = @UserId
              AND slot_key = 'matgo-main'
              AND status = 'active'
            LIMIT 1
            """;
        await using var connection = database.OpenConnection();
        return await connection.QuerySingleOrDefaultAsync<GameSave>(sql, new { UserId = userId });
    }

    public async Task<GameSaveResult> SaveMatgoAsync(
        long userId,
        SaveGameRequest request,
        string stateJson,
        MatgoSettlement? settlement)
    {
        const string sql = """
            INSERT INTO game_saves
                (user_id, slot_key, game_uuid, game_mode, status, state_version,
                 turn_number, state_json, device_id)
            VALUES
                (@UserId, 'matgo-main', @GameUuid, 'matgo', 'active', @StateVersion,
                 @TurnNumber, @StateJson, @DeviceId)
            ON DUPLICATE KEY UPDATE
                game_mode = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(game_mode), game_mode),
                status = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(status), status),
                state_version = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(state_version), state_version),
                turn_number = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(turn_number), turn_number),
                state_json = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(state_json), state_json),
                device_id = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(device_id), device_id),
                updated_at = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), CURRENT_TIMESTAMP, updated_at),
                game_uuid = IF(game_uuid <> VALUES(game_uuid) OR turn_number <= VALUES(turn_number), VALUES(game_uuid), game_uuid)
            """;
        await using var connection = database.OpenConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await connection.ExecuteAsync(sql, new
        {
            UserId = userId,
            request.GameUuid,
            request.StateVersion,
            request.TurnNumber,
            StateJson = stateJson,
            request.DeviceId
        }, transaction);

        var balances = await connection.QuerySingleAsync<PlayerBalances>(
            """
            SELECT virtual_balance AS VirtualBalance,
                   opponent_balance AS OpponentBalance
            FROM users
            WHERE id = @UserId
            FOR UPDATE
            """,
            new { UserId = userId }, transaction);
        if (settlement is null)
        {
            var opponentBalance = await RefillOpponentIfEmptyAsync(
                connection, transaction, userId, balances.OpponentBalance);
            await transaction.CommitAsync();
            return new GameSaveResult(
                balances.VirtualBalance,
                opponentBalance,
                0,
                false,
                opponentBalance != balances.OpponentBalance,
                balances.OpponentBalance);
        }

        var recorded = await connection.QuerySingleOrDefaultAsync<RecordedSettlement>(
            """
            SELECT settlement_amount AS SettlementAmount,
                   balance_after AS BalanceAfter,
                   opponent_balance_after AS OpponentBalanceAfter
            FROM match_history
            WHERE user_id = @UserId AND game_uuid = @GameUuid
            FOR UPDATE
            """,
            new { UserId = userId, request.GameUuid }, transaction);
        if (recorded is not null)
        {
            var opponentBalance = await RefillOpponentIfEmptyAsync(
                connection, transaction, userId, balances.OpponentBalance);
            await MarkCompletedAsync(connection, transaction, userId, request.GameUuid);
            await transaction.CommitAsync();
            return new GameSaveResult(
                balances.VirtualBalance,
                opponentBalance,
                recorded.SettlementAmount,
                false,
                recorded.OpponentBalanceAfter <= 0,
                recorded.OpponentBalanceAfter);
        }

        var requestedDelta = settlement.Result switch
        {
            "win" => settlement.RequestedAmount,
            "loss" => -settlement.RequestedAmount,
            _ => 0
        };
        var appliedDelta = requestedDelta >= 0
            ? Math.Min(requestedDelta, Math.Min(
                Math.Max(0, MaxVirtualBalance - balances.VirtualBalance),
                Math.Max(0, balances.OpponentBalance)))
            : -Math.Min(-requestedDelta, Math.Min(
                Math.Max(0, balances.VirtualBalance),
                Math.Max(0, MaxVirtualBalance - balances.OpponentBalance)));
        var balanceAfter = balances.VirtualBalance + appliedDelta;
        var opponentBalanceAfterSettlement = balances.OpponentBalance - appliedDelta;
        var opponentRefilled = opponentBalanceAfterSettlement <= 0;
        var opponentBalanceAfter = opponentRefilled ? OpponentRefillBalance : opponentBalanceAfterSettlement;

        await connection.ExecuteAsync(
            """
            INSERT INTO match_history
                (user_id, game_uuid, game_mode, result, final_score,
                 settlement_amount, balance_after, opponent_balance_after, summary_json)
            VALUES
                (@UserId, @GameUuid, 'matgo', @Result, @FinalScore,
                 @SettlementAmount, @BalanceAfter, @OpponentBalanceAfter, CAST(@SummaryJson AS JSON))
            """,
            new
            {
                UserId = userId,
                request.GameUuid,
                settlement.Result,
                settlement.FinalScore,
                SettlementAmount = appliedDelta,
                BalanceAfter = balanceAfter,
                OpponentBalanceAfter = opponentBalanceAfterSettlement,
                SummaryJson = BuildSummaryJson(settlement)
            }, transaction);
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET virtual_balance = @BalanceAfter,
                opponent_balance = @OpponentBalanceAfter
            WHERE id = @UserId
            """,
            new
            {
                UserId = userId,
                BalanceAfter = balanceAfter,
                OpponentBalanceAfter = opponentBalanceAfter
            }, transaction);
        await MarkCompletedAsync(connection, transaction, userId, request.GameUuid);
        await transaction.CommitAsync();
        return new GameSaveResult(
            balanceAfter,
            opponentBalanceAfter,
            appliedDelta,
            true,
            opponentRefilled,
            opponentBalanceAfterSettlement);
    }

    private static async Task<long> RefillOpponentIfEmptyAsync(
        MySqlConnector.MySqlConnection connection,
        MySqlConnector.MySqlTransaction transaction,
        long userId,
        long opponentBalance)
    {
        if (opponentBalance > 0) return opponentBalance;
        await connection.ExecuteAsync(
            "UPDATE users SET opponent_balance = @OpponentRefillBalance WHERE id = @UserId",
            new { UserId = userId, OpponentRefillBalance },
            transaction);
        return OpponentRefillBalance;
    }

    private static Task<int> MarkCompletedAsync(
        MySqlConnector.MySqlConnection connection,
        MySqlConnector.MySqlTransaction transaction,
        long userId,
        string gameUuid) => connection.ExecuteAsync(
            """
            UPDATE game_saves
            SET status = 'completed'
            WHERE user_id = @UserId AND slot_key = 'matgo-main' AND game_uuid = @GameUuid
            """,
            new { UserId = userId, GameUuid = gameUuid }, transaction);

    private static string BuildSummaryJson(MatgoSettlement settlement)
    {
        using var document = JsonDocument.Parse(settlement.SummaryJson);
        return JsonSerializer.Serialize(new
        {
            statistics = settlement.Statistics,
            settlement = document.RootElement.Clone()
        }, JsonOptions);
    }
}
