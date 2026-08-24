using CarPilot.Server.Contracts;

namespace CarPilot.Server.Services;

public interface IAssistantService
{
    /// <summary>Answers a question about a vehicle, or returns null when the vehicle is unknown.</summary>
    AssistantAnswer? Ask(string vehicleId, AskAssistantRequest request);
}
