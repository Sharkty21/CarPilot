import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import AiAutofillPanel from "@/src/components/common/AiAutofillPanel";
import FileDropzone from "@/src/components/common/FileDropzone";
import { MAINTENANCE_TYPES } from "@/src/lib/constants";
import { filesToDocuments, newId, today } from "@/src/lib/format";
import type {
  MaintenanceRecord,
  MaintenanceRecordType,
  VehicleDocument,
} from "@/src/types/vehicle";

interface MaintenanceRecordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing record to edit, or null to add a new one. */
  record: MaintenanceRecord | null;
  vehicleId: string;
  onSave: (record: MaintenanceRecord) => void;
}

interface FormState {
  type: MaintenanceRecordType;
  description: string;
  date: string;
  cost: string;
  mileage: string;
  shop: string;
  documents: VehicleDocument[];
}

const blankForm: FormState = {
  type: "Maintenance",
  description: "",
  date: "",
  cost: "",
  mileage: "",
  shop: "",
  documents: [],
};

const toForm = (record: MaintenanceRecord | null): FormState =>
  record
    ? {
        type: record.type,
        description: record.description ?? "",
        date: record.date ?? "",
        cost: record.cost !== undefined ? String(record.cost) : "",
        mileage: record.mileage !== undefined ? String(record.mileage) : "",
        shop: record.shop ?? "",
        documents: record.documents,
      }
    : blankForm;

/** Stands in for the document-extraction service; only fills blank fields. */
const applyExtractedRecord = (current: FormState): FormState => ({
  ...current,
  description:
    current.description ||
    "Oil and filter change, tire rotation, multi-point inspection",
  date: current.date || today(),
  cost: current.cost || "94.75",
  mileage: current.mileage || "48210",
  shop: current.shop || "Northside Toyota Service",
});

const MaintenanceRecordSheet = ({
  open,
  onOpenChange,
  record,
  vehicleId,
  onSave,
}: MaintenanceRecordSheetProps) => {
  const [form, setForm] = useState<FormState>(() => toForm(record));

  useEffect(() => {
    if (open) setForm(toForm(record));
  }, [open, record]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addFiles = (files: File[]) =>
    setForm((current) => ({
      ...current,
      documents: [...current.documents, ...filesToDocuments(files)],
    }));

  const handleSave = () => {
    onSave({
      id: record?.id ?? newId("rec"),
      vehicleId,
      type: form.type,
      description: form.description.trim() || undefined,
      date: form.date || undefined,
      cost: form.cost.trim() === "" ? undefined : Number(form.cost),
      mileage: form.mileage.trim() === "" ? undefined : Number(form.mileage),
      shop: form.shop.trim() || undefined,
      documents: form.documents,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-lg!">
        <SheetHeader className="flex-none border-b border-blue-50 px-6 py-5 pr-16">
          <SheetTitle className="text-lg">
            {record ? "Edit maintenance record" : "Add maintenance record"}
          </SheetTitle>
          <SheetDescription>
            Upload the paperwork and let AI fill this in, or type the details
            yourself. Leave anything you don't know blank.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <AiAutofillPanel
            description="Attach an invoice or receipt below and CarPilot will read out the work, date, cost and shop."
            documents={form.documents}
            onFill={() => setForm(applyExtractedRecord)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="record-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                set("type", value as MaintenanceRecordType)
              }
            >
              <SelectTrigger id="record-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="record-description">Description</Label>
            <Textarea
              id="record-description"
              rows={3}
              placeholder="What was done, replaced or purchased?"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="record-date">Date</Label>
              <Input
                id="record-date"
                type="date"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-cost">Cost</Label>
              <Input
                id="record-cost"
                inputMode="decimal"
                placeholder="0.00"
                value={form.cost}
                onChange={(event) => set("cost", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="record-mileage">Odometer</Label>
              <Input
                id="record-mileage"
                inputMode="numeric"
                placeholder="48210"
                value={form.mileage}
                onChange={(event) => set("mileage", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-shop">Shop</Label>
              <Input
                id="record-shop"
                placeholder="Where was the work done?"
                value={form.shop}
                onChange={(event) => set("shop", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Documents</Label>
            <FileDropzone
              documents={form.documents}
              onAddFiles={addFiles}
              onRemove={(documentId) =>
                set(
                  "documents",
                  form.documents.filter((item) => item.id !== documentId)
                )
              }
            />
          </div>
        </div>

        <div className="flex flex-none justify-end gap-2 border-t border-blue-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {record ? "Save changes" : "Add record"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MaintenanceRecordSheet;
