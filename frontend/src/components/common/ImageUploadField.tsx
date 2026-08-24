import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IMAGE_ACCEPT } from "@/src/lib/constants";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  alt: string;
  className?: string;
}

/**
 * Reads the picked file into a data URL so the photo survives cancelling or
 * reopening the sheet without needing object-URL lifecycle management.
 */
const ImageUploadField = ({
  value,
  onChange,
  alt,
  className,
}: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    setError(null);
    setReading(true);

    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === "string" ? reader.result : undefined);
      setReading(false);
    };
    reader.onerror = () => {
      setError("Couldn't read that file. Try another one.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="overflow-hidden rounded-xl border border-blue-100">
          <img
            src={value}
            alt={alt}
            className="aspect-video w-full bg-blue-50/50 object-cover"
          />
          <div className="flex items-center justify-between gap-2 border-t border-blue-50 bg-white px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              Replace photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-destructive"
              onClick={() => onChange(undefined)}
            >
              <Trash2 />
              Remove
            </Button>
          </div>
        </div>
      ) : (
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
            readFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-colors",
            dragging
              ? "border-blue-400 bg-blue-50"
              : "border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50"
          )}
        >
          {reading ? (
            <Loader2 className="size-5 animate-spin text-blue-500" />
          ) : (
            <ImagePlus className="size-6 text-blue-400" />
          )}
          <span className="text-sm font-medium text-slate-700">
            {reading ? "Uploading…" : "Upload a photo of your car"}
          </span>
          <span className="text-xs text-slate-500">
            Drop an image here or click to browse
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          readFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default ImageUploadField;
