import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileText, Image as ImageIcon, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UPLOAD_ACCEPT } from "@/src/lib/constants";
import { carPilotGridTheme, defaultColDef } from "@/src/lib/agGrid";
import { formatDate } from "@/src/lib/format";
import type { VehicleDocument } from "@/src/types/vehicle";

interface DocumentsGridProps {
  documents: VehicleDocument[];
  onAddFiles: (files: File[]) => void;
  onRemove: (documentId: string) => void;
  emptyMessage?: string;
}

const KIND_LABELS: Record<VehicleDocument["kind"], string> = {
  pdf: "PDF",
  doc: "Word document",
  image: "Image",
};

const NameCell = ({ data }: ICellRendererParams<VehicleDocument>) => {
  if (!data) return null;
  const Icon = data.kind === "image" ? ImageIcon : FileText;
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-blue-500" />
      <a
        href={data.url ?? "#"}
        onClick={(event) => event.preventDefault()}
        className="truncate text-blue-600 hover:underline"
      >
        {data.name}
      </a>
    </span>
  );
};

/** Add/remove-only document list. Documents are intentionally not editable in place. */
const DocumentsGrid = ({
  documents,
  onAddFiles,
  onRemove,
  emptyMessage = "No documents uploaded yet",
}: DocumentsGridProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const columnDefs = useMemo<ColDef<VehicleDocument>[]>(
    () => [
      {
        headerName: "Document",
        field: "name",
        flex: 2,
        minWidth: 220,
        cellRenderer: NameCell,
      },
      {
        headerName: "Type",
        field: "kind",
        minWidth: 130,
        valueFormatter: ({ value }) =>
          value ? KIND_LABELS[value as VehicleDocument["kind"]] : "",
      },
      {
        headerName: "Uploaded",
        field: "uploadedAt",
        minWidth: 130,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        headerName: "",
        colId: "actions",
        width: 60,
        minWidth: 60,
        maxWidth: 60,
        flex: 0,
        sortable: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: ({ data }: ICellRendererParams<VehicleDocument>) =>
          data ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${data.name}`}
              className="text-slate-400 hover:text-destructive"
              onClick={() => onRemove(data.id)}
            >
              <Trash2 />
            </Button>
          ) : null,
      },
    ],
    [onRemove]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Documents
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Plus />
          Add document
        </Button>
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

      <div className="h-56 overflow-hidden rounded-xl border border-blue-100">
        <AgGridReact<VehicleDocument>
          theme={carPilotGridTheme}
          rowData={documents}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowHeight={44}
          headerHeight={40}
          animateRows
          overlayNoRowsTemplate={`<span class="text-sm text-slate-400">${emptyMessage}</span>`}
        />
      </div>
    </div>
  );
};

export default DocumentsGrid;
