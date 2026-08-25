import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { InsuranceBody } from "@/src/api";
import AiAutofillPanel from "@/src/components/common/AiAutofillPanel";
import { fillBlankFields } from "@/src/lib/autofill";
import type { InsuranceInfo } from "@/src/types/vehicle";

interface InsuranceEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  insurance: InsuranceInfo;
  onSave: (insurance: InsuranceBody, files: File[]) => void;
}

const toForm = (insurance: InsuranceInfo) => ({
  insurer: insurance.insurer ?? "",
  policyNumber: insurance.policyNumber ?? "",
  coverageType: insurance.coverageType ?? "",
  monthlyPremium: insurance.monthlyPremium?.toString() ?? "",
  deductible: insurance.deductible?.toString() ?? "",
  effectiveDate: insurance.effectiveDate ?? "",
  renewalDate: insurance.renewalDate ?? "",
  agentName: insurance.agentName ?? "",
  agentPhone: insurance.agentPhone ?? "",
});

type FormState = ReturnType<typeof toForm>;

const InsuranceEditSheet = ({
  open,
  onOpenChange,
  vehicleId,
  insurance,
  onSave,
}: InsuranceEditSheetProps) => {
  const [form, setForm] = useState<FormState>(() => toForm(insurance));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) {
      setForm(toForm(insurance));
      setPendingFiles([]);
    }
  }, [open, insurance]);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    onSave({
      insurer: form.insurer.trim() || undefined,
      policyNumber: form.policyNumber.trim() || undefined,
      coverageType: form.coverageType.trim() || undefined,
      monthlyPremium:
        form.monthlyPremium.trim() === "" ? undefined : Number(form.monthlyPremium),
      deductible:
        form.deductible.trim() === "" ? undefined : Number(form.deductible),
      effectiveDate: form.effectiveDate || undefined,
      renewalDate: form.renewalDate || undefined,
      agentName: form.agentName.trim() || undefined,
      agentPhone: form.agentPhone.trim() || undefined,
    }, pendingFiles);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-md!">
        <SheetHeader className="flex-none border-b border-blue-50 px-6 py-5 pr-16">
          <SheetTitle className="text-lg">Edit insurance details</SheetTitle>
          <SheetDescription>
            Anything you leave blank stays blank on the page.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <AiAutofillPanel
            description="Upload your declarations page or ID card and CarPilot will pull out the policy, premium, deductible and agent."
            vehicleId={vehicleId}
            section="insurance"
            onFilled={(fields, file) => {
              setForm((current) => fillBlankFields(current, fields) as FormState);
              setPendingFiles((current) => [
                file,
                ...current.filter((existing) => existing.name !== file.name),
              ]);
            }}
            onCleared={() => setPendingFiles([])}
          />

          <div className="space-y-1.5">
            <Label htmlFor="insurance-insurer">Insurer</Label>
            <Input
              id="insurance-insurer"
              value={form.insurer}
              onChange={(event) => set("insurer", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insurance-policy">Policy number</Label>
              <Input
                id="insurance-policy"
                value={form.policyNumber}
                onChange={(event) => set("policyNumber", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance-coverage">Coverage</Label>
              <Input
                id="insurance-coverage"
                value={form.coverageType}
                onChange={(event) => set("coverageType", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insurance-premium">Monthly premium</Label>
              <Input
                id="insurance-premium"
                inputMode="decimal"
                value={form.monthlyPremium}
                onChange={(event) => set("monthlyPremium", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance-deductible">Deductible</Label>
              <Input
                id="insurance-deductible"
                inputMode="decimal"
                value={form.deductible}
                onChange={(event) => set("deductible", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insurance-effective">Effective date</Label>
              <Input
                id="insurance-effective"
                type="date"
                value={form.effectiveDate}
                onChange={(event) => set("effectiveDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance-renewal">Renewal date</Label>
              <Input
                id="insurance-renewal"
                type="date"
                value={form.renewalDate}
                onChange={(event) => set("renewalDate", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="insurance-agent">Agent</Label>
              <Input
                id="insurance-agent"
                value={form.agentName}
                onChange={(event) => set("agentName", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance-phone">Agent phone</Label>
              <Input
                id="insurance-phone"
                value={form.agentPhone}
                onChange={(event) => set("agentPhone", event.target.value)}
              />
            </div>
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

export default InsuranceEditSheet;
