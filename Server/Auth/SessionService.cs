using System.Security.Claims;
using Hwatu.Server.Data;
using Hwatu.Server.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Hwatu.Server.Auth;

public sealed class SessionService(UserRepository users)
{
    public async Task SignInAsync(HttpContext context, AppUser user, bool remember)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role),
            new(HwatuClaims.DisplayName, user.DisplayName),
            new(HwatuClaims.AuthVersion, user.AuthVersion.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties
            {
                IsPersistent = remember,
                AllowRefresh = true,
                ExpiresUtc = remember ? DateTimeOffset.UtcNow.AddDays(90) : null
            });
    }

    public Task SignOutAsync(HttpContext context) =>
        context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    public async Task<AppUser?> CurrentUserAsync(ClaimsPrincipal principal)
    {
        var idValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(idValue, out var userId))
        {
            return null;
        }

        var user = await users.FindByIdAsync(userId);
        return user is { IsActive: true } ? user : null;
    }
}
