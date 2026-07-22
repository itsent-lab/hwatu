using System.Text.Json;
using Dapper;
using Hwatu.Server.Models;

namespace Hwatu.Server.Data;

public sealed class StatisticsRepository(HwatuDb database)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<PlayerGameStatistics> GetAsync(long userId)
    {
        const string sql = """
            SELECT game_mode AS GameMode,
                   result AS Result,
                   final_score AS FinalScore,
                   settlement_amount AS SettlementAmount,
                   summary_json AS SummaryJson
            FROM match_history
            WHERE user_id = @UserId
            ORDER BY played_at, id
            """;
        await using var connection = database.OpenConnection();
        var rows = await connection.QueryAsync<MatchHistoryStatisticsRow>(sql, new { UserId = userId });
        var matgo = new StatisticsAccumulator("matgo");
        var gostop = new StatisticsAccumulator("gostop");
        foreach (var row in rows)
        {
            (row.GameMode == "gostop" ? gostop : matgo).Add(row);
        }
        return new PlayerGameStatistics(matgo.Build(), gostop.Build());
    }

    private static MatchStatistics? ReadStatistics(string? summaryJson)
    {
        if (string.IsNullOrWhiteSpace(summaryJson)) return null;
        try
        {
            using var document = JsonDocument.Parse(summaryJson);
            if (!document.RootElement.TryGetProperty("statistics", out var statistics)) return null;
            return statistics.Deserialize<MatchStatistics>(JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed class StatisticsAccumulator(string gameMode)
    {
        private long totalGames;
        private long wins;
        private long losses;
        private long nagari;
        private int highestScore;
        private int longestStreak;
        private int currentStreak;
        private long totalSettlement;
        private long biggestWinAmount;
        private readonly List<string> recentResults = [];
        private long trackedGames;
        private long totalGo;
        private int maxWinningGo;
        private long totalSweep;
        private int maxSweep;
        private long totalBomb;
        private int maxBomb;
        private long totalShake;
        private int maxShake;
        private long totalPpeok;
        private int maxPpeok;
        private long openingPpeok;
        private long threePpeokWins;
        private long piBakWins;
        private long gwangBakWins;

        public void Add(MatchHistoryStatisticsRow row)
        {
            totalGames += 1;
            totalSettlement += row.SettlementAmount;
            biggestWinAmount = Math.Max(biggestWinAmount, row.SettlementAmount);
            recentResults.Add(row.Result);
            switch (row.Result)
            {
                case "win":
                    wins += 1;
                    highestScore = Math.Max(highestScore, row.FinalScore);
                    currentStreak += 1;
                    longestStreak = Math.Max(longestStreak, currentStreak);
                    break;
                case "loss":
                    losses += 1;
                    currentStreak = 0;
                    break;
                default:
                    nagari += 1;
                    break;
            }

            var statistics = ReadStatistics(row.SummaryJson);
            if (statistics is null) return;
            trackedGames += 1;
            totalGo += statistics.GoCount;
            if (row.Result == "win") maxWinningGo = Math.Max(maxWinningGo, statistics.GoCount);
            totalSweep += statistics.SweepCount;
            maxSweep = Math.Max(maxSweep, statistics.SweepCount);
            totalBomb += statistics.BombCount;
            maxBomb = Math.Max(maxBomb, statistics.BombCount);
            totalShake += statistics.ShakeCount;
            maxShake = Math.Max(maxShake, statistics.ShakeCount);
            totalPpeok += statistics.PpeokCount;
            maxPpeok = Math.Max(maxPpeok, statistics.PpeokCount);
            openingPpeok += statistics.OpeningPpeokCount;
            if (statistics.ThreePpeokWin) threePpeokWins += 1;
            if (statistics.PiBakWin) piBakWins += 1;
            if (statistics.GwangBakWin) gwangBakWins += 1;
        }

        public GameModeStatistics Build()
        {
            var decisiveGames = wins + losses;
            var winRate = decisiveGames == 0 ? 0 : Math.Round(wins * 100d / decisiveGames, 1);
            return new GameModeStatistics(
                gameMode, totalGames, wins, losses, nagari, winRate, highestScore,
                longestStreak, currentStreak, totalSettlement, biggestWinAmount,
                recentResults.TakeLast(5).Reverse().ToArray(), trackedGames,
                totalGo, maxWinningGo, totalSweep, maxSweep, totalBomb, maxBomb,
                totalShake, maxShake, totalPpeok, maxPpeok, openingPpeok,
                threePpeokWins, piBakWins, gwangBakWins);
        }
    }

    private sealed class MatchHistoryStatisticsRow
    {
        public string GameMode { get; init; } = "";
        public string Result { get; init; } = "";
        public int FinalScore { get; init; }
        public long SettlementAmount { get; init; }
        public string? SummaryJson { get; init; }
    }
}
