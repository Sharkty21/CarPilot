import { formatNumber } from "@/src/lib/format";
import type { WarrantyInfo } from "@/src/types/vehicle";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.44;

export interface CoverageMeter {
  /** How much of the coverage window has been consumed, 0–100. */
  usedPercent: number;
  remainingLabel: string;
  exhausted: boolean;
}

export type WarrantyStatus = "none" | "active" | "expiring" | "expired";

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

/** Coverage consumed against the contract's expiration date. */
export function timeCoverage(warranty: WarrantyInfo): CoverageMeter | null {
  if (!warranty.expirationDate) return null;

  const expiration = new Date(warranty.expirationDate).getTime();
  if (Number.isNaN(expiration)) return null;

  const start = warranty.startDate
    ? new Date(warranty.startDate).getTime()
    : Number.NaN;
  const now = Date.now();
  const daysLeft = Math.ceil((expiration - now) / MS_PER_DAY);

  if (daysLeft <= 0) {
    return { usedPercent: 100, remainingLabel: "Expired", exhausted: true };
  }

  const monthsLeft = Math.round(daysLeft / DAYS_PER_MONTH);
  const remainingLabel =
    monthsLeft >= 1
      ? `${formatNumber(monthsLeft)} ${monthsLeft === 1 ? "month" : "months"} left`
      : `${formatNumber(daysLeft)} ${daysLeft === 1 ? "day" : "days"} left`;

  const usedPercent = Number.isNaN(start)
    ? 0
    : clampPercent(((now - start) / (expiration - start)) * 100);

  return { usedPercent, remainingLabel, exhausted: false };
}

/** Coverage consumed against the contract's mileage limit. */
export function mileageCoverage(
  warranty: WarrantyInfo,
  currentMileage: number
): CoverageMeter | null {
  if (!warranty.expirationMileage) return null;

  const start = warranty.startMileage ?? 0;
  const milesLeft = warranty.expirationMileage - currentMileage;

  if (milesLeft <= 0) {
    return {
      usedPercent: 100,
      remainingLabel: "Mileage limit reached",
      exhausted: true,
    };
  }

  const span = warranty.expirationMileage - start;
  const usedPercent =
    span > 0 ? clampPercent(((currentMileage - start) / span) * 100) : 0;

  return {
    usedPercent,
    remainingLabel: `${formatNumber(milesLeft)} mi left`,
    exhausted: false,
  };
}

export function hasWarranty(warranty: WarrantyInfo): boolean {
  return Boolean(
    warranty.provider ||
      warranty.planName ||
      warranty.contractNumber ||
      warranty.expirationDate ||
      warranty.expirationMileage
  );
}

/**
 * "Expiring" fires within six months or 5,000 miles of either limit, which is
 * roughly when a renewal decision needs to be made.
 */
export function warrantyStatus(
  warranty: WarrantyInfo,
  currentMileage: number
): WarrantyStatus {
  if (!hasWarranty(warranty)) return "none";

  const time = timeCoverage(warranty);
  const mileage = mileageCoverage(warranty, currentMileage);

  if (time?.exhausted || mileage?.exhausted) return "expired";

  const monthsLeft = warranty.expirationDate
    ? (new Date(warranty.expirationDate).getTime() - Date.now()) /
      (MS_PER_DAY * DAYS_PER_MONTH)
    : Number.POSITIVE_INFINITY;
  const milesLeft = warranty.expirationMileage
    ? warranty.expirationMileage - currentMileage
    : Number.POSITIVE_INFINITY;

  return monthsLeft <= 6 || milesLeft <= 5000 ? "expiring" : "active";
}
