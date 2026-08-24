export type ChatRole = "user" | "assistant";

/** Where the assistant got an answer from, so the UI can surface it explicitly. */
export type CitationKind = "document" | "record" | "web";

export interface ChatCitation {
  id: string;
  kind: CitationKind;
  label: string;
  detail?: string;
  url?: string;
  /** Set when the citation points at a maintenance record on this vehicle. */
  recordId?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  citations?: ChatCitation[];
  attachments?: ChatAttachment[];
  /** True while tokens are still arriving from the model. */
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  vehicleId: string;
  summary: string;
  /** Name of the mechanic the agent link was shared with, or null when it was the owner chatting. */
  sharedWith: string | null;
  date: string;
  relatedRecordIds: string[];
  messages: ChatMessage[];
}
