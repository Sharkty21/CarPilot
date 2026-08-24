import { useCallback, useRef, useState } from "react";
import {
  CarFront,
  Landmark,
  Loader2,
  ShieldCheck,
  ShieldHalf,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import AskAiSection from "@/src/components/ai/AskAiSection";
import FinanceSection from "@/src/components/finance/FinanceSection";
import InsuranceSection from "@/src/components/insurance/InsuranceSection";
import MaintenanceSection from "@/src/components/maintenance/MaintenanceSection";
import SectionNav, {
  type SectionNavItem,
} from "@/src/components/navigation/SectionNav";
import {
  scrollToSection,
  useActiveSection,
} from "@/src/components/navigation/useActiveSection";
import VehicleHero from "@/src/components/vehicle/VehicleHero";
import WarrantySection from "@/src/components/warranty/WarrantySection";
import { useGarage } from "@/src/contexts/garageContext";

const SECTIONS: readonly SectionNavItem[] = [
  { id: "overview", label: "Overview", icon: CarFront },
  { id: "ask-ai", label: "Ask AI", icon: Sparkles },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "warranty", label: "Warranty", icon: ShieldHalf },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
  { id: "finance", label: "Finance", icon: Landmark },
];

const SECTION_IDS = SECTIONS.map((section) => section.id);

const CarPilot = () => {
  const { selectedVehicle, isLoading, error } = useGarage();
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeId = useActiveSection(SECTION_IDS, rootRef);

  const openRecord = useCallback((recordId: string) => {
    setPendingRecordId(recordId);
    scrollToSection("maintenance");
  }, []);

  const clearPending = useCallback(() => setPendingRecordId(null), []);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="size-6 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Loading your garage…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="font-heading text-lg font-semibold text-slate-900">
          Couldn't reach CarPilot
        </h1>
        <p className="max-w-sm text-sm text-slate-500">{error.message}</p>
      </div>
    );
  }

  if (!selectedVehicle) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
          <CarFront className="size-6" />
        </span>
        <h1 className="font-heading text-lg font-semibold text-slate-900">
          No vehicle selected
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          Pick a vehicle from the selector in the header, or add your first one to
          get started.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="mx-auto flex w-full max-w-[86rem] gap-8 p-4 md:p-6 lg:p-8"
    >
      <SectionNav
        items={SECTIONS}
        activeId={activeId}
        onSelect={scrollToSection}
      />

      <div className="min-w-0 flex-1 space-y-5">
        <section id="overview" className="scroll-mt-6">
          <VehicleHero vehicle={selectedVehicle} />
        </section>

        <section id="ask-ai" className="scroll-mt-6">
          <AskAiSection onOpenRecord={openRecord} />
        </section>

        <section id="maintenance" className="scroll-mt-6">
          <MaintenanceSection
            pendingRecordId={pendingRecordId}
            onPendingHandled={clearPending}
          />
        </section>

        <section id="warranty" className="scroll-mt-6">
          <WarrantySection vehicle={selectedVehicle} />
        </section>

        <section id="insurance" className="scroll-mt-6">
          <InsuranceSection vehicle={selectedVehicle} />
        </section>

        <section id="finance" className="scroll-mt-6">
          <FinanceSection vehicle={selectedVehicle} />
        </section>
      </div>
    </div>
  );
};

export default CarPilot;
