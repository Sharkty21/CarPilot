import type { ChatCitation } from "@/src/types/chat";
import type {
  FinanceInfo,
  InsuranceInfo,
  OwnedVehicle,
  VehicleDocument,
  WarrantyInfo,
} from "@/src/types/vehicle";

/** Vehicle sections that own an add/remove-only document list. */
export type DocumentSection = "finance" | "insurance" | "warranty";

/**
 * The section edit sheets always submit their whole form, so these requests
 * replace the stored values outright. Documents are excluded because they are
 * managed through their own endpoints.
 */
export type VehicleDetailsBody = Omit<
  OwnedVehicle,
  "id" | "finance" | "insurance" | "warranty"
>;

export type FinanceBody = Omit<FinanceInfo, "documents">;

export type InsuranceBody = Omit<InsuranceInfo, "documents">;

export type WarrantyBody = Omit<WarrantyInfo, "documents">;

export interface AddDocumentsBody {
  documents: VehicleDocument[];
}

export interface AskAssistantBody {
  question: string;
  attachmentNames: string[];
  threadId?: string;
}

export interface AssistantAnswer {
  content: string;
  citations: ChatCitation[];
}
