import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MaintenanceRecord } from "@/src/types/vehicle";

import { apiClient } from "./client";
import { queryKeys } from "./queryKeys";

export const fetchMaintenanceRecords = (vehicleId: string) =>
  apiClient.get<MaintenanceRecord[]>(
    `/vehicles/${vehicleId}/maintenance-records`
  );

export const useMaintenanceRecords = (vehicleId: string | null) =>
  useQuery({
    queryKey: queryKeys.maintenanceRecords(vehicleId ?? ""),
    queryFn: () => fetchMaintenanceRecords(vehicleId!),
    enabled: Boolean(vehicleId),
  });

/** The client owns the record id, so saving the same record twice is idempotent. */
export const useSaveMaintenanceRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vehicleId,
      record,
    }: {
      vehicleId: string;
      record: MaintenanceRecord;
    }) =>
      apiClient.put<MaintenanceRecord>(
        `/vehicles/${vehicleId}/maintenance-records/${record.id}`,
        record
      ),
    onSuccess: (_saved, { vehicleId }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.maintenanceRecords(vehicleId),
      }),
  });
};
