import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  useAddDocuments,
  useConversations,
  useCreateVehicle,
  useMaintenanceRecords,
  useRemoveDocument,
  useSaveConversation,
  useSaveMaintenanceRecord,
  useUpdateFinance,
  useUpdateInsurance,
  useUpdateVehicleDetails,
  useUpdateWarranty,
  useUserProfile,
  useVehicles,
  type DocumentSection,
  type FinanceBody,
  type InsuranceBody,
  type VehicleDetailsBody,
  type WarrantyBody,
} from "@/src/api";
import type { Conversation } from "@/src/types/chat";
import type { MaintenanceRecord } from "@/src/types/vehicle";

import { GarageContext, type GarageContextValue } from "./garageContext";

/**
 * Bridges the API hooks to the shape the UI consumes: one selected vehicle plus
 * its records and conversations. All state lives in the query cache, so the
 * only local state here is which vehicle the user is looking at.
 */
const GarageProvider = ({ children }: { children: ReactNode }) => {
  const [pickedVehicleId, setPickedVehicleId] = useState<string | null>(null);

  const userQuery = useUserProfile();
  const vehiclesQuery = useVehicles();
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);

  // Fall back to the first vehicle until the user picks one, and again if the
  // picked vehicle disappears from the garage.
  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === pickedVehicleId) ??
    vehicles[0] ??
    null;
  const selectedVehicleId = selectedVehicle?.id ?? null;

  const recordsQuery = useMaintenanceRecords(selectedVehicleId);
  const conversationsQuery = useConversations(selectedVehicleId);

  const { mutateAsync: createVehicle } = useCreateVehicle();
  const { mutateAsync: putDetails } = useUpdateVehicleDetails();
  const { mutateAsync: putFinance } = useUpdateFinance();
  const { mutateAsync: putInsurance } = useUpdateInsurance();
  const { mutateAsync: putWarranty } = useUpdateWarranty();
  const { mutateAsync: postDocuments } = useAddDocuments();
  const { mutateAsync: deleteDocument } = useRemoveDocument();
  const { mutateAsync: putRecord } = useSaveMaintenanceRecord();
  const { mutateAsync: putConversation } = useSaveConversation();

  const addVehicle = useCallback(
    async (vehicle: VehicleDetailsBody) => {
      const created = await createVehicle(vehicle);
      setPickedVehicleId(created.id);
    },
    [createVehicle]
  );

  const updateVehicleDetails = useCallback(
    async (details: VehicleDetailsBody) => {
      if (!selectedVehicleId) return;
      await putDetails({ vehicleId: selectedVehicleId, details });
    },
    [selectedVehicleId, putDetails]
  );

  const updateFinance = useCallback(
    async (finance: FinanceBody) => {
      if (!selectedVehicleId) return;
      await putFinance({ vehicleId: selectedVehicleId, finance });
    },
    [selectedVehicleId, putFinance]
  );

  const updateInsurance = useCallback(
    async (insurance: InsuranceBody) => {
      if (!selectedVehicleId) return;
      await putInsurance({ vehicleId: selectedVehicleId, insurance });
    },
    [selectedVehicleId, putInsurance]
  );

  const updateWarranty = useCallback(
    async (warranty: WarrantyBody) => {
      if (!selectedVehicleId) return;
      await putWarranty({ vehicleId: selectedVehicleId, warranty });
    },
    [selectedVehicleId, putWarranty]
  );

  const addDocuments = useCallback(
    async (section: DocumentSection, files: File[]) => {
      if (!selectedVehicleId || files.length === 0) return;
      await postDocuments({ vehicleId: selectedVehicleId, section, files });
    },
    [selectedVehicleId, postDocuments]
  );

  const removeDocument = useCallback(
    async (section: DocumentSection, documentId: string) => {
      if (!selectedVehicleId) return;
      await deleteDocument({
        vehicleId: selectedVehicleId,
        section,
        documentId,
      });
    },
    [selectedVehicleId, deleteDocument]
  );

  const saveMaintenanceRecord = useCallback(
    async (record: MaintenanceRecord) => {
      if (!selectedVehicleId) return;
      await putRecord({ vehicleId: selectedVehicleId, record });
    },
    [selectedVehicleId, putRecord]
  );

  const saveConversation = useCallback(
    async (conversation: Conversation) => {
      if (!selectedVehicleId) return;
      await putConversation({ vehicleId: selectedVehicleId, conversation });
    },
    [selectedVehicleId, putConversation]
  );

  const value = useMemo<GarageContextValue>(
    () => ({
      user: userQuery.data ?? null,
      vehicles,
      selectedVehicle,
      selectVehicle: setPickedVehicleId,
      addVehicle,
      updateVehicleDetails,
      maintenanceRecords: recordsQuery.data ?? [],
      saveMaintenanceRecord,
      conversations: conversationsQuery.data ?? [],
      saveConversation,
      updateFinance,
      updateInsurance,
      updateWarranty,
      addDocuments,
      removeDocument,
      isLoading: userQuery.isLoading || vehiclesQuery.isLoading,
      error:
        userQuery.error ??
        vehiclesQuery.error ??
        recordsQuery.error ??
        conversationsQuery.error ??
        null,
    }),
    [
      userQuery.data,
      userQuery.isLoading,
      userQuery.error,
      vehicles,
      vehiclesQuery.isLoading,
      vehiclesQuery.error,
      selectedVehicle,
      recordsQuery.data,
      recordsQuery.error,
      conversationsQuery.data,
      conversationsQuery.error,
      addVehicle,
      updateVehicleDetails,
      saveMaintenanceRecord,
      saveConversation,
      updateFinance,
      updateInsurance,
      updateWarranty,
      addDocuments,
      removeDocument,
    ]
  );

  return (
    <GarageContext.Provider value={value}>{children}</GarageContext.Provider>
  );
};

export default GarageProvider;
