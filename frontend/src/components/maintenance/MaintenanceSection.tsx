import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus, Search, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SectionCard from "@/src/components/common/SectionCard";
import { useGarage } from "@/src/contexts/garageContext";
import { carPilotGridTheme, defaultColDef } from "@/src/lib/agGrid";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { MaintenanceRecord, MaintenanceRecordType } from "@/src/types/vehicle";

import MaintenanceRecordSheet from "./MaintenanceRecordSheet";

const TYPE_STYLES: Record<MaintenanceRecordType, string> = {
  Repair: "bg-rose-50 text-rose-600",
  Maintenance: "bg-blue-50 text-blue-600",
  Product: "bg-violet-50 text-violet-600",
};

interface MaintenanceSectionProps {
  /** Record the user navigated to from a chat citation; opens the edit sheet. */
  pendingRecordId: string | null;
  onPendingHandled: () => void;
}

const MaintenanceSection = ({
  pendingRecordId,
  onPendingHandled,
}: MaintenanceSectionProps) => {
  const { selectedVehicle, maintenanceRecords, saveMaintenanceRecord } =
    useGarage();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);

  const openEditor = (record: MaintenanceRecord | null) => {
    setEditing(record);
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!pendingRecordId) return;
    const record = maintenanceRecords.find(
      (candidate) => candidate.id === pendingRecordId
    );
    if (record) openEditor(record);
    onPendingHandled();
  }, [maintenanceRecords, onPendingHandled, pendingRecordId]);

  const columnDefs = useMemo<ColDef<MaintenanceRecord>[]>(
    () => [
      {
        headerName: "Type",
        field: "type",
        minWidth: 130,
        maxWidth: 150,
        cellRenderer: ({ value }: ICellRendererParams<MaintenanceRecord>) =>
          value ? (
            <Badge className={TYPE_STYLES[value as MaintenanceRecordType]}>
              {value}
            </Badge>
          ) : null,
      },
      {
        headerName: "Description",
        field: "description",
        flex: 3,
        minWidth: 240,
        cellRenderer: ({ value }: ICellRendererParams<MaintenanceRecord>) => (
          <span className="truncate text-slate-700" title={value ?? ""}>
            {value ?? ""}
          </span>
        ),
      },
      {
        headerName: "Date",
        field: "date",
        minWidth: 120,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        headerName: "Cost",
        field: "cost",
        minWidth: 110,
        cellClass: "flex items-center justify-end",
        headerClass: "ag-right-aligned-header",
        valueFormatter: ({ value }) => formatCurrency(value),
      },
      {
        headerName: "File preview",
        colId: "documents",
        flex: 2,
        minWidth: 200,
        sortable: false,
        valueGetter: ({ data }) =>
          data?.documents.map((document) => document.name).join(", ") ?? "",
        cellRenderer: ({ data }: ICellRendererParams<MaintenanceRecord>) => {
          if (!data?.documents.length) return null;
          return (
            <span className="min-w-0 truncate">
              {data.documents.map((document, index) => (
                <span key={document.id}>
                  {index > 0 && <span className="text-slate-300">, </span>}
                  <a
                    href={document.url ?? "#"}
                    onClick={(event) => event.preventDefault()}
                    className="text-blue-600 hover:underline"
                  >
                    {document.name}
                  </a>
                </span>
              ))}
            </span>
          );
        },
      },
      {
        headerName: "",
        colId: "edit",
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        flex: 0,
        sortable: false,
        cellClass: "flex items-center justify-center",
        cellRenderer: ({ data }: ICellRendererParams<MaintenanceRecord>) =>
          data ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Edit record"
              className="carpilot-row-action text-slate-400 hover:text-blue-600"
              onClick={() => openEditor(data)}
            >
              <Pencil />
            </Button>
          ) : null,
      },
    ],
    []
  );

  return (
    <>
      <SectionCard
        title="Maintenance history"
        description={`${maintenanceRecords.length} ${
          maintenanceRecords.length === 1 ? "record" : "records"
        } on file`}
        icon={Wrench}
        action={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records"
                className="h-9 w-48 rounded-lg border-blue-100 pl-8"
              />
            </div>
            <Button size="sm" onClick={() => openEditor(null)}>
              <Plus />
              Add record
            </Button>
          </>
        }
      >
        <div className="h-96">
          <AgGridReact<MaintenanceRecord>
            theme={carPilotGridTheme}
            rowData={maintenanceRecords}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={search}
            rowHeight={48}
            headerHeight={40}
            animateRows
            overlayNoRowsTemplate={`<span class="text-sm text-slate-400">No maintenance records yet</span>`}
          />
        </div>
      </SectionCard>

      {selectedVehicle && (
        <MaintenanceRecordSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          record={editing}
          vehicleId={selectedVehicle.id}
          onSave={saveMaintenanceRecord}
        />
      )}
    </>
  );
};

export default MaintenanceSection;
