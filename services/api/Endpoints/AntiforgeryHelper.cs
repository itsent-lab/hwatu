using Microsoft.AspNetCore.Antiforgery;

namespace Hwatu.Server.Endpoints;

public static class AntiforgeryHelper
{
    public static async Task<IResult?> ValidateAsync(HttpContext context, IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            return null;
        }
        catch (AntiforgeryValidationException)
        {
            return ApiResults.Error("CSRF_FAILED", "요청이 만료되었습니다. 화면을 새로 열어 주세요.", 419);
        }
    }
}
