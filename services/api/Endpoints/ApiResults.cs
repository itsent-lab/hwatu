namespace Hwatu.Server.Endpoints;

public static class ApiResults
{
    public static IResult Ok(object? data = null, int statusCode = StatusCodes.Status200OK) =>
        Results.Json(new { ok = true, data }, statusCode: statusCode);

    public static IResult Error(string code, string message, int statusCode) =>
        Results.Json(new { ok = false, error = new { code, message } }, statusCode: statusCode);
}
