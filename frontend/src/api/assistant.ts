import { useMutation } from "@tanstack/react-query";

import { apiClient } from "./client";
import type { AskAssistantBody, AssistantAnswer } from "./types";

export const askAssistant = (vehicleId: string, body: AskAssistantBody) =>
  apiClient.post<AssistantAnswer>(
    `/vehicles/${vehicleId}/assistant/ask`,
    body
  );

/** Answers are not cached — each question is a one-off request. */
export const useAskAssistant = () =>
  useMutation({
    mutationFn: ({
      vehicleId,
      ...body
    }: { vehicleId: string } & AskAssistantBody) =>
      askAssistant(vehicleId, body),
  });
