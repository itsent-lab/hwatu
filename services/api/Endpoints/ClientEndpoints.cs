namespace Hwatu.Server.Endpoints;

public static class ClientEndpoints
{
    private const int ApiVersion = 1;
    private const int MinimumMacClientVersion = 1;
    private const string MacClientName = "macos-native";

    public static IEndpointRouteBuilder MapClientEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/client/status", StatusAsync)
            .AllowAnonymous();
        return app;
    }

    private static IResult StatusAsync(HttpContext context)
    {
        var clientName = context.Request.Headers["X-Hwatu-Client"].ToString().Trim();
        var versionText = context.Request.Headers["X-Hwatu-Client-Version"].ToString().Trim();
        var hasVersion = int.TryParse(versionText, out var clientVersion);
        var isMacClient = string.Equals(clientName, MacClientName, StringComparison.Ordinal);
        var compatible = isMacClient && hasVersion && clientVersion >= MinimumMacClientVersion;

        context.Response.Headers["X-Hwatu-Api-Version"] = ApiVersion.ToString();
        return ApiResults.Ok(new
        {
            apiVersion = ApiVersion,
            minimumMacClientVersion = MinimumMacClientVersion,
            client = string.IsNullOrEmpty(clientName) ? "unknown" : clientName,
            clientVersion = hasVersion ? clientVersion : 0,
            compatible,
            authentication = "cookie-csrf",
            serverTime = DateTimeOffset.UtcNow
        });
    }
}
