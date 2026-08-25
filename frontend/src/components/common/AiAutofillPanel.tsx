import { useRef, useState } from "react";
import { Check, Loader2, Sparkles, Upload, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError, extractDocumentFields } from "@/src/api";
import type { AutofillSection } from "@/src/api";
import { UPLOAD_ACCEPT } from "@/src/lib/constants";

interface AiAutofillPanelProps {
  description: string;
  vehicleId: string;
  section: AutofillSection;
  /** Applies extracted values and holds the file until the parent saves. */
  onFilled: (fields: Record<string, unknown>, file: File) => void;
  /** Called when the user removes the uploaded file before saving. */
  onCleared?: () => void;
  className?: string;
}

/**
 * Upload a document, have CarPilot read it, and fill blank fields in the parent form.
 * The file is not attached to the vehicle until the parent saves.
 */
const AiAutofillPanel = ({
  description,
  vehicleId,
  section,
  onFilled,
  onCleared,
  className,
}: AiAutofillPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readFile = async (next: File) => {
    setFile(next);
    setFilledFrom(null);
    setError(null);
    setReading(true);
    try {
      const result = await extractDocumentFields(vehicleId, section, next);
      onFilled(result.fields ?? {}, next);
      setFilledFrom(result.sourceName || next.name);
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? caught.message
          : "Could not read this document. Try a clearer PDF or photo.";
      setError(message);
    } finally {
      setReading(false);
    }
  };

  const clear = () => {
    setFile(null);
    setFilledFrom(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onCleared?.();
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

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer bg-white",
            reading && "pointer-events-none opacity-50"
          )}
        >
          {reading ? <Loader2 className="animate-spin" /> : <Upload />}
          {reading ? "Reading…" : file ? "Replace document" : "Upload document"}
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="sr-only"
            disabled={reading}
            onChange={(event) => {
              const next = event.target.files?.[0];
              event.target.value = "";
              if (next) void readFile(next);
            }}
          />
        </label>

        {file && !reading && (
          <span className="flex min-w-0 max-w-full items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-blue-100">
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              className="text-slate-400 hover:text-slate-700"
              onClick={clear}
            >
              <X className="size-3" />
            </button>
          </span>
        )}
      </div>

      {reading && (
        <p className="flex items-center gap-1.5 text-xs text-blue-700">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Reading {file?.name ?? "document"} and filling blank fields…
        </p>
      )}

      {filledFrom && !reading && !error && (
        <p className="flex min-w-0 items-center gap-1 text-xs text-emerald-700">
          <Check className="size-3 shrink-0" />
          <span className="truncate">Filled from {filledFrom}. Save to attach this file.</span>
        </p>
      )}

      {error && !reading && (
        <p className="text-xs text-rose-700">{error}</p>
      )}
    </div>
  );
};

export default AiAutofillPanel;
