namespace Hwatu.Server.Models;

public sealed record MatgoSettlement(
    string Result,
    int FinalScore,
    long RequestedAmount,
    string SummaryJson);

public sealed record GameSaveResult(
    long VirtualBalance,
    long OpponentBalance,
    long SettlementAmount,
    bool SettlementApplied,
    bool OpponentRefilled = false,
    long? OpponentBalanceAfterSettlement = null);

public sealed record PlayerBalances(long VirtualBalance, long OpponentBalance);

public sealed class RecordedSettlement
{
    public long SettlementAmount { get; init; }
    public long BalanceAfter { get; init; }
    public long OpponentBalanceAfter { get; init; }
}
