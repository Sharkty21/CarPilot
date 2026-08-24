import { Paperclip, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/src/lib/format";
import type { ChatMessage } from "@/src/types/chat";

import CitationList from "./CitationList";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onOpenRecord?: (recordId: string) => void;
}

/** Renders **bold** spans and paragraph breaks without pulling in a markdown dependency. */
const renderContent = (content: string) =>
  content.split("\n").map((line, lineIndex) => {
    if (line.trim() === "") return <span key={lineIndex} className="block h-2" />;
    const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <span key={lineIndex} className="block">
        {segments.map((segment, segmentIndex) =>
          segment.startsWith("**") && segment.endsWith("**") ? (
            <strong key={segmentIndex} className="font-semibold">
              {segment.slice(2, -2)}
            </strong>
          ) : (
            <span key={segmentIndex}>{segment}</span>
          )
        )}
      </span>
    );
  });

const ChatMessageBubble = ({ message, onOpenRecord }: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Sparkles className="size-4" />
        </span>
      )}

      <div className={cn("min-w-0 max-w-[85%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-700 ring-1 ring-blue-100"
          )}
        >
          {message.attachments && message.attachments.length > 0 && (
            <ul
              className={cn(
                "mb-2 flex flex-wrap gap-1.5",
                isUser ? "justify-end" : ""
              )}
            >
              {message.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className={cn(
                    "flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs",
                    isUser ? "bg-blue-500/60 text-white" : "bg-blue-50 text-slate-700"
                  )}
                >
                  <Paperclip className="size-3 shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="whitespace-pre-wrap">
            {message.streaming && !message.content.trim() ? (
              <span className="inline-flex items-center gap-2 text-slate-500">
                <Sparkles className="size-3.5 shrink-0 animate-thinking-blink text-blue-500" />
                <span>Thinking...</span>
              </span>
            ) : (
              renderContent(message.content)
            )}
          </div>
        </div>

        {!isUser && !message.streaming && message.citations && (
          <CitationList
            citations={message.citations}
            onOpenRecord={onOpenRecord}
          />
        )}

        <span className="mt-1 block px-1 text-[11px] text-slate-400">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default ChatMessageBubble;
