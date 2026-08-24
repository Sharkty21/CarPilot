using CarPilot.Server.Models;
using CarPilot.Server.Services;

using Microsoft.AspNetCore.Mvc;

namespace CarPilot.Server.Controllers;

[ApiController]
[Route("api/vehicles/{vehicleId}/conversations")]
public class ConversationsController(IGarageService garage) : GarageControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<Conversation>> GetConversations(string vehicleId) =>
        garage.GetConversations(vehicleId) is { } conversations
            ? Ok(conversations)
            : VehicleNotFound(vehicleId);

    /// <summary>Creates or replaces a conversation; the client owns the id so a retry is idempotent.</summary>
    [HttpPut("{conversationId}")]
    public ActionResult<Conversation> SaveConversation(
        string vehicleId,
        string conversationId,
        Conversation conversation) =>
        garage.SaveConversation(vehicleId, conversationId, conversation) is { } saved
            ? Ok(saved)
            : VehicleNotFound(vehicleId);
}
