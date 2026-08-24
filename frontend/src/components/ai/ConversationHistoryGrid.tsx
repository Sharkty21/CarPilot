import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Share2, User } from "lucide-react";

import { carPilotGridTheme, defaultColDef } from "@/src/lib/agGrid";
import { formatDate } from "@/src/lib/format";
import type { Conversation } from "@/src/types/chat";
import type { MaintenanceRecord } from "@/src/types/vehicle";

interface ConversationHistoryGridProps {
  conversations: Conversation[];
  records: MaintenanceRecord[];
  onOpenTranscript: (conversation: Conversation) => void;
  onOpenRecord: (recordId: string) => void;
}

const ConversationHistoryGrid = ({
  conversations,
  records,
  onOpenTranscript,
  onOpenRecord,
}: ConversationHistoryGridProps) => {
  const recordsById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records]
  );

  const columnDefs = useMemo<ColDef<Conversation>[]>(
    () => [
      {
        headerName: "Summary",
        field: "summary",
        flex: 3,
        minWidth: 240,
        cellRenderer: ({ data }: ICellRendererParams<Conversation>) =>
          data ? (
            <button
              type="button"
              onClick={() => onOpenTranscript(data)}
              className="truncate text-left font-medium text-blue-600 hover:underline"
              title={data.summary}
            >
              {data.summary}
            </button>
          ) : null,
      },
      {
        headerName: "Who",
        colId: "who",
        flex: 1.4,
        minWidth: 160,
        valueGetter: ({ data }) =>
          data?.sharedWith ? `Shared with ${data.sharedWith}` : "Me",
        cellRenderer: ({ data, value }: ICellRendererParams<Conversation>) =>
          data ? (
            <span className="flex items-center gap-1.5 truncate text-slate-600">
              {data.sharedWith ? (
                <Share2 className="size-3.5 shrink-0 text-blue-400" />
              ) : (
                <User className="size-3.5 shrink-0 text-slate-400" />
              )}
              <span className="truncate">{value}</span>
            </span>
          ) : null,
      },
      {
        headerName: "Date",
        field: "date",
        flex: 1,
        minWidth: 120,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        headerName: "Related to",
        colId: "relatedTo",
        flex: 2,
        minWidth: 200,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<Conversation>) => {
          if (!data?.relatedRecordIds.length) return null;
          return (
            <span className="flex min-w-0 items-center gap-1.5">
              {data.relatedRecordIds.map((recordId, index) => {
                const record = recordsById.get(recordId);
                if (!record) return null;
                return (
                  <span key={recordId} className="flex min-w-0 items-center">
                    {index > 0 && <span className="mr-1.5 text-slate-300">·</span>}
                    <button
                      type="button"
                      onClick={() => onOpenRecord(recordId)}
                      title={record.description ?? record.type}
                      className="max-w-40 truncate text-blue-600 hover:underline"
                    >
                      {record.description ?? record.type}
                    </button>
                  </span>
                );
              })}
            </span>
          );
        },
      },
    ],
    [onOpenRecord, onOpenTranscript, recordsById]
  );

  return (
    <div className="h-72">
      <AgGridReact<Conversation>
        theme={carPilotGridTheme}
        rowData={conversations}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowHeight={46}
        headerHeight={40}
        animateRows
        overlayNoRowsTemplate={`<span class="text-sm text-slate-400">No conversations yet — ask a question to get started</span>`}
      />
    </div>
  );
};

export default ConversationHistoryGrid;
