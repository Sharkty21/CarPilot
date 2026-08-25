import { getAccessToken } from "@/src/lib/authStorage";
import type { ChatCitation } from "@/src/types/chat";

import type { AskAssistantBody } from "./types";

export type AssistantStreamEvent =
  | { type: "token"; content: string }
  | { type: "citation"; citation: ChatCitation }
  | { type: "tool"; name?: string; status?: string; content?: string }
  | { type: "done" }
  | { type: "error"; content: string };

export interface StreamAssistantHandlers {
  onEvent: (event: AssistantStreamEvent) => void;
  signal?: AbortSignal;
}

const MUTATING_TOOLS = new Set([
  "attach_document",
  "update_insurance_info",
  "update_warranty_info",
  "update_finance_info",
  "create_maintenance_record",
  "update_maintenance_record",
  "delete_maintenance_record",
]);

export function isMutatingAssistantTool(name?: string): boolean {
  return Boolean(name && MUTATING_TOOLS.has(name));
}

export function toolStatusLabel(name?: string, content?: string): string {
  if (content?.trim()) return content.trim();
  switch (name) {
    case "read_document":
      return "Reading document…";
    case "attach_document":
      return "Filing document…";
    case "update_insurance_info":
      return "Updating insurance…";
    case "update_warranty_info":
      return "Updating warranty…";
    case "update_finance_info":
      return "Updating finance…";
    case "create_maintenance_record":
      return "Saving maintenance record…";
    case "update_maintenance_record":
      return "Updating maintenance record…";
    case "get_insurance_info":
    case "get_warranty_info":
    case "get_finance_info":
    case "get_vehicle_info":
    case "list_maintenance_records":
      return "Looking up your garage…";
    case "search_maintenance_documents":
      return "Searching your documents…";
    case "search_web":
      return "Searching the web…";
    default:
      return "Working…";
  }
}

/**
 * Streams assistant SSE from the .NET BFF (which proxies carpilot-ai).
 * Yields parsed events until `done` / `error` or abort.
 */
export async function streamAssistant(
  vehicleId: string,
  body: AskAssistantBody & { threadId: string; files?: File[] },
  handlers: StreamAssistantHandlers
): Promise<void> {
  const token = getAccessToken();
  const form = new FormData();
  form.append("question", body.question);
  form.append("threadId", body.threadId);
  for (const name of body.attachmentNames ?? []) {
    form.append("attachmentNames", name);
  }
  for (const file of body.files ?? []) {
    form.append("files", file);
  }

  const response = await fetch(
    `/api/vehicles/${vehicleId}/assistant/ask/stream`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
      signal: handlers.signal,
    }
  );

  if (!response.ok) {
    const message = `Request failed with status ${response.status}`;
    handlers.onEvent({ type: "error", content: message });
    return;
  }

  if (!response.body) {
    handlers.onEvent({
      type: "error",
      content: "Streaming is not supported in this browser.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (payload: string) => {
    try {
      const event = JSON.parse(payload) as AssistantStreamEvent;
      handlers.onEvent(event);
    } catch {
      // Ignore malformed SSE payloads.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      const trimmed = line.trimEnd();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice("data:".length).trim();
      if (!payload) continue;
      emit(payload);
    }
  }

  if (buffer.trim().startsWith("data:")) {
    emit(buffer.trim().slice("data:".length).trim());
  }
}
