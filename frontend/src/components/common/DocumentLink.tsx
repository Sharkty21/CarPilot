import { cn } from "@/lib/utils";
import { useDocumentPreview } from "@/src/contexts/DocumentPreviewProvider";
import type { VehicleDocument } from "@/src/types/vehicle";

interface DocumentLinkProps {
  document: VehicleDocument;
  className?: string;
}

const DocumentLink = ({ document, className }: DocumentLinkProps) => {
  const { openDocument } = useDocumentPreview();

  return (
    <button
      type="button"
      onClick={() => void openDocument(document)}
      className={cn(
        "cursor-pointer text-left text-blue-600 hover:underline",
        className
      )}
    >
      {document.name}
    </button>
  );
};

export default DocumentLink;
