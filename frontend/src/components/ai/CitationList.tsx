import { FileText, Globe, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatCitation, CitationKind } from "@/src/types/chat";

const KIND_META: Record<
  CitationKind,
  { icon: typeof FileText; label: string; className: string }
> = {
  document: {
    icon: FileText,
    label: "Document",
    className: "bg-blue-50 text-blue-600",
  },
  record: {
    icon: Wrench,
    label: "Maintenance record",
    className: "bg-emerald-50 text-emerald-600",
  },
  web: { icon: Globe, label: "Web search", className: "bg-amber-50 text-amber-600" },
};

interface CitationListProps {
  citations: ChatCitation[];
  onOpenRecord?: (recordId: string) => void;
}

/** Makes the answer's grounding explicit: every source is listed with where it came from. */
const CitationList = ({ citations, onOpenRecord }: CitationListProps) => {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/40 p-2.5">
      <p className="px-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        Sources ({citations.length})
      </p>
      <ul className="space-y-1">
        {citations.map((citation) => {
          const meta = KIND_META[citation.kind];
          const Icon = meta.icon;
          const isRecordLink = Boolean(citation.recordId && onOpenRecord);

          const body = (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md",
                  meta.className
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span
                  className={cn(
                    "block truncate text-xs font-medium text-slate-800",
                    (isRecordLink || citation.url) && "text-blue-700 underline-offset-2 group-hover:underline"
                  )}
                >
                  {citation.label}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {[meta.label, citation.detail].filter(Boolean).join(" · ")}
                </span>
              </span>
            </>
          );

          return (
            <li key={citation.id}>
              {isRecordLink ? (
                <button
                  type="button"
                  onClick={() => onOpenRecord?.(citation.recordId!)}
                  className="group flex w-full items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 transition-colors hover:bg-white"
                >
                  {body}
                </button>
              ) : citation.url ? (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex w-full items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5 transition-colors hover:bg-white"
                >
                  {body}
                </a>
              ) : (
                <span className="flex w-full items-center gap-2 rounded-lg bg-white/70 px-2 py-1.5">
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CitationList;
