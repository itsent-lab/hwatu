using Hwatu.Server.Auth;
using Hwatu.Server.Data;
using Hwatu.Server.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using MySqlConnector;

namespace Hwatu.Server.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", async (UserRepository users, IConfiguration configuration) =>
            ApiResults.Ok(new
            {
                needsBootstrap = await users.CountAsync() == 0,
                bootstrapEnabled = BootstrapTokenVerifier.IsConfigured(configuration)
            }));

        group.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
        {
            var tokens = antiforgery.GetAndStoreTokens(context);
            return ApiResults.Ok(new { csrfToken = tokens.RequestToken });
        });

        group.MapPost("/bootstrap", BootstrapAsync).RequireRateLimiting("login");
        group.MapPost("/login", LoginAsync).RequireRateLimiting("login");
        group.MapPost("/logout", LogoutAsync).RequireAuthorization();

        return app;
    }

    private static async Task<IResult> BootstrapAsync(
        BootstrapRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        IConfiguration configuration,
        UserRepository users,
        IPasswordHasher<AppUser> passwordHasher,
        SessionService sessions)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError)
        {
            return csrfError;
        }
        if (!BootstrapTokenVerifier.Verify(configuration, request.SetupToken))
        {
            return ApiResults.Error("BOOTSTRAP_FORBIDDEN", "서버에 설정한 초기 설정 토큰을 확인해 주세요.", 403);
        }

        var username = Validation.NormalizeUsername(request.Username);
        var displayName = request.DisplayName?.Trim() ?? "";
        if (!Validation.IsUsername(username))
        {
            return ApiResults.Error("INVALID_USERNAME", "아이디는 한글, 영문 소문자, 숫자, 밑줄로 3~30자 입력해 주세요.", 422);
        }
        if (!Validation.IsDisplayName(displayName))
        {
            return ApiResults.Error("INVALID_DISPLAY_NAME", "표시 이름은 1~20자로 입력해 주세요.", 422);
        }
        if (!Validation.IsPassword(request.Password) || request.Password != request.PasswordConfirm)
        {
            return ApiResults.Error("INVALID_PASSWORD", "15자 이상의 동일한 비밀번호를 입력해 주세요.", 422);
        }

        var draft = new AppUser { Username = username, DisplayName = displayName, Role = "admin" };
        try
        {
            var id = await users.TryCreateInitialAdminAsync(
                username,
                displayName,
                passwordHasher.HashPassword(draft, request.Password));
            if (id is null)
            {
                return ApiResults.Error("BOOTSTRAP_CLOSED", "첫 관리자 생성은 이미 완료되었습니다.", 409);
            }
            var user = await users.FindByIdAsync(id.Value) ?? throw new InvalidOperationException("관리자 계정을 찾을 수 없습니다.");
            await sessions.SignInAsync(context, user, true);
            return ApiResults.Ok(ToClient(user), StatusCodes.Status201Created);
        }
        catch (MySqlException exception) when (exception.Number == 1062)
        {
            return ApiResults.Error("USERNAME_EXISTS", "이미 사용 중인 아이디입니다.", 409);
        }
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        UserRepository users,
        IPasswordHasher<AppUser> passwordHasher,
        SessionService sessions)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError)
        {
            return csrfError;
        }

        var username = Validation.NormalizeUsername(request.Username);
        var user = await users.FindByUsernameAsync(username);
        var verification = VerifyPassword(user, request.Password, passwordHasher);
        if (user is not { IsActive: true } || !verification.IsValid)
        {
            return ApiResults.Error("LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다.", 401);
        }

        if (verification.NeedsUpgrade)
        {
            await users.ChangePasswordAsync(user.Id, passwordHasher.HashPassword(user, request.Password));
            user = await users.FindByIdAsync(user.Id)
                ?? throw new InvalidOperationException("비밀번호를 전환한 회원을 찾을 수 없습니다.");
        }

        await users.TouchLoginAsync(user.Id);
        await sessions.SignInAsync(context, user, request.Remember);
        return ApiResults.Ok(ToClient(user));
    }

    private static async Task<IResult> LogoutAsync(
        HttpContext context,
        IAntiforgery antiforgery,
        SessionService sessions)
    {
        if (await AntiforgeryHelper.ValidateAsync(context, antiforgery) is { } csrfError)
        {
            return csrfError;
        }
        await sessions.SignOutAsync(context);
        return ApiResults.Ok();
    }

    public static object ToClient(AppUser user) => new
    {
        user.Id,
        user.Username,
        user.DisplayName,
        user.Role,
        user.VirtualBalance,
        user.OpponentBalance,
        user.GostopComputerABalance,
        user.GostopComputerBBalance,
        ProfileImageUrl = user.ProfileImageUpdatedAt is { } updatedAt
            ? $"/api/profile/image/{user.Id}/{updatedAt.Ticks}"
            : null
    };

    private static (bool IsValid, bool NeedsUpgrade) VerifyPassword(
        AppUser? user,
        string password,
        IPasswordHasher<AppUser> passwordHasher)
    {
        if (user is null || string.IsNullOrEmpty(password)) return (false, false);
        try
        {
            var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
            return (result != PasswordVerificationResult.Failed, result == PasswordVerificationResult.SuccessRehashNeeded);
        }
        catch (FormatException) when (user.PasswordHash.StartsWith("$2", StringComparison.Ordinal))
        {
            try
            {
                return (BCrypt.Net.BCrypt.Verify(password, user.PasswordHash), true);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                return (false, false);
            }
        }
    }
}
