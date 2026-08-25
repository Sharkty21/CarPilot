import { FINANCE_KINDS, MAINTENANCE_TYPES, WARRANTY_COVERAGE_LEVELS } from "@/src/lib/constants";

/** Convert an extracted JSON value into a form-field string. */
export function extractedToInput(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

/**
 * Copy extracted values into blank form fields only, so typed-in details are not clobbered.
 */
export function fillBlankFields<T extends Record<string, string>>(
  current: T,
  extracted: Record<string, unknown>
): T {
  const next = { ...current };
  for (const [key, raw] of Object.entries(extracted)) {
    if (!(key in next)) continue;
    const existing = next[key as keyof T];
    if (typeof existing === "string" && existing.trim() !== "") continue;

    let value = extractedToInput(raw);
    if (!value) continue;

    if (key === "coverageLevel" && !isCoverageLevel(value)) continue;
    if (key === "kind" && !isFinanceKind(value)) {
      const mapped = mapFinanceKind(value);
      if (!mapped) continue;
      value = mapped;
    }
    if (key === "type" && !isMaintenanceType(value)) continue;
    if (key === "transferable") {
      value = value.toLowerCase() === "true" || value === "Yes" ? "Yes" : "No";
    }

    next[key as keyof T] = value as T[keyof T];
  }
  return next;
}

const isCoverageLevel = (
  value: string
): value is (typeof WARRANTY_COVERAGE_LEVELS)[number] =>
  (WARRANTY_COVERAGE_LEVELS as readonly string[]).includes(value);

const isFinanceKind = (value: string): value is (typeof FINANCE_KINDS)[number] =>
  (FINANCE_KINDS as readonly string[]).includes(value);

const isMaintenanceType = (
  value: string
): value is (typeof MAINTENANCE_TYPES)[number] =>
  (MAINTENANCE_TYPES as readonly string[]).includes(value);

function mapFinanceKind(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("lease")) return "Leasing";
  if (normalized.startsWith("loan") || normalized.startsWith("financ")) {
    return "Financing";
  }
  if (normalized.startsWith("own")) return "Owned";
  return null;
}
