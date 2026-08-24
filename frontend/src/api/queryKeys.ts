/** Single source of truth for cache keys, so hooks and invalidations can't drift. */
export const queryKeys = {
  userProfile: ["user", "profile"] as const,
  vehicles: ["vehicles"] as const,
  maintenanceRecords: (vehicleId: string) =>
    ["vehicles", vehicleId, "maintenance-records"] as const,
  conversations: (vehicleId: string) =>
    ["vehicles", vehicleId, "conversations"] as const,
};
