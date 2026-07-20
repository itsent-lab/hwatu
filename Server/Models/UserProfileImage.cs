namespace Hwatu.Server.Models;

public sealed record UserProfileImage(byte[] Data, string ContentType, DateTime UpdatedAt);
