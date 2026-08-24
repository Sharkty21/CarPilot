using CarPilot.Server.Contracts;

namespace CarPilot.Server.Services;

public interface IAssistantService
{
    /// <summary>
    /// Streams assistant events (tokens, citations, tools, done/error) from carpilot-ai.
    /// Yields a single error event when the vehicle is unknown or the AI service fails.
    /// </summary>
    IAsyncEnumerable<AssistantStreamEvent> AskStreamAsync(
        string vehicleId,
        AskAssistantRequest request,
        CancellationToken cancellationToken = default);
}
