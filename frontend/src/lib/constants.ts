export const ROUTES = {
  HOME: "/",
  NOT_FOUND: "*",
} as const;

export const MAINTENANCE_TYPES = ["Repair", "Maintenance", "Product"] as const;

export const FINANCE_KINDS = ["Financing", "Leasing", "Owned"] as const;

export const WARRANTY_COVERAGE_LEVELS = [
  "Powertrain",
  "Bumper-to-bumper",
  "Exclusionary",
  "Wrap",
  "Component",
  "Other",
] as const;

/** Extensions the AI chat and record sheets accept for upload. */
export const UPLOAD_ACCEPT = ".pdf,.doc,.docx,image/*";

/** Vehicle photos only. */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
