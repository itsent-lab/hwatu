using Hwatu.Server.Auth;
using Hwatu.Server.Data;
using Hwatu.Server.Models;
using Microsoft.AspNetCore.Antiforgery;

namespace Hwatu.Server.Endpoints;

public static class GostopGameEndpoints
{
    private static readonly int[] PointValues = [100, 1_000, 2_000, 5_000, 10_000];
    private const long MaxSettlementAmount = 100_000_000;

    public static IEndpointRouteBuilder MapGostopGameEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/games/gostop/settle", SettleAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> SettleAsync(
        GostopSettlementRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions,
        GostopGameRepository games)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        if (!Guid.TryParse(request.GameUuid, out _))
            return ApiResults.Error("INVALID_GAME", "고스톱 판 정보가 올바르지 않습니다.", 422);
        var legacyRequest = request.RoundResult is null
            && request.HumanPoints == 0 && request.ComputerAPoints == 0 && request.ComputerBPoints == 0;
        var roundResult = request.RoundResult ?? "win";
        if (roundResult is not ("win" or "nagari")
            || (roundResult == "win" && (request.Winner is not ("human" or "computerA" or "computerB") || request.FinalScore <= 0))
            || (roundResult == "nagari" && (request.Winner is not null || request.FinalScore != 0))
            || !PointValues.Contains(request.PointValue))
            return ApiResults.Error("INVALID_SETTLEMENT", "고스톱 정산 정보가 올바르지 않습니다.", 422);
        long humanPoints = request.HumanPoints;
        long computerAPoints = request.ComputerAPoints;
        long computerBPoints = request.ComputerBPoints;
        if (legacyRequest)
        {
            humanPoints = request.Winner == "human" ? request.FinalScore * 2L : -request.FinalScore;
            computerAPoints = request.Winner == "computerA" ? request.FinalScore * 2L : -request.FinalScore;
            computerBPoints = request.Winner == "computerB" ? request.FinalScore * 2L : -request.FinalScore;
        }
        var humanAmount = (long)humanPoints * request.PointValue;
        var computerAAmount = (long)computerAPoints * request.PointValue;
        var computerBAmount = (long)computerBPoints * request.PointValue;
        if (humanPoints + computerAPoints + computerBPoints != 0
            || Math.Abs(humanAmount) > MaxSettlementAmount
            || Math.Abs(computerAAmount) > MaxSettlementAmount
            || Math.Abs(computerBAmount) > MaxSettlementAmount)
            return ApiResults.Error("INVALID_SETTLEMENT", "고스톱 정산 금액이 올바르지 않습니다.", 422);

        var result = await games.SettleAsync(user.Id, request, roundResult, humanAmount, computerAAmount, computerBAmount);
        return ApiResults.Ok(new
        {
            request.GameUuid,
            balance = result.VirtualBalance,
            computerABalance = result.ComputerABalance,
            computerBBalance = result.ComputerBBalance,
            settlementAmount = result.SettlementAmount,
            settlementApplied = result.SettlementApplied
        });
    }
}
