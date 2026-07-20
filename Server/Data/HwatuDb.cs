using MySqlConnector;

namespace Hwatu.Server.Data;

public sealed class HwatuDb(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("Hwatu")
        ?? throw new InvalidOperationException("ConnectionStrings:Hwatu 설정이 필요합니다.");

    public MySqlConnection OpenConnection()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings:Hwatu 설정이 비어 있습니다.");
        }

        return new MySqlConnection(_connectionString);
    }
}
