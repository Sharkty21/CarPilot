import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Conversation } from "@/src/types/chat";

import { apiClient } from "./client";
import { queryKeys } from "./queryKeys";

export const fetchConversations = (vehicleId: string) =>
  apiClient.get<Conversation[]>(`/vehicles/${vehicleId}/conversations`);

export const useConversations = (vehicleId: string | null) =>
  useQuery({
    queryKey: queryKeys.conversations(vehicleId ?? ""),
    queryFn: () => fetchConversations(vehicleId!),
    enabled: Boolean(vehicleId),
  });

/** The client owns the conversation id, so saving the same chat twice is idempotent. */
export const useSaveConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vehicleId,
      conversation,
    }: {
      vehicleId: string;
      conversation: Conversation;
    }) =>
      apiClient.put<Conversation>(
        `/vehicles/${vehicleId}/conversations/${conversation.id}`,
        conversation
      ),
    onSuccess: (_saved, { vehicleId }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(vehicleId),
      }),
  });
};
