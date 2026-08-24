using System.Text.Json;

using CarPilot.Server.Contracts;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicles/{vehicleId}/assistant")]
public class AssistantController(IAssistantService assistant) : GarageControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Streams assistant tokens and tool/citation events as Server-Sent Events.</summary>
    [HttpPost("ask/stream")]
    public async Task StreamAsk(
        string vehicleId,
        [FromBody] AskAssistantRequest request,
        CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        await foreach (var evt in assistant.AskStreamAsync(vehicleId, request, cancellationToken))
        {
            var json = JsonSerializer.Serialize(evt, JsonOptions);
            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            if (evt.Type is "done" or "error")
            {
                break;
            }
        }
    }
}
