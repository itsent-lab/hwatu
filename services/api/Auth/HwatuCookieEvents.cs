using System.Security.Claims;
using Hwatu.Server.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Hwatu.Server.Auth;

public sealed class HwatuCookieEvents(UserRepository users) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var idValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var versionValue = context.Principal?.FindFirstValue(HwatuClaims.AuthVersion);
        if (!long.TryParse(idValue, out var userId) || !int.TryParse(versionValue, out var authVersion))
        {
            await RejectAsync(context);
            return;
        }

        var user = await users.FindByIdAsync(userId);
        if (user is not { IsActive: true } || user.AuthVersion != authVersion)
        {
            await RejectAsync(context);
        }
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
        => WriteAuthErrorAsync(
            context.Response,
            StatusCodes.Status401Unauthorized,
            "AUTH_REQUIRED",
            "로그인이 필요합니다.");

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
        => WriteAuthErrorAsync(
            context.Response,
            StatusCodes.Status403Forbidden,
            "ACCESS_DENIED",
            "이 요청을 처리할 권한이 없습니다.");

    private static Task WriteAuthErrorAsync(HttpResponse response, int statusCode, string code, string message)
    {
        response.StatusCode = statusCode;
        return response.WriteAsJsonAsync(new { ok = false, error = new { code, message } });
    }

    private static async Task RejectAsync(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }
}
