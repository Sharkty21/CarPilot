export type MaintenanceRecordType = "Repair" | "Maintenance" | "Product";

export type DocumentKind = "pdf" | "image" | "doc";

export interface VehicleDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  uploadedAt: string;
  url?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: MaintenanceRecordType;
  description?: string;
  date?: string;
  cost?: number;
  mileage?: number;
  shop?: string;
  documents: VehicleDocument[];
}

export type FinanceKind = "Financing" | "Leasing" | "Owned";

export interface FinanceInfo {
  kind: FinanceKind;
  lender?: string;
  startDate?: string;
  termMonths?: number;
  monthlyPayment?: number;
  apr?: number;
  /** Principal for a loan, or capitalized cost for a lease. */
  amountFinanced?: number;
  downPayment?: number;
  payoffAmount?: number;
  residualValue?: number;
  annualMileageAllowance?: number;
  documents: VehicleDocument[];
}

export type WarrantyCoverageLevel =
  | "Powertrain"
  | "Bumper-to-bumper"
  | "Exclusionary"
  | "Wrap"
  | "Component"
  | "Other";

/** A purchased extended warranty or vehicle service contract. */
export interface WarrantyInfo {
  provider?: string;
  planName?: string;
  contractNumber?: string;
  coverageLevel?: WarrantyCoverageLevel;
  startDate?: string;
  /** Odometer reading when coverage began, used to measure mileage remaining. */
  startMileage?: number;
  expirationDate?: string;
  expirationMileage?: number;
  deductible?: number;
  pricePaid?: number;
  transferable?: boolean;
  notes?: string;
  documents: VehicleDocument[];
}

export interface InsuranceInfo {
  insurer?: string;
  policyNumber?: string;
  coverageType?: string;
  monthlyPremium?: number;
  deductible?: number;
  effectiveDate?: string;
  renewalDate?: string;
  agentName?: string;
  agentPhone?: string;
  documents: VehicleDocument[];
}

export interface OwnedVehicle {
  id: string;
  nickname: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  image?: string;
  mileage: number;
  licensePlate?: string;
  vin: string;
  estimatedValue?: number;
  finance: FinanceInfo;
  insurance: InsuranceInfo;
  warranty: WarrantyInfo;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}
