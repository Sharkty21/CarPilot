import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, SendHorizontal, Sparkles, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAskAssistant } from "@/src/api";
import { UPLOAD_ACCEPT } from "@/src/lib/constants";
import { useGarage } from "@/src/contexts/garageContext";
import { describeVehicle, newId } from "@/src/lib/format";
import type { ChatAttachment, ChatMessage, Conversation } from "@/src/types/chat";

import ChatMessageBubble from "./ChatMessageBubble";
import ShareAgentLink from "./ShareAgentLink";
import { summarize, tokenize } from "./streaming";

const TOKEN_INTERVAL_MS = 22;

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Question to send automatically when the window opens. */
  seedPrompt?: string;
  onOpenRecord: (recordId: string) => void;
}

const ChatDialog = ({
  open,
  onOpenChange,
  seedPrompt,
  onOpenRecord,
}: ChatDialogProps) => {
  const { selectedVehicle, saveConversation } = useGarage();
  const { mutateAsync: askAssistant } = useAskAssistant();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const conversationIdRef = useRef<string>(newId("conv"));

  // Read through a ref so `send` keeps a stable identity and can't retrigger the
  // reset effect while a conversation is in progress.
  const vehicleRef = useRef(selectedVehicle);
  vehicleRef.current = selectedVehicle;

  const stopStreaming = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStreaming(false);
    setMessages((current) =>
      current.map((message) =>
        message.streaming ? { ...message, streaming: false } : message
      )
    );
  }, []);

  useEffect(() => () => stopStreaming(), [stopStreaming]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (text: string, files: ChatAttachment[] = []) => {
      const vehicle = vehicleRef.current;
      const question = text.trim();
      if (!vehicle || (!question && files.length === 0)) return;

      const userMessage: ChatMessage = {
        id: newId("msg"),
        role: "user",
        content: question || "Here are some documents for this car.",
        createdAt: new Date().toISOString(),
        attachments: files.length ? files : undefined,
      };
      const assistantId = newId("msg");
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
      };

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setInput("");
      setAttachments([]);
      setStreaming(true);

      const conversationId = conversationIdRef.current;
      const updateAssistant = (patch: Partial<ChatMessage>) =>
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, ...patch } : message
          )
        );

      let answer;
      try {
        answer = await askAssistant({
          vehicleId: vehicle.id,
          question,
          attachmentNames: files.map((file) => file.name),
        });
      } catch (error) {
        updateAssistant({
          content:
            error instanceof Error
              ? `I couldn't reach CarPilot just now — ${error.message}`
              : "I couldn't reach CarPilot just now. Please try again.",
          streaming: false,
        });
        setStreaming(false);
        return;
      }

      // The window was reset or closed while the request was in flight.
      if (conversationIdRef.current !== conversationId) return;

      updateAssistant({ citations: answer.citations });

      const tokens = tokenize(answer.content);
      let index = 0;
      timerRef.current = window.setInterval(() => {
        index += 1;
        const partial = tokens.slice(0, index).join("");
        const done = index >= tokens.length;

        updateAssistant({ content: partial, streaming: !done });

        if (done) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setStreaming(false);
        }
      }, TOKEN_INTERVAL_MS);
    },
    [askAssistant]
  );

  // Reset for a fresh conversation each time the window opens, then fire the seed prompt.
  useEffect(() => {
    if (!open) return;
    conversationIdRef.current = newId("conv");
    setMessages([]);
    setAttachments([]);
    setInput("");
    if (seedPrompt) {
      const timeout = window.setTimeout(() => send(seedPrompt), 120);
      return () => window.clearTimeout(timeout);
    }
  }, [open, seedPrompt, send]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopStreaming();
      const firstQuestion = messages.find((message) => message.role === "user");
      if (firstQuestion && selectedVehicle) {
        const relatedRecordIds = Array.from(
          new Set(
            messages
              .flatMap((message) => message.citations ?? [])
              .map((citation) => citation.recordId)
              .filter((recordId): recordId is string => Boolean(recordId))
          )
        );
        const conversation: Conversation = {
          id: conversationIdRef.current,
          vehicleId: selectedVehicle.id,
          summary: summarize(firstQuestion.content),
          sharedWith: null,
          date: new Date().toISOString().slice(0, 10),
          relatedRecordIds,
          messages,
        };
        saveConversation(conversation);
      }
    }
    onOpenChange(nextOpen);
  };

  const attachFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setAttachments((current) => [
      ...current,
      ...Array.from(fileList).map((file) => ({
        id: newId("att"),
        name: file.name,
        mimeType: file.type,
      })),
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[85vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="flex-none gap-1 border-b border-blue-50 px-6 py-4 pr-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sparkles className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base">
                  Ask AI about {selectedVehicle?.nickname ?? "your car"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedVehicle ? describeVehicle(selectedVehicle) : ""}
                </DialogDescription>
              </div>
            </div>
            {selectedVehicle && (
              <ShareAgentLink vehicleNickname={selectedVehicle.nickname} />
            )}
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f8fbff] px-6 py-5"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <Sparkles className="size-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                Ask a question about your car
              </p>
              <p className="max-w-sm text-xs text-slate-500">
                CarPilot answers from your uploaded documents, your maintenance
                records, and the web — and always shows you which one it used.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              onOpenRecord={(recordId) => {
                handleClose(false);
                onOpenRecord(recordId);
              }}
            />
          ))}
        </div>

        <div className="flex-none border-t border-blue-50 bg-white px-6 py-4">
          {attachments.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-xs text-slate-700"
                >
                  <Paperclip className="size-3" />
                  <span className="max-w-40 truncate">{attachment.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${attachment.name}`}
                    className="text-slate-400 hover:text-slate-700"
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((item) => item.id !== attachment.id)
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-blue-100 bg-white p-2 focus-within:border-blue-300">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Attach a file"
              className="text-slate-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={UPLOAD_ACCEPT}
              className="hidden"
              onChange={(event) => {
                attachFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <Textarea
              rows={1}
              value={input}
              placeholder="Ask about a noise, a quote, what's due next, or add info about your car…"
              className="max-h-32 min-h-9 resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!streaming) send(input, attachments);
                }
              }}
            />
            {streaming ? (
              <Button
                variant="outline"
                size="icon"
                aria-label="Stop generating"
                onClick={stopStreaming}
              >
                <Square />
              </Button>
            ) : (
              <Button
                size="icon"
                aria-label="Send message"
                disabled={!input.trim() && attachments.length === 0}
                onClick={() => send(input, attachments)}
              >
                <SendHorizontal />
              </Button>
            )}
          </div>

          <p
            className={cn(
              "mt-2 flex items-center gap-1.5 px-1 text-[11px] text-slate-400"
            )}
          >
            <Paperclip className="size-3" />
            Attach images, PDFs or Word documents and CarPilot will read them for
            you.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
