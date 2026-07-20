using System.Text.Json;
using Dapper;
using Hwatu.Server.Models;

namespace Hwatu.Server.Data;

public sealed class GostopGameRepository(HwatuDb database)
{
    private const long MaxVirtualBalance = 999_999_999_999;

    public async Task<GostopSettlementResult> SettleAsync(
        long userId,
        GostopSettlementRequest request,
        long amountPerOpponent)
    {
        await using var connection = database.OpenConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        var balances = await connection.QuerySingleAsync<GostopPlayerBalances>(
            """
            SELECT virtual_balance AS VirtualBalance,
                   gostop_computer_a_balance AS ComputerABalance,
                   gostop_computer_b_balance AS ComputerBBalance
            FROM users
            WHERE id = @UserId
            FOR UPDATE
            """,
            new { UserId = userId }, transaction);
        var recordedAmount = await connection.QuerySingleOrDefaultAsync<long?>(
            """
            SELECT settlement_amount
            FROM match_history
            WHERE user_id = @UserId AND game_uuid = @GameUuid
            FOR UPDATE
            """,
            new { UserId = userId, request.GameUuid }, transaction);
        if (recordedAmount is not null)
        {
            await transaction.CommitAsync();
            return new GostopSettlementResult(
                balances.VirtualBalance,
                balances.ComputerABalance,
                balances.ComputerBBalance,
                recordedAmount.Value,
                false);
        }

        var human = balances.VirtualBalance;
        var computerA = balances.ComputerABalance;
        var computerB = balances.ComputerBBalance;
        switch (request.Winner)
        {
            case "human":
                Transfer(ref computerA, ref human, amountPerOpponent);
                Transfer(ref computerB, ref human, amountPerOpponent);
                break;
            case "computerA":
                Transfer(ref human, ref computerA, amountPerOpponent);
                Transfer(ref computerB, ref computerA, amountPerOpponent);
                break;
            case "computerB":
                Transfer(ref human, ref computerB, amountPerOpponent);
                Transfer(ref computerA, ref computerB, amountPerOpponent);
                break;
        }
        var humanDelta = human - balances.VirtualBalance;
        var summary = JsonSerializer.Serialize(new
        {
            request.Winner,
            request.FinalScore,
            request.PointValue,
            AmountPerOpponent = amountPerOpponent,
            ComputerABalanceAfter = computerA,
            ComputerBBalanceAfter = computerB
        });
        await connection.ExecuteAsync(
            """
            INSERT INTO match_history
                (user_id, game_uuid, game_mode, result, final_score,
                 settlement_amount, balance_after, opponent_balance_after,
                 gostop_computer_a_balance_after, gostop_computer_b_balance_after, summary_json)
            VALUES
                (@UserId, @GameUuid, 'gostop', @Result, @FinalScore,
                 @SettlementAmount, @BalanceAfter, @ComputerABalance,
                 @ComputerABalance, @ComputerBBalance, CAST(@SummaryJson AS JSON))
            """,
            new
            {
                UserId = userId,
                request.GameUuid,
                Result = request.Winner == "human" ? "win" : "loss",
                request.FinalScore,
                SettlementAmount = humanDelta,
                BalanceAfter = human,
                ComputerABalance = computerA,
                ComputerBBalance = computerB,
                SummaryJson = summary
            }, transaction);
        await connection.ExecuteAsync(
            """
            UPDATE users
            SET virtual_balance = @VirtualBalance,
                gostop_computer_a_balance = @ComputerABalance,
                gostop_computer_b_balance = @ComputerBBalance
            WHERE id = @UserId
            """,
            new
            {
                UserId = userId,
                VirtualBalance = human,
                ComputerABalance = computerA,
                ComputerBBalance = computerB
            }, transaction);
        await transaction.CommitAsync();
        return new GostopSettlementResult(human, computerA, computerB, humanDelta, true);
    }

    private static long Transfer(ref long loser, ref long winner, long requested)
    {
        var payment = Math.Min(requested, Math.Min(Math.Max(0, loser), Math.Max(0, MaxVirtualBalance - winner)));
        loser -= payment;
        winner += payment;
        return payment;
    }
}
