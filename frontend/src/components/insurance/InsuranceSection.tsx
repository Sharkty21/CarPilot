import { useState } from "react";
import { Pencil, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import DetailItem from "@/src/components/common/DetailItem";
import DocumentsGrid from "@/src/components/common/DocumentsGrid";
import SectionCard from "@/src/components/common/SectionCard";
import { useGarage } from "@/src/contexts/garageContext";
import { formatCurrency, formatDate } from "@/src/lib/format";
import type { OwnedVehicle } from "@/src/types/vehicle";

import InsuranceEditSheet from "./InsuranceEditSheet";

interface InsuranceSectionProps {
  vehicle: OwnedVehicle;
}

const InsuranceSection = ({ vehicle }: InsuranceSectionProps) => {
  const { updateInsurance, addDocuments, removeDocument } = useGarage();
  const [editOpen, setEditOpen] = useState(false);
  const { insurance } = vehicle;

  const addInsuranceFiles = (files: File[]) =>
    addDocuments("insurance", files);

  const details = [
    { label: "Insurer", value: insurance.insurer },
    { label: "Policy number", value: insurance.policyNumber },
    { label: "Coverage", value: insurance.coverageType },
    { label: "Monthly premium", value: formatCurrency(insurance.monthlyPremium) },
    { label: "Deductible", value: formatCurrency(insurance.deductible) },
    { label: "Effective", value: formatDate(insurance.effectiveDate) },
    { label: "Renews", value: formatDate(insurance.renewalDate) },
    {
      label: "Agent",
      value: [insurance.agentName, insurance.agentPhone]
        .filter(Boolean)
        .join(" · "),
    },
  ];

  return (
    <>
      <SectionCard
        title="Insurance"
        description={
          insurance.insurer
            ? `${insurance.insurer}${
                insurance.coverageType ? ` · ${insurance.coverageType}` : ""
              }`
            : "No policy on file"
        }
        icon={ShieldCheck}
        action={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
        }
      >
        <div className="space-y-6 p-6">
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {details.map((detail) => (
              <DetailItem
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </dl>

          <DocumentsGrid
            documents={insurance.documents}
            emptyMessage="No insurance documents uploaded yet"
            onAddFiles={addInsuranceFiles}
            onRemove={(documentId) => removeDocument("insurance", documentId)}
          />
        </div>
      </SectionCard>

      <InsuranceEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        vehicleId={vehicle.id}
        insurance={insurance}
        onSave={async (next, files) => {
          await updateInsurance(next);
          if (files.length) await addDocuments("insurance", files);
        }}
      />
    </>
  );
};

export default InsuranceSection;
