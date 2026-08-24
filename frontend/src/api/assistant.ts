import { getAccessToken } from "@/src/lib/authStorage";
import type { ChatCitation } from "@/src/types/chat";

import type { AskAssistantBody } from "./types";

export type AssistantStreamEvent =
  | { type: "token"; content: string }
  | { type: "citation"; citation: ChatCitation }
  | { type: "tool"; name?: string; status?: string }
  | { type: "done" }
  | { type: "error"; content: string };

export interface StreamAssistantHandlers {
  onEvent: (event: AssistantStreamEvent) => void;
  signal?: AbortSignal;
}

/**
 * Streams assistant SSE from the .NET BFF (which proxies carpilot-ai).
 * Yields parsed events until `done` / `error` or abort.
 */
export async function streamAssistant(
  vehicleId: string,
  body: AskAssistantBody & { threadId: string },
  handlers: StreamAssistantHandlers
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    `/api/vehicles/${vehicleId}/assistant/ask/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        question: body.question,
        attachmentNames: body.attachmentNames,
        threadId: body.threadId,
      }),
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
