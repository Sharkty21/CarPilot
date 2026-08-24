import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { OwnedVehicle } from "@/src/types/vehicle";

import { apiClient } from "./client";
import { queryKeys } from "./queryKeys";
import type {
  DocumentSection,
  FinanceBody,
  InsuranceBody,
  VehicleDetailsBody,
  WarrantyBody,
} from "./types";

export const fetchVehicles = () => apiClient.get<OwnedVehicle[]>("/vehicles");

export const useVehicles = () =>
  useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: fetchVehicles,
  });

/**
 * Every vehicle write answers with the whole updated vehicle, so the cache can
 * be patched in place instead of triggering a refetch.
 */
const useVehicleMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<OwnedVehicle>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (vehicle) => {
      queryClient.setQueryData<OwnedVehicle[]>(queryKeys.vehicles, (current) =>
        current?.map((existing) =>
          existing.id === vehicle.id ? vehicle : existing
        )
      );
    },
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: VehicleDetailsBody) =>
      apiClient.post<OwnedVehicle>("/vehicles", vehicle),
    onSuccess: (vehicle) => {
      queryClient.setQueryData<OwnedVehicle[]>(queryKeys.vehicles, (current) =>
        current ? [...current, vehicle] : [vehicle]
      );
    },
  });
};

export const useUpdateVehicleDetails = () =>
  useVehicleMutation(
    ({
      vehicleId,
      details,
    }: {
      vehicleId: string;
      details: VehicleDetailsBody;
    }) => apiClient.put<OwnedVehicle>(`/vehicles/${vehicleId}/details`, details)
  );

export const useUpdateFinance = () =>
  useVehicleMutation(
    ({ vehicleId, finance }: { vehicleId: string; finance: FinanceBody }) =>
      apiClient.put<OwnedVehicle>(`/vehicles/${vehicleId}/finance`, finance)
  );

export const useUpdateInsurance = () =>
  useVehicleMutation(
    ({
      vehicleId,
      insurance,
    }: {
      vehicleId: string;
      insurance: InsuranceBody;
    }) =>
      apiClient.put<OwnedVehicle>(`/vehicles/${vehicleId}/insurance`, insurance)
  );

export const useUpdateWarranty = () =>
  useVehicleMutation(
    ({ vehicleId, warranty }: { vehicleId: string; warranty: WarrantyBody }) =>
      apiClient.put<OwnedVehicle>(`/vehicles/${vehicleId}/warranty`, warranty)
  );

export const useAddDocuments = () =>
  useVehicleMutation(
    ({
      vehicleId,
      section,
      files,
    }: {
      vehicleId: string;
      section: DocumentSection;
      files: File[];
    }) => {
      const form = new FormData();
      for (const file of files) {
        form.append("files", file);
      }
      return apiClient.postForm<OwnedVehicle>(
        `/vehicles/${vehicleId}/documents/${section}/upload`,
        form
      );
    }
  );

export const useRemoveDocument = () =>
  useVehicleMutation(
    ({
      vehicleId,
      section,
      documentId,
    }: {
      vehicleId: string;
      section: DocumentSection;
      documentId: string;
    }) =>
      apiClient.delete<OwnedVehicle>(
        `/vehicles/${vehicleId}/documents/${section}/${documentId}`
      )
  );
