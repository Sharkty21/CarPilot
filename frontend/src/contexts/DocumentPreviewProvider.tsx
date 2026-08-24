import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import DocumentPreviewDialog from "@/src/components/common/DocumentPreviewDialog";
import {
  canPreviewInline,
  DOCUMENT_NOT_FOUND_MESSAGE,
  downloadDocument,
} from "@/src/lib/documents";
import type { VehicleDocument } from "@/src/types/vehicle";

interface DocumentPreviewContextValue {
  openDocument: (document: VehicleDocument) => Promise<void>;
}

const DocumentPreviewContext = createContext<DocumentPreviewContextValue | null>(
  null
);

interface ToastMessage {
  id: number;
  text: string;
}

export function DocumentPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<VehicleDocument | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const attemptDownload = useCallback(
    async (document: VehicleDocument) => {
      if (!document.url) {
        showToast(DOCUMENT_NOT_FOUND_MESSAGE);
        return false;
      }

      const started = await downloadDocument(document.url, document.name);
      if (!started) showToast(DOCUMENT_NOT_FOUND_MESSAGE);
      return started;
    },
    [showToast]
  );

  const openDocument = useCallback(
    async (document: VehicleDocument) => {
      if (!document.url) {
        showToast(DOCUMENT_NOT_FOUND_MESSAGE);
        return;
      }

      if (canPreviewInline(document.kind)) {
        setPreview(document);
        return;
      }

      await attemptDownload(document);
    },
    [attemptDownload, showToast]
  );

  const handlePreviewError = useCallback(
    async (document: VehicleDocument) => {
      setPreview(null);
      await attemptDownload(document);
    },
    [attemptDownload]
  );

  const value = useMemo(() => ({ openDocument }), [openDocument]);

  return (
    <DocumentPreviewContext.Provider value={value}>
      {children}
      <DocumentPreviewDialog
        document={preview}
        onClose={() => setPreview(null)}
        onDownload={attemptDownload}
        onPreviewError={handlePreviewError}
      />
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-100 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </DocumentPreviewContext.Provider>
  );
}

export function useDocumentPreview() {
  const context = useContext(DocumentPreviewContext);
  if (!context) {
    throw new Error("useDocumentPreview must be used within DocumentPreviewProvider");
  }
  return context;
}
