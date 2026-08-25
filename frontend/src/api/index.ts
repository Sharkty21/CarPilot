export { ApiError, apiClient } from "./client";
export { queryClient } from "./queryClient";
export { queryKeys } from "./queryKeys";

export { fetchUserProfile, useUserProfile } from "./user";

export {
  fetchVehicles,
  useAddDocuments,
  useCreateVehicle,
  useRemoveDocument,
  useUpdateFinance,
  useUpdateInsurance,
  useUpdateVehicleDetails,
  useUpdateWarranty,
  useVehicles,
  extractDocumentFields,
} from "./vehicles";

export {
  fetchMaintenanceRecords,
  useMaintenanceRecords,
  useSaveMaintenanceRecord,
} from "./maintenanceRecords";

export {
  fetchConversations,
  useConversations,
  useSaveConversation,
} from "./conversations";

export { streamAssistant, isMutatingAssistantTool, toolStatusLabel } from "./assistant";
export type { AssistantStreamEvent } from "./assistant";

export type {
  AddDocumentsBody,
  AskAssistantBody,
  AssistantAnswer,
  AutofillResult,
  AutofillSection,
  DocumentSection,
  FinanceBody,
  InsuranceBody,
  VehicleDetailsBody,
  WarrantyBody,
} from "./types";
