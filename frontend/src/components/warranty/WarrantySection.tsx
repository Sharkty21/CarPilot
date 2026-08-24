import { useState } from "react";
import { CalendarClock, Gauge, Info, Pencil, Plus, ShieldHalf } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import DetailItem from "@/src/components/common/DetailItem";
import DocumentsGrid from "@/src/components/common/DocumentsGrid";
import SectionCard from "@/src/components/common/SectionCard";
import { cn } from "@/lib/utils";
import { useGarage } from "@/src/contexts/garageContext";
import {
  filesToDocuments,
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/src/lib/format";
import type { OwnedVehicle } from "@/src/types/vehicle";

import WarrantyEditSheet from "./WarrantyEditSheet";
import {
  hasWarranty,
  mileageCoverage,
  timeCoverage,
  warrantyStatus,
  type CoverageMeter,
} from "./coverage";

const STATUS_STYLES = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700" },
  expiring: { label: "Expiring soon", className: "bg-amber-50 text-amber-700" },
  expired: { label: "Expired", className: "bg-rose-50 text-rose-700" },
  none: { label: "None on file", className: "bg-slate-100 text-slate-600" },
} as const;

interface CoverageMeterRowProps {
  icon: typeof Gauge;
  label: string;
  meter: CoverageMeter;
  limit?: string;
}

const CoverageMeterRow = ({
  icon: Icon,
  label,
  meter,
  limit,
}: CoverageMeterRowProps) => (
  <Progress value={meter.usedPercent} className="gap-2">
    <ProgressLabel className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <Icon className="size-3.5 text-blue-400" />
      {label}
      {limit && <span className="text-slate-400">· {limit}</span>}
    </ProgressLabel>
    <ProgressValue
      className={cn(
        "text-xs font-semibold",
        meter.exhausted ? "text-rose-600" : "text-slate-900"
      )}
    >
      {() => meter.remainingLabel}
    </ProgressValue>
  </Progress>
);

interface WarrantySectionProps {
  vehicle: OwnedVehicle;
}

const WarrantySection = ({ vehicle }: WarrantySectionProps) => {
  const { updateWarranty, addDocuments, removeDocument } = useGarage();
  const [editOpen, setEditOpen] = useState(false);
  const { warranty } = vehicle;

  const addWarrantyFiles = (files: File[]) =>
    addDocuments("warranty", filesToDocuments(files));

  const covered = hasWarranty(warranty);
  const status = warrantyStatus(warranty, vehicle.mileage);
  const statusStyle = STATUS_STYLES[status];
  const time = timeCoverage(warranty);
  const mileage = mileageCoverage(warranty, vehicle.mileage);

  const details = [
    { label: "Provider", value: warranty.provider },
    { label: "Plan", value: warranty.planName },
    { label: "Contract number", value: warranty.contractNumber },
    { label: "Coverage level", value: warranty.coverageLevel },
    { label: "Deductible", value: formatCurrency(warranty.deductible) },
    { label: "Price paid", value: formatCurrency(warranty.pricePaid) },
    { label: "Purchased", value: formatDate(warranty.startDate) },
    {
      label: "Transferable",
      value:
        warranty.transferable === undefined
          ? ""
          : warranty.transferable
            ? "Yes"
            : "No",
    },
  ];

  return (
    <>
      <SectionCard
        title="Warranty"
        description={
          covered
            ? [warranty.provider, warranty.planName].filter(Boolean).join(" · ") ||
              "Purchased coverage"
            : "No purchased coverage on file"
        }
        icon={ShieldHalf}
        action={
          <>
            <Badge className={statusStyle.className}>{statusStyle.label}</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              {covered ? <Pencil /> : <Plus />}
              {covered ? "Edit" : "Add coverage"}
            </Button>
          </>
        }
      >
        <div className="space-y-6 p-6">
          {covered ? (
            <>
              <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {details.map((detail) => (
                  <DetailItem
                    key={detail.label}
                    label={detail.label}
                    value={detail.value}
                  />
                ))}
              </dl>

              {(time || mileage) && (
                <div className="grid gap-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:grid-cols-2">
                  {time && (
                    <CoverageMeterRow
                      icon={CalendarClock}
                      label="Time remaining"
                      meter={time}
                      limit={
                        warranty.expirationDate
                          ? `through ${formatDate(warranty.expirationDate)}`
                          : undefined
                      }
                    />
                  )}
                  {mileage && (
                    <CoverageMeterRow
                      icon={Gauge}
                      label="Mileage remaining"
                      meter={mileage}
                      limit={
                        warranty.expirationMileage
                          ? `limit ${formatNumber(warranty.expirationMileage)} mi`
                          : undefined
                      }
                    />
                  )}
                </div>
              )}

              {warranty.notes && (
                <p className="flex items-start gap-2 text-sm text-slate-600">
                  <Info className="mt-0.5 size-4 shrink-0 text-blue-400" />
                  {warranty.notes}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
              <ShieldHalf className="mt-0.5 size-5 shrink-0 text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  No purchased coverage tracked
                </p>
                <p className="text-sm text-slate-600">
                  Add an extended warranty or service contract to track what's
                  covered, how much coverage is left, and your deductible before
                  authorizing a repair.
                </p>
              </div>
            </div>
          )}

          <DocumentsGrid
            documents={warranty.documents}
            emptyMessage="No warranty documents uploaded yet"
            onAddFiles={addWarrantyFiles}
            onRemove={(documentId) => removeDocument("warranty", documentId)}
          />
        </div>
      </SectionCard>

      <WarrantyEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        warranty={warranty}
        onSave={updateWarranty}
        onAddFiles={addWarrantyFiles}
      />
    </>
  );
};

export default WarrantySection;
