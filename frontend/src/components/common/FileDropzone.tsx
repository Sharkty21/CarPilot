import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UPLOAD_ACCEPT } from "@/src/lib/constants";
import { formatDate } from "@/src/lib/format";
import type { VehicleDocument } from "@/src/types/vehicle";

interface FileDropzoneProps {
  documents: VehicleDocument[];
  onAddFiles: (files: File[]) => void;
  onRemove: (documentId: string) => void;
  hint?: string;
  className?: string;
}

const iconFor = (kind: VehicleDocument["kind"]) =>
  kind === "image" ? ImageIcon : FileText;

const FileDropzone = ({
  documents,
  onAddFiles,
  onRemove,
  hint = "PDF, DOC, DOCX or images",
  className,
}: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    onAddFiles(Array.from(fileList));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50"
        )}
      >
        <UploadCloud className="size-5 text-blue-500" />
        <span className="text-sm font-medium text-slate-700">
          Drop files or click to upload
        </span>
        <span className="text-xs text-slate-500">{hint}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {documents.length > 0 && (
        <ul className="space-y-1.5">
          {documents.map((document) => {
            const Icon = iconFor(document.kind);
            return (
              <li
                key={document.id}
                className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2"
              >
                <Icon className="size-4 shrink-0 text-blue-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {document.name}
                </span>
                <span className="hidden text-xs text-slate-400 sm:inline">
                  {formatDate(document.uploadedAt)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${document.name}`}
                  onClick={() => onRemove(document.id)}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {documents.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Paperclip className="size-3" />
          No documents attached yet
        </p>
      )}
    </div>
  );
};

export default FileDropzone;
