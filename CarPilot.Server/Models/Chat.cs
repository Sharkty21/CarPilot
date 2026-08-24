namespace CarPilot.Server.Models;

/// <summary>Where the assistant got an answer from, so the UI can surface it explicitly.</summary>
public class ChatCitation
{
    public string Id { get; set; } = string.Empty;

    /// <summary>"document", "record" or "web".</summary>
    public string Kind { get; set; } = "web";
    public string Label { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? Url { get; set; }

    /// <summary>Set when the citation points at a maintenance record on this vehicle.</summary>
    public string? RecordId { get; set; }
}

public class ChatAttachment
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
}

public class ChatMessage
{
    public string Id { get; set; } = string.Empty;

    /// <summary>"user" or "assistant".</summary>
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public List<ChatCitation>? Citations { get; set; }
    public List<ChatAttachment>? Attachments { get; set; }
}

public class Conversation
{
    public string Id { get; set; } = string.Empty;
    public string VehicleId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;

    /// <summary>Name of the mechanic the agent link was shared with, or null when it was the owner chatting.</summary>
    public string? SharedWith { get; set; }
    public string Date { get; set; } = string.Empty;
    public List<string> RelatedRecordIds { get; set; } = [];
    public List<ChatMessage> Messages { get; set; } = [];
}
