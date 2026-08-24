import { createContext, useContext } from "react";

import type {
  DocumentSection,
  FinanceBody,
  InsuranceBody,
  VehicleDetailsBody,
  WarrantyBody,
} from "@/src/api";
import type { Conversation } from "@/src/types/chat";
import type {
  MaintenanceRecord,
  OwnedVehicle,
  UserProfile,
} from "@/src/types/vehicle";

export type { DocumentSection } from "@/src/api";

export interface GarageContextValue {
  /** Null until the profile request resolves. */
  user: UserProfile | null;
  vehicles: OwnedVehicle[];
  selectedVehicle: OwnedVehicle | null;
  selectVehicle: (vehicleId: string) => void;
  addVehicle: (vehicle: VehicleDetailsBody) => Promise<void>;
  updateVehicleDetails: (details: VehicleDetailsBody) => Promise<void>;

  /** Maintenance records for the currently selected vehicle. */
  maintenanceRecords: MaintenanceRecord[];
  saveMaintenanceRecord: (record: MaintenanceRecord) => Promise<void>;

  /** Conversations for the currently selected vehicle. */
  conversations: Conversation[];
  saveConversation: (conversation: Conversation) => Promise<void>;

  updateFinance: (finance: FinanceBody) => Promise<void>;
  updateInsurance: (insurance: InsuranceBody) => Promise<void>;
  updateWarranty: (warranty: WarrantyBody) => Promise<void>;
  addDocuments: (section: DocumentSection, files: File[]) => Promise<void>;
  removeDocument: (
    section: DocumentSection,
    documentId: string
  ) => Promise<void>;

  /** True while the initial profile and garage requests are in flight. */
  isLoading: boolean;
  error: Error | null;
}

export const GarageContext = createContext<GarageContextValue | null>(null);

export function useGarage(): GarageContextValue {
  const context = useContext(GarageContext);
  if (!context) {
    throw new Error("useGarage must be used inside a GarageProvider");
  }
  return context;
}
