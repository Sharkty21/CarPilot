import { useMemo, useState } from "react";
import { BadgeCheck, Landmark, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import DetailItem from "@/src/components/common/DetailItem";
import DocumentsGrid from "@/src/components/common/DocumentsGrid";
import SectionCard from "@/src/components/common/SectionCard";
import { useGarage } from "@/src/contexts/garageContext";
import {
  filesToDocuments,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/src/lib/format";
import type { OwnedVehicle } from "@/src/types/vehicle";

import FinanceChart from "./FinanceChart";
import FinanceEditSheet from "./FinanceEditSheet";
import { buildLeaseSchedule, buildLoanSchedule, monthsElapsed } from "./schedule";

interface FinanceSectionProps {
  vehicle: OwnedVehicle;
}

const FinanceSection = ({ vehicle }: FinanceSectionProps) => {
  const { updateFinance, addDocuments, removeDocument } = useGarage();
  const [editOpen, setEditOpen] = useState(false);
  const { finance } = vehicle;

  const addFinanceFiles = (files: File[]) =>
    addDocuments("finance", filesToDocuments(files));

  const schedule = useMemo(
    () =>
      finance.kind === "Leasing"
        ? buildLeaseSchedule(finance)
        : finance.kind === "Financing"
          ? buildLoanSchedule(finance)
          : [],
    [finance]
  );

  const elapsed = monthsElapsed(finance);

  const details =
    finance.kind === "Owned"
      ? []
      : finance.kind === "Leasing"
        ? [
            { label: "Leasing company", value: finance.lender },
            { label: "Monthly payment", value: formatCurrency(finance.monthlyPayment) },
            { label: "Term", value: finance.termMonths ? `${finance.termMonths} months` : "" },
            { label: "Lease start", value: formatDate(finance.startDate) },
            { label: "Capitalized cost", value: formatCurrency(finance.amountFinanced) },
            { label: "Residual value", value: formatCurrency(finance.residualValue) },
            {
              label: "Mileage allowance",
              value: finance.annualMileageAllowance
                ? `${formatNumber(finance.annualMileageAllowance)} mi / yr`
                : "",
            },
            { label: "Amount down", value: formatCurrency(finance.downPayment) },
          ]
        : [
            { label: "Lender", value: finance.lender },
            { label: "Monthly payment", value: formatCurrency(finance.monthlyPayment) },
            { label: "APR", value: formatPercent(finance.apr) },
            { label: "Term", value: finance.termMonths ? `${finance.termMonths} months` : "" },
            { label: "Loan start", value: formatDate(finance.startDate) },
            { label: "Amount financed", value: formatCurrency(finance.amountFinanced) },
            { label: "Amount down", value: formatCurrency(finance.downPayment) },
            { label: "Current payoff", value: formatCurrency(finance.payoffAmount) },
          ];

  return (
    <>
      <SectionCard
        title="Finance"
        description={
          finance.kind === "Owned"
            ? "Owned outright"
            : `${finance.kind} through ${finance.lender ?? "an unlisted lender"}`
        }
        icon={Landmark}
        action={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
        }
      >
        <div className="space-y-6 p-6">
          {finance.kind === "Owned" ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Owned outright
                </p>
                <p className="text-sm text-slate-600">
                  No loan or lease on this vehicle, so its full estimated value of{" "}
                  {formatCurrency(vehicle.estimatedValue) || "—"} is equity.
                </p>
              </div>
            </div>
          ) : (
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

              <FinanceChart
                data={schedule}
                equityLabel={finance.kind === "Leasing" ? "Paid to date" : "Equity"}
                debtLabel={
                  finance.kind === "Leasing" ? "Remaining obligation" : "Debt"
                }
                currentMonth={elapsed}
              />
            </>
          )}

          <DocumentsGrid
            documents={finance.documents}
            emptyMessage="No payment documents uploaded yet"
            onAddFiles={addFinanceFiles}
            onRemove={(documentId) => removeDocument("finance", documentId)}
          />
        </div>
      </SectionCard>

      <FinanceEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        finance={finance}
        onSave={updateFinance}
        onAddFiles={addFinanceFiles}
      />
    </>
  );
};

export default FinanceSection;
