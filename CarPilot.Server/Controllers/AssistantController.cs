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
    [RequestSizeLimit(50_000_000)]
    public async Task StreamAsk(string vehicleId, CancellationToken cancellationToken)
    {
        var request = new AskAssistantRequest();
        IReadOnlyList<IFormFile> files = [];

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(cancellationToken);
            request.Question = form["question"].ToString();
            request.ThreadId = form["threadId"].ToString();
            files = form.Files.GetFiles("files");
        }
        else
        {
            var body = await Request.ReadFromJsonAsync<AskAssistantRequest>(cancellationToken);
            if (body is not null)
            {
                request = body;
            }
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        await foreach (var evt in assistant.AskStreamAsync(vehicleId, request, files, cancellationToken))
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
