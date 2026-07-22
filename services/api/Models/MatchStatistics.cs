namespace Hwatu.Server.Models;

public sealed record MatchStatistics
{
    public int Version { get; init; } = 1;
    public int GoCount { get; init; }
    public int SweepCount { get; init; }
    public int BombCount { get; init; }
    public int ShakeCount { get; init; }
    public int PpeokCount { get; init; }
    public int OpeningPpeokCount { get; init; }
    public bool ThreePpeokWin { get; init; }
    public bool PiBakWin { get; init; }
    public bool GwangBakWin { get; init; }
}
