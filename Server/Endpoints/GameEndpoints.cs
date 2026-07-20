using System.Text.Json;
using Hwatu.Server.Auth;
using Hwatu.Server.Data;
using Hwatu.Server.Models;
using Microsoft.AspNetCore.Antiforgery;

namespace Hwatu.Server.Endpoints;

public static class GameEndpoints
{
    private const int MaxSaveBytes = 524_288;
    private static readonly int[] MatgoPointValues = [100, 1_000, 2_000, 5_000, 10_000];
    private const long MaxSettlementAmount = 100_000_000;

    public static IEndpointRouteBuilder MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var games = app.MapGroup("/api/games").RequireAuthorization();
        games.MapGet("/matgo", LoadMatgoAsync);
        games.MapPut("/matgo", SaveMatgoAsync);
        return app;
    }

    private static async Task<IResult> LoadMatgoAsync(HttpContext context, SessionService sessions, GameRepository games)
    {
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        var save = await games.LoadMatgoAsync(user.Id);
        if (save is null) return ApiResults.Ok();
        using var document = JsonDocument.Parse(save.StateJson);
        return ApiResults.Ok(new
        {
            save.GameUuid,
            save.GameMode,
            save.Status,
            save.StateVersion,
            save.TurnNumber,
            state = document.RootElement.Clone(),
            save.DeviceId,
            save.UpdatedAt
        });
    }

    private static async Task<IResult> SaveMatgoAsync(
        SaveGameRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions,
        GameRepository games)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        if (!Guid.TryParse(request.GameUuid, out _) || request.GameMode != "matgo")
            return ApiResults.Error("INVALID_GAME", "게임 식별 정보가 올바르지 않습니다.", 422);
        if (request.StateVersion < 1 || request.TurnNumber < 0 || !Validation.IsDeviceId(request.DeviceId))
            return ApiResults.Error("INVALID_STATE_META", "저장 상태 정보가 올바르지 않습니다.", 422);

        var stateJson = request.State.GetRawText();
        if (System.Text.Encoding.UTF8.GetByteCount(stateJson) > MaxSaveBytes)
            return ApiResults.Error("STATE_TOO_LARGE", "게임 저장 데이터가 너무 큽니다.", 413);
        if (!TryReadSettlement(request.State, out var settlement))
            return ApiResults.Error("INVALID_SETTLEMENT", "게임머니 정산 정보가 올바르지 않습니다.", 422);
        if (settlement is null && request.TurnNumber == 0 && user.VirtualBalance <= 0)
            return ApiResults.Error("BALANCE_EMPTY", "메인 화면에서 게임머니를 리필한 뒤 새 판을 시작해 주세요.", 409);

        var result = await games.SaveMatgoAsync(user.Id, request, stateJson, settlement);
        return ApiResults.Ok(new
        {
            request.GameUuid,
            request.TurnNumber,
            savedAt = DateTimeOffset.UtcNow,
            balance = result.VirtualBalance,
            opponentBalance = result.OpponentBalance,
            settlementAmount = result.SettlementAmount,
            settlementApplied = result.SettlementApplied,
            opponentRefilled = result.OpponentRefilled,
            opponentBalanceAfterSettlement = result.OpponentBalanceAfterSettlement
        });
    }

    private static bool TryReadSettlement(JsonElement state, out MatgoSettlement? settlement)
    {
        settlement = null;
        if (!state.TryGetProperty("phase", out var phase) || phase.GetString() != "round-ended") return true;
        if (!state.TryGetProperty("roundResult", out var roundResult)) return false;
        if (roundResult.GetString() == "nagari")
        {
            settlement = new MatgoSettlement("nagari", 0, 0, "{}");
            return true;
        }
        if (roundResult.GetString() != "win" ||
            !state.TryGetProperty("winner", out var winner) ||
            !state.TryGetProperty("settlement", out var result) ||
            result.ValueKind != JsonValueKind.Object ||
            !result.TryGetProperty("finalScore", out var finalScoreElement) ||
            !finalScoreElement.TryGetInt32(out var finalScore) || finalScore <= 0 ||
            !result.TryGetProperty("pointValue", out var pointValueElement) ||
            !pointValueElement.TryGetInt32(out var pointValue) || !MatgoPointValues.Contains(pointValue) ||
            !result.TryGetProperty("displayAmount", out var amountElement) ||
            !amountElement.TryGetInt64(out var amount) || amount <= 0 || amount > MaxSettlementAmount ||
            amount != (long)finalScore * pointValue)
        {
            return false;
        }

        var winnerName = winner.GetString();
        if (winnerName is not ("human" or "computer")) return false;
        settlement = new MatgoSettlement(
            winnerName == "human" ? "win" : "loss",
            finalScore,
            amount,
            result.GetRawText());
        return true;
    }
}
