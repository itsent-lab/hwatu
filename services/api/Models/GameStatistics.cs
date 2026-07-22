namespace Hwatu.Server.Models;

public sealed record GameModeStatistics(
    string GameMode,
    long TotalGames,
    long Wins,
    long Losses,
    long Nagari,
    double WinRate,
    int HighestScore,
    int LongestWinStreak,
    int CurrentWinStreak,
    long TotalSettlement,
    long BiggestWinAmount,
    IReadOnlyList<string> RecentResults,
    long SpecialStatsTrackedGames,
    long TotalGoCount,
    int HighestWinningGoCount,
    long TotalSweepCount,
    int MaxSweepCount,
    long TotalBombCount,
    int MaxBombCount,
    long TotalShakeCount,
    int MaxShakeCount,
    long TotalPpeokCount,
    int MaxPpeokCount,
    long OpeningPpeokCount,
    long ThreePpeokWins,
    long PiBakWins,
    long GwangBakWins);

public sealed record PlayerGameStatistics(
    GameModeStatistics Matgo,
    GameModeStatistics Gostop);
