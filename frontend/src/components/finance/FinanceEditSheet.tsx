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
import type { FinanceBody } from "@/src/api";
import AiAutofillPanel from "@/src/components/common/AiAutofillPanel";
import { FINANCE_KINDS } from "@/src/lib/constants";
import { fillBlankFields } from "@/src/lib/autofill";
import type { FinanceInfo, FinanceKind } from "@/src/types/vehicle";

interface FinanceEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  finance: FinanceInfo;
  onSave: (finance: FinanceBody, files: File[]) => void;
}

type NumericKey =
  | "termMonths"
  | "monthlyPayment"
  | "apr"
  | "amountFinanced"
  | "downPayment"
  | "payoffAmount"
  | "residualValue"
  | "annualMileageAllowance";

const NUMERIC_KEYS: NumericKey[] = [
  "termMonths",
  "monthlyPayment",
  "apr",
  "amountFinanced",
  "downPayment",
  "payoffAmount",
  "residualValue",
  "annualMileageAllowance",
];

type FormState = { kind: FinanceKind; lender: string; startDate: string } & Record<
  NumericKey,
  string
>;

const toForm = (finance: FinanceInfo): FormState => ({
  kind: finance.kind,
  lender: finance.lender ?? "",
  startDate: finance.startDate ?? "",
  termMonths: finance.termMonths?.toString() ?? "",
  monthlyPayment: finance.monthlyPayment?.toString() ?? "",
  apr: finance.apr?.toString() ?? "",
  amountFinanced: finance.amountFinanced?.toString() ?? "",
  downPayment: finance.downPayment?.toString() ?? "",
  payoffAmount: finance.payoffAmount?.toString() ?? "",
  residualValue: finance.residualValue?.toString() ?? "",
  annualMileageAllowance: finance.annualMileageAllowance?.toString() ?? "",
});

const FinanceEditSheet = ({
  open,
  onOpenChange,
  vehicleId,
  finance,
  onSave,
}: FinanceEditSheetProps) => {
  const [form, setForm] = useState<FormState>(() => toForm(finance));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) {
      setForm(toForm(finance));
      setPendingFiles([]);
    }
  }, [open, finance]);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    const numeric = Object.fromEntries(
      NUMERIC_KEYS.map((key) => [
        key,
        form[key].trim() === "" ? undefined : Number(form[key]),
      ])
    ) as Record<NumericKey, number | undefined>;

    onSave({
      kind: form.kind,
      lender: form.lender.trim() || undefined,
      startDate: form.startDate || undefined,
      ...numeric,
    }, pendingFiles);
    onOpenChange(false);
  };

  const isOwned = form.kind === "Owned";
  const isLease = form.kind === "Leasing";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full! flex-col gap-0 sm:max-w-md!">
        <SheetHeader className="flex-none border-b border-blue-50 px-6 py-5 pr-16">
          <SheetTitle className="text-lg">Edit finance details</SheetTitle>
          <SheetDescription>
            Anything you leave blank stays blank on the page.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="finance-kind">Ownership</Label>
            <Select
              value={form.kind}
              onValueChange={(value) => set("kind", value as FinanceKind)}
            >
              <SelectTrigger id="finance-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCE_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOwned ? (
            <p className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
              Owned outright — no lender, payment or term to track. Payment and
              title documents can still be attached in the finance section.
            </p>
          ) : (
            <>
              <AiAutofillPanel
                description={
                  isLease
                    ? "Upload the lease agreement and CarPilot will pull out the term, payment, residual and mileage allowance."
                    : "Upload the loan or retail installment contract and CarPilot will pull out the lender, term, payment and APR."
                }
                vehicleId={vehicleId}
                section="finance"
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
                <Label htmlFor="finance-lender">
                  {isLease ? "Leasing company" : "Lender"}
                </Label>
                <Input
                  id="finance-lender"
                  value={form.lender}
                  onChange={(event) => set("lender", event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="finance-start">Start date</Label>
                  <Input
                    id="finance-start"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => set("startDate", event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="finance-term">Term (months)</Label>
                  <Input
                    id="finance-term"
                    inputMode="numeric"
                    value={form.termMonths}
                    onChange={(event) => set("termMonths", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="finance-payment">Monthly payment</Label>
                  <Input
                    id="finance-payment"
                    inputMode="decimal"
                    value={form.monthlyPayment}
                    onChange={(event) =>
                      set("monthlyPayment", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="finance-down">Amount down</Label>
                  <Input
                    id="finance-down"
                    inputMode="decimal"
                    value={form.downPayment}
                    onChange={(event) => set("downPayment", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="finance-amount">
                    {isLease ? "Capitalized cost" : "Amount financed"}
                  </Label>
                  <Input
                    id="finance-amount"
                    inputMode="decimal"
                    value={form.amountFinanced}
                    onChange={(event) =>
                      set("amountFinanced", event.target.value)
                    }
                  />
                </div>
                {isLease ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="finance-residual">Residual value</Label>
                    <Input
                      id="finance-residual"
                      inputMode="decimal"
                      value={form.residualValue}
                      onChange={(event) =>
                        set("residualValue", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="finance-apr">APR (%)</Label>
                    <Input
                      id="finance-apr"
                      inputMode="decimal"
                      value={form.apr}
                      onChange={(event) => set("apr", event.target.value)}
                    />
                  </div>
                )}
              </div>

              {isLease ? (
                <div className="space-y-1.5">
                  <Label htmlFor="finance-allowance">
                    Annual mileage allowance
                  </Label>
                  <Input
                    id="finance-allowance"
                    inputMode="numeric"
                    value={form.annualMileageAllowance}
                    onChange={(event) =>
                      set("annualMileageAllowance", event.target.value)
                    }
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="finance-payoff">Current payoff</Label>
                  <Input
                    id="finance-payoff"
                    inputMode="decimal"
                    value={form.payoffAmount}
                    onChange={(event) => set("payoffAmount", event.target.value)}
                  />
                </div>
              )}
            </>
          )}
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

export default FinanceEditSheet;
