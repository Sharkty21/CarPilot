import { MessagesSquare, Share2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/src/lib/format";
import type { Conversation } from "@/src/types/chat";

import ChatMessageBubble from "./ChatMessageBubble";

interface TranscriptDialogProps {
  conversation: Conversation | null;
  onClose: () => void;
  onOpenRecord: (recordId: string) => void;
}

const TranscriptDialog = ({
  conversation,
  onClose,
  onOpenRecord,
}: TranscriptDialogProps) => {
  return (
    <Dialog
      open={Boolean(conversation)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[80vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {conversation && (
          <>
            <DialogHeader className="flex-none gap-2 border-b border-blue-50 px-6 py-5 pr-16">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline" className="gap-1">
                  {conversation.sharedWith ? (
                    <Share2 className="size-3" />
                  ) : (
                    <User className="size-3" />
                  )}
                  {conversation.sharedWith
                    ? `Shared with ${conversation.sharedWith}`
                    : "Me"}
                </Badge>
                <span>{formatDate(conversation.date)}</span>
                <span className="flex items-center gap-1">
                  <MessagesSquare className="size-3" />
                  {conversation.messages.length} messages
                </span>
              </div>
              <DialogTitle className="text-base leading-snug">
                {conversation.summary}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Full transcript below. References the agent used are listed under
                each answer.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f8fbff] px-6 py-5">
              {conversation.messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  onOpenRecord={(recordId) => {
                    onClose();
                    onOpenRecord(recordId);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptDialog;
