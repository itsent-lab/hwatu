namespace Hwatu.Server.Models;

public sealed record GostopSettlementRequest(
    string GameUuid,
    string? Winner,
    int FinalScore,
    int PointValue,
    string? RoundResult = null,
    int HumanPoints = 0,
    int ComputerAPoints = 0,
    int ComputerBPoints = 0);

public sealed record GostopSettlementResult(
    long VirtualBalance,
    long ComputerABalance,
    long ComputerBBalance,
    long SettlementAmount,
    bool SettlementApplied);

public sealed record GostopPlayerBalances(
    long VirtualBalance,
    long ComputerABalance,
    long ComputerBBalance);
