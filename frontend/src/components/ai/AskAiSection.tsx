import { useState } from "react";
import { MessagesSquare, Paperclip, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SectionCard from "@/src/components/common/SectionCard";
import { useGarage } from "@/src/contexts/garageContext";
import type { Conversation } from "@/src/types/chat";

import ChatDialog from "./ChatDialog";
import ConversationHistoryGrid from "./ConversationHistoryGrid";
import ShareAgentLink from "./ShareAgentLink";
import TranscriptDialog from "./TranscriptDialog";

const SUGGESTIONS = [
  "What service is due next?",
  "I hear a squeal when braking — what is it?",
  "Is this repair covered under my warranty?",
  "Is this repair quote fair?",
  "How much equity do I have?",
];

interface AskAiSectionProps {
  onOpenRecord: (recordId: string) => void;
}

const AskAiSection = ({ onOpenRecord }: AskAiSectionProps) => {
  const { selectedVehicle, conversations, maintenanceRecords } = useGarage();
  const [question, setQuestion] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<Conversation | null>(null);

  const openChat = (prompt?: string) => {
    setSeedPrompt(prompt);
    setChatOpen(true);
    setQuestion("");
  };

  return (
    <>
      <SectionCard
        title="Ask AI"
        description="Answers grounded in your documents, records and the web"
        icon={Sparkles}
        action={
          selectedVehicle && (
            <ShareAgentLink vehicleNickname={selectedVehicle.nickname} />
          )
        }
        contentClassName="divide-y divide-blue-50"
      >
        <div className="bg-gradient-to-br from-blue-50/80 via-sky-50/50 to-white px-6 py-7">
          <h3 className="font-heading text-lg font-semibold text-slate-900">
            Ask a question about {selectedVehicle?.nickname ?? "your car"} — or add
            information to this page
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Describe a symptom, check whether a quote is fair, or drop in a receipt
            and CarPilot will read it and fill in the details for you. Every answer
            shows the document, record or web source it came from.
          </p>

          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              openChat(question.trim() || undefined);
            }}
          >
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask anything about your ${
                selectedVehicle?.model ?? "car"
              }…`}
              className="h-11 flex-1 rounded-xl border-blue-100 bg-white shadow-sm"
            />
            <Button type="submit" size="lg" className="h-11 rounded-xl px-5">
              <SendHorizontal />
              Ask AI
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 rounded-xl border-blue-100 bg-white px-4"
              onClick={() => openChat()}
            >
              <Paperclip />
              Upload files
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Try</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => openChat(suggestion)}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-xs transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 px-6 pt-5 pb-3">
            <MessagesSquare className="size-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Conversation history
            </h3>
            <span className="text-xs text-slate-400">
              Click a summary to read the full transcript
            </span>
          </div>
          <ConversationHistoryGrid
            conversations={conversations}
            records={maintenanceRecords}
            onOpenTranscript={setTranscript}
            onOpenRecord={onOpenRecord}
          />
        </div>
      </SectionCard>

      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        seedPrompt={seedPrompt}
        onOpenRecord={onOpenRecord}
      />

      <TranscriptDialog
        conversation={transcript}
        onClose={() => setTranscript(null)}
        onOpenRecord={onOpenRecord}
      />
    </>
  );
};

export default AskAiSection;
