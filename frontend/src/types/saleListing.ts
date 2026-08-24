import type { MaintenanceRecord } from "@/src/types/vehicle";

/** Vehicle facts collected while creating a sale listing (mirrors auto.dev's VehicleInfo shape). */
export interface SaleVehicleInfo {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  drivetrain?: string;
  engine?: string;
  cylinders?: number;
  transmission?: string;
  fuel?: string;
  doors?: number;
  seats?: number;
  exteriorColor?: string;
  interiorColor?: string;
  mileage?: number;
}

export interface SaleHistory {
  accidents?: boolean;
  ownerCount?: number;
}

export interface SellerContact {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/** Which step of the listing wizard a draft is currently sitting on. */
export type SaleListingStep = "vehicle" | "maintenance" | "pricing" | "published";

export interface AiPriceSuggestion {
  low: number;
  high: number;
  estimate: number;
}

export interface SaleListing {
  id: string;
  /** Set when the listing was created from a vehicle already tracked in the garage/Maintenance page. */
  ownedVehicleId?: string;
  vehicle: SaleVehicleInfo;
  history: SaleHistory;
  maintenanceRecords: MaintenanceRecord[];
  photos: string[];
  price?: number;
  aiPriceSuggestion?: AiPriceSuggestion;
  contact: SellerContact;
  step: SaleListingStep;
  createdAt: string;
}
