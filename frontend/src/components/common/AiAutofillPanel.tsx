import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { UPLOAD_ACCEPT } from "@/src/lib/constants";
import type { VehicleDocument } from "@/src/types/vehicle";

/** How long the fake extraction call takes before fields populate. */
const EXTRACT_DELAY_MS = 1100;

interface AiAutofillPanelProps {
  description: string;
  /** Documents already attached that can be used as the extraction source. */
  documents: VehicleDocument[];
  /** Called when the user uploads from inside the panel; the parent stores them. */
  onAddFiles?: (files: File[]) => void;
  /** Applies the extracted values. Receives the name of the source document. */
  onFill: (sourceName: string) => void;
  className?: string;
}

/**
 * Shared "let AI read the paperwork" affordance. Extraction is simulated for now;
 * every caller fills only the fields the user left blank so nothing is clobbered.
 */
const AiAutofillPanel = ({
  description,
  documents,
  onAddFiles,
  onFill,
  className,
}: AiAutofillPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState<string | null>(
    documents[0]?.id ?? null
  );
  const [reading, setReading] = useState(false);
  const [filledFrom, setFilledFrom] = useState<string | null>(null);

  // Newly uploaded documents land at the front of the list; select them so the
  // user can auto-fill straight from what they just added.
  useEffect(() => {
    if (documents.length === 0) {
      setSourceId(null);
      return;
    }
    setSourceId((current) =>
      current && documents.some((document) => document.id === current)
        ? current
        : documents[0].id
    );
  }, [documents]);

  const source = documents.find((document) => document.id === sourceId);

  const run = () => {
    if (!source) return;
    setReading(true);
    setFilledFrom(null);
    window.setTimeout(() => {
      onFill(source.name);
      setReading(false);
      setFilledFrom(source.name);
    }, EXTRACT_DELAY_MS);
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3",
        className
      )}
    >
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          <Sparkles className="size-4 text-blue-500" />
          Auto-fill with AI
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      {documents.length > 0 ? (
        <div className="flex items-center gap-2">
          <Select
            items={documents.map((document) => ({
              label: document.name,
              value: document.id,
            }))}
            value={sourceId}
            onValueChange={(value) => setSourceId(value as string)}
          >
            <SelectTrigger
              aria-label="Document to read"
              className="h-8 min-w-0 flex-1 bg-white text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documents.map((document) => (
                <SelectItem key={document.id} value={document.id}>
                  {document.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 bg-white"
            disabled={reading || !source}
            onClick={run}
          >
            <Sparkles />
            {reading ? "Reading…" : "Auto-fill"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Upload a document to turn on auto-fill, or just type the details in
          yourself.
        </p>
      )}

      {onAddFiles && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-600"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            Upload document
          </Button>

          {filledFrom && !reading && (
            <span className="flex min-w-0 items-center gap-1 text-xs text-emerald-700">
              <Check className="size-3 shrink-0" />
              <span className="truncate">Filled from {filledFrom}</span>
            </span>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) {
                onAddFiles(Array.from(event.target.files));
              }
              event.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AiAutofillPanel;
