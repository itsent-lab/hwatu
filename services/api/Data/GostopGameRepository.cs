using System.Text.Json;
using Dapper;
using Hwatu.Server.Models;

namespace Hwatu.Server.Data;

public sealed class GostopGameRepository(HwatuDb database)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const long MaxVirtualBalance = 999_999_999_999;
    private const long ComputerRefillBalance = 500_000;

    public async Task<GostopSettlementResult> SettleAsync(
        long userId,
        GostopSettlementRequest request,
        string roundResult,
        long humanRequestedDelta,
        long computerARequestedDelta,
        long computerBRequestedDelta)
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
        ApplyRequestedDeltas(
            ref human, ref computerA, ref computerB,
            humanRequestedDelta, computerARequestedDelta, computerBRequestedDelta);
        if (computerA == 0) computerA = ComputerRefillBalance;
        if (computerB == 0) computerB = ComputerRefillBalance;
        var humanDelta = human - balances.VirtualBalance;
        var summary = JsonSerializer.Serialize(new
        {
            request.Winner,
            RoundResult = roundResult,
            request.FinalScore,
            request.PointValue,
            RequestedDeltas = new { humanRequestedDelta, computerARequestedDelta, computerBRequestedDelta },
            ComputerABalanceAfter = computerA,
            ComputerBBalanceAfter = computerB,
            statistics = request.Statistics ?? new MatchStatistics()
        }, JsonOptions);
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
                Result = roundResult == "nagari" ? "nagari" : request.Winner == "human" ? "win" : "loss",
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

    private static void ApplyRequestedDeltas(
        ref long human,
        ref long computerA,
        ref long computerB,
        long humanRequested,
        long computerARequested,
        long computerBRequested)
    {
        var current = new[] { human, computerA, computerB };
        var requested = new[] { humanRequested, computerARequested, computerBRequested };
        var credits = requested.Select(value => Math.Max(0, value)).ToArray();
        for (var debtor = 0; debtor < requested.Length; debtor++)
        {
            var debt = Math.Max(0, -requested[debtor]);
            for (var creditor = 0; creditor < requested.Length && debt > 0 && current[debtor] > 0; creditor++)
            {
                if (credits[creditor] <= 0) continue;
                var payment = Math.Min(debt, credits[creditor]);
                payment = Math.Min(payment, Math.Max(0, current[debtor]));
                payment = Math.Min(payment, Math.Max(0, MaxVirtualBalance - current[creditor]));
                current[debtor] -= payment;
                current[creditor] += payment;
                debt -= payment;
                credits[creditor] -= payment;
            }
        }
        human = current[0];
        computerA = current[1];
        computerB = current[2];
    }
}
