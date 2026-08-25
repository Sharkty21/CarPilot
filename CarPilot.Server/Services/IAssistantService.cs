using CarPilot.Server.Contracts;
using Microsoft.AspNetCore.Http;

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
        IReadOnlyList<IFormFile>? files = null,
        CancellationToken cancellationToken = default);
}
