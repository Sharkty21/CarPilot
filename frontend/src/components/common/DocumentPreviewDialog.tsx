import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VehicleDocument } from "@/src/types/vehicle";

interface DocumentPreviewDialogProps {
  document: VehicleDocument | null;
  onClose: () => void;
  onDownload: (document: VehicleDocument) => void;
  onPreviewError: (document: VehicleDocument) => void;
}

const DocumentPreviewDialog = ({
  document,
  onClose,
  onDownload,
  onPreviewError,
}: DocumentPreviewDialogProps) => (
  <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="flex max-h-[90vh] w-full! max-w-4xl! flex-col gap-4 sm:max-w-4xl!">
      <DialogHeader>
        <DialogTitle className="truncate pr-8">{document?.name}</DialogTitle>
      </DialogHeader>

      {document?.url && document.kind === "image" && (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-50 p-2">
          <img
            src={document.url}
            alt={document.name}
            className="mx-auto max-h-[70vh] w-full object-contain"
            onError={() => onPreviewError(document)}
          />
        </div>
      )}

      {document?.url && document.kind === "pdf" && (
        <iframe
          src={document.url}
          title={document.name}
          className="h-[70vh] w-full rounded-lg border border-blue-100 bg-white"
          onError={() => onPreviewError(document)}
        />
      )}

      <DialogFooter>
        {document && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onDownload(document)}
          >
            <Download />
            Download
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DocumentPreviewDialog;
