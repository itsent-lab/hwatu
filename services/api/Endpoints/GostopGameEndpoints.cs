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
        if (!Guid.TryParse(request.GameUuid, out _) || request.Winner is not ("human" or "computerA" or "computerB"))
            return ApiResults.Error("INVALID_GAME", "고스톱 판 정보가 올바르지 않습니다.", 422);
        if (request.FinalScore <= 0 || !PointValues.Contains(request.PointValue))
            return ApiResults.Error("INVALID_SETTLEMENT", "고스톱 정산 정보가 올바르지 않습니다.", 422);
        var amountPerOpponent = (long)request.FinalScore * request.PointValue;
        if (amountPerOpponent <= 0 || amountPerOpponent > MaxSettlementAmount)
            return ApiResults.Error("INVALID_SETTLEMENT", "고스톱 정산 금액이 올바르지 않습니다.", 422);

        var result = await games.SettleAsync(user.Id, request, amountPerOpponent);
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
