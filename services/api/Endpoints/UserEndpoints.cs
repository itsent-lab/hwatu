using Hwatu.Server.Auth;
using Hwatu.Server.Data;
using Hwatu.Server.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using MySqlConnector;

namespace Hwatu.Server.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/session", SessionAsync).RequireAuthorization();
        app.MapGet("/api/dashboard", DashboardAsync).RequireAuthorization();
        app.MapPost("/api/balance/refill", RefillBalanceAsync).RequireAuthorization();
        app.MapGet("/api/profile/image/{userId:long}/{version:long}", ProfileImageAsync).RequireAuthorization();
        app.MapPut("/api/profile/image", SaveProfileImageAsync).RequireAuthorization();

        var users = app.MapGroup("/api/users").RequireAuthorization(policy => policy.RequireRole("admin"));
        users.MapGet("/", ListAsync);
        users.MapPost("/", CreateAsync);
        users.MapPatch("/{id:long}/status", ToggleStatusAsync);
        users.MapPut("/{id:long}/password", ChangePasswordAsync);
        return app;
    }

    private static async Task<IResult> SessionAsync(
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions)
    {
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null)
        {
            return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        }

        var tokens = antiforgery.GetAndStoreTokens(context);
        var deviceId = context.Request.Cookies["hwatu_device"];
        if (!Validation.IsDeviceId(deviceId) || string.IsNullOrEmpty(deviceId))
        {
            deviceId = Guid.NewGuid().ToString("N");
            context.Response.Cookies.Append("hwatu_device", deviceId, new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddYears(3),
                HttpOnly = false,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/"
            });
        }

        return ApiResults.Ok(new
        {
            user = AuthEndpoints.ToClient(user),
            csrfToken = tokens.RequestToken,
            deviceId
        });
    }

    private static async Task<IResult> DashboardAsync(
        HttpContext context,
        SessionService sessions,
        UserRepository users,
        GameRepository games,
        StatisticsRepository statistics)
    {
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        var save = await games.LoadMatgoAsync(user.Id);
        var today = await users.TodayStatsAsync(user.Id);
        var gameStats = await statistics.GetAsync(user.Id);
        return ApiResults.Ok(new
        {
            user = AuthEndpoints.ToClient(user),
            activeSave = save is null ? null : new { save.GameUuid, save.TurnNumber, save.UpdatedAt },
            today,
            gameStats
        });
    }

    private static async Task<IResult> RefillBalanceAsync(
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions,
        UserRepository users)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        var balance = await users.RefillVirtualBalanceAsync(user.Id);
        return balance is { } refilled
            ? ApiResults.Ok(new { balance = refilled })
            : ApiResults.Error("REFILL_NOT_ALLOWED", "게임머니가 0냥일 때만 리필할 수 있습니다.", 409);
    }

    private static async Task<IResult> ProfileImageAsync(
        long userId,
        long version,
        HttpContext context,
        SessionService sessions,
        UserRepository users)
    {
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        if (user.Id != userId || user.ProfileImageUpdatedAt?.Ticks != version) return Results.NotFound();
        var image = await users.GetProfileImageAsync(user.Id);
        if (image is null) return Results.NotFound();
        context.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
        return Results.File(image.Data, image.ContentType);
    }

    private static async Task<IResult> SaveProfileImageAsync(
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions,
        UserRepository users)
    {
        const long maxRequestBytes = 2 * 1024 * 1024;
        const long maxImageBytes = 1536 * 1024;
        if (!context.Request.HasFormContentType || context.Request.ContentLength is null or > maxRequestBytes)
            return ApiResults.Error("INVALID_PROFILE_IMAGE", "2MB 이하의 사진을 선택해 주세요.", 413);
        var bodySize = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (bodySize is { IsReadOnly: false }) bodySize.MaxRequestBodySize = maxRequestBytes;
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var user = await sessions.CurrentUserAsync(context.User);
        if (user is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        var form = await context.Request.ReadFormAsync(context.RequestAborted);
        var file = form.Files.GetFile("image");
        if (file is null || file.Length is <= 3 or > maxImageBytes)
            return ApiResults.Error("INVALID_PROFILE_IMAGE", "등록할 사진을 다시 선택해 주세요.", 422);
        await using var stream = new MemoryStream((int)file.Length);
        await file.CopyToAsync(stream, context.RequestAborted);
        var data = stream.ToArray();
        if (data[0] != 0xff || data[1] != 0xd8 || data[2] != 0xff)
            return ApiResults.Error("INVALID_PROFILE_IMAGE", "지원하지 않는 사진 형식입니다.", 422);
        if (!await users.SaveProfileImageAsync(user.Id, data, "image/jpeg"))
            return ApiResults.Error("USER_NOT_FOUND", "회원 정보를 찾을 수 없습니다.", 404);
        var updated = await users.FindByIdAsync(user.Id);
        return updated is null
            ? ApiResults.Error("USER_NOT_FOUND", "회원 정보를 찾을 수 없습니다.", 404)
            : ApiResults.Ok(AuthEndpoints.ToClient(updated));
    }

    private static async Task<IResult> ListAsync(UserRepository users) =>
        ApiResults.Ok((await users.ListAsync()).Select(user => new
        {
            user.Id,
            user.Username,
            user.DisplayName,
            user.Role,
            user.IsActive,
            user.VirtualBalance,
            user.OpponentBalance,
            user.GostopComputerABalance,
            user.GostopComputerBBalance,
            user.LastLoginAt,
            user.CreatedAt
        }));

    private static async Task<IResult> CreateAsync(
        CreateUserRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        UserRepository users,
        IPasswordHasher<AppUser> passwordHasher)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var username = Validation.NormalizeUsername(request.Username);
        var displayName = request.DisplayName?.Trim() ?? "";
        if (!Validation.IsUsername(username) || !Validation.IsDisplayName(displayName) || !Validation.IsPassword(request.Password))
        {
            return ApiResults.Error("INVALID_MEMBER", "3자 이상의 한글·영문·숫자·밑줄 아이디, 표시 이름과 15자 이상의 비밀번호를 확인해 주세요.", 422);
        }

        var draft = new AppUser { Username = username, DisplayName = displayName };
        try
        {
            var id = await users.CreateAsync(
                username,
                displayName,
                passwordHasher.HashPassword(draft, request.Password),
                "member");
            return ApiResults.Ok(new { id }, StatusCodes.Status201Created);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return ApiResults.Error("USERNAME_EXISTS", "이미 사용 중인 아이디입니다.", 409);
        }
    }

    private static async Task<IResult> ToggleStatusAsync(
        long id,
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions,
        UserRepository users)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        var current = await sessions.CurrentUserAsync(context.User);
        if (current is null) return ApiResults.Error("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        if (current.Id == id) return ApiResults.Error("SELF_DISABLE", "현재 관리자 계정은 중지할 수 없습니다.", 422);
        return await users.ToggleActiveAsync(id)
            ? ApiResults.Ok()
            : ApiResults.Error("USER_NOT_FOUND", "회원을 찾을 수 없습니다.", 404);
    }

    private static async Task<IResult> ChangePasswordAsync(
        long id,
        ChangePasswordRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        UserRepository users,
        IPasswordHasher<AppUser> passwordHasher)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError) return csrfError;
        if (!Validation.IsPassword(request.Password))
            return ApiResults.Error("INVALID_PASSWORD", "새 비밀번호는 15자 이상 입력해 주세요.", 422);
        var user = await users.FindByIdAsync(id);
        if (user is null) return ApiResults.Error("USER_NOT_FOUND", "회원을 찾을 수 없습니다.", 404);
        var hash = passwordHasher.HashPassword(user, request.Password);
        await users.ChangePasswordAsync(id, hash);
        return ApiResults.Ok();
    }
}
