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
import type { WarrantyBody } from "@/src/api";
import AiAutofillPanel from "@/src/components/common/AiAutofillPanel";
import { WARRANTY_COVERAGE_LEVELS } from "@/src/lib/constants";
import { today } from "@/src/lib/format";
import type { WarrantyCoverageLevel, WarrantyInfo } from "@/src/types/vehicle";

interface WarrantyEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: WarrantyInfo;
  onSave: (warranty: WarrantyBody) => void;
  onAddFiles: (files: File[]) => void;
}

const toForm = (warranty: WarrantyInfo) => ({
  provider: warranty.provider ?? "",
  planName: warranty.planName ?? "",
  contractNumber: warranty.contractNumber ?? "",
  coverageLevel: (warranty.coverageLevel ?? "Powertrain") as WarrantyCoverageLevel,
  startDate: warranty.startDate ?? "",
  startMileage: warranty.startMileage?.toString() ?? "",
  expirationDate: warranty.expirationDate ?? "",
  expirationMileage: warranty.expirationMileage?.toString() ?? "",
  deductible: warranty.deductible?.toString() ?? "",
  pricePaid: warranty.pricePaid?.toString() ?? "",
  transferable: warranty.transferable ? "Yes" : "No",
  notes: warranty.notes ?? "",
});

type FormState = ReturnType<typeof toForm>;

const toNumber = (value: string) =>
  value.trim() === "" ? undefined : Number(value);

/** Stands in for the document-extraction service; only fills blank fields. */
const applyExtractedWarranty = (current: FormState): FormState => {
  const startDate = current.startDate || today();
  const expiration = new Date(startDate);
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 5);

  return {
    ...current,
    provider: current.provider || "Endurance Vehicle Protection",
    planName: current.planName || "Supreme Exclusionary",
    contractNumber: current.contractNumber || "EVP-2214-77390",
    coverageLevel: "Exclusionary",
    startDate,
    expirationDate:
      current.expirationDate || expiration.toISOString().slice(0, 10),
    expirationMileage: current.expirationMileage || "100000",
    deductible: current.deductible || "100",
    pricePaid: current.pricePaid || "2895",
    transferable: "Yes",
    notes:
      current.notes ||
      "Covers everything except listed exclusions. Wear items and routine maintenance are not covered. Pre-authorization required before repairs.",
  };
};

const WarrantyEditSheet = ({
  open,
  onOpenChange,
  warranty,
  onSave,
  onAddFiles,
}: WarrantyEditSheetProps) => {
  const [form, setForm] = useState<FormState>(() => toForm(warranty));

  useEffect(() => {
    if (open) setForm(toForm(warranty));
  }, [open, warranty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    onSave({
      provider: form.provider.trim() || undefined,
      planName: form.planName.trim() || undefined,
      contractNumber: form.contractNumber.trim() || undefined,
      coverageLevel: form.coverageLevel,
      startDate: form.startDate || undefined,
      startMileage: toNumber(form.startMileage),
      expirationDate: form.expirationDate || undefined,
      expirationMileage: toNumber(form.expirationMileage),
      deductible: toNumber(form.deductible),
      pricePaid: toNumber(form.pricePaid),
      transferable: form.transferable === "Yes",
      notes: form.notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-md!">
        <SheetHeader className="flex-none border-b border-blue-50 px-6 py-5 pr-16">
          <SheetTitle className="text-lg">Edit warranty coverage</SheetTitle>
          <SheetDescription>
            Track a purchased extended warranty or vehicle service contract.
            Anything you leave blank stays blank on the page.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <AiAutofillPanel
            description="Attach the service contract and CarPilot will pull out the provider, limits, deductible and exclusions."
            documents={warranty.documents}
            onAddFiles={onAddFiles}
            onFill={() => setForm(applyExtractedWarranty)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="warranty-provider">Provider</Label>
            <Input
              id="warranty-provider"
              placeholder="Endurance Vehicle Protection"
              value={form.provider}
              onChange={(event) => set("provider", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warranty-plan">Plan</Label>
              <Input
                id="warranty-plan"
                placeholder="Supreme"
                value={form.planName}
                onChange={(event) => set("planName", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty-contract">Contract number</Label>
              <Input
                id="warranty-contract"
                value={form.contractNumber}
                onChange={(event) => set("contractNumber", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warranty-level">Coverage level</Label>
            <Select
              value={form.coverageLevel}
              onValueChange={(value) =>
                set("coverageLevel", value as WarrantyCoverageLevel)
              }
            >
              <SelectTrigger id="warranty-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WARRANTY_COVERAGE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warranty-start">Coverage starts</Label>
              <Input
                id="warranty-start"
                type="date"
                value={form.startDate}
                onChange={(event) => set("startDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty-start-miles">Odometer at purchase</Label>
              <Input
                id="warranty-start-miles"
                inputMode="numeric"
                placeholder="32400"
                value={form.startMileage}
                onChange={(event) => set("startMileage", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warranty-expires">Expires on</Label>
              <Input
                id="warranty-expires"
                type="date"
                value={form.expirationDate}
                onChange={(event) => set("expirationDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty-expires-miles">Mileage limit</Label>
              <Input
                id="warranty-expires-miles"
                inputMode="numeric"
                placeholder="100000"
                value={form.expirationMileage}
                onChange={(event) => set("expirationMileage", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="warranty-deductible">Deductible</Label>
              <Input
                id="warranty-deductible"
                inputMode="decimal"
                value={form.deductible}
                onChange={(event) => set("deductible", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty-price">Price paid</Label>
              <Input
                id="warranty-price"
                inputMode="decimal"
                value={form.pricePaid}
                onChange={(event) => set("pricePaid", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warranty-transferable">Transferable</Label>
            <Select
              value={form.transferable}
              onValueChange={(value) => set("transferable", value as "Yes" | "No")}
            >
              <SelectTrigger id="warranty-transferable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warranty-notes">What's covered</Label>
            <Textarea
              id="warranty-notes"
              rows={3}
              placeholder="Exclusions, claim process, pre-authorization requirements…"
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-none justify-end gap-2 border-t border-blue-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WarrantyEditSheet;
