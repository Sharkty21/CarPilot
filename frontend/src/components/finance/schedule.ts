import type { FinanceInfo } from "@/src/types/vehicle";

export interface SchedulePoint {
  month: number;
  label: string;
  /** Ownership built up so far: down payment plus principal paid (loans only). */
  equity: number;
  /** Outstanding balance for a loan, or remaining payment obligation for a lease. */
  debt: number;
}

const monthLabel = (startDate: string | undefined, offset: number) => {
  const start = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(start.getTime())) return `Mo ${offset}`;
  const date = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1)
  );
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
};

/**
 * Straight-line amortization for the loan. Equity and debt always sum to the
 * total purchase price so the stacked chart reads as one bar of ownership.
 */
export function buildLoanSchedule(finance: FinanceInfo): SchedulePoint[] {
  const principal = finance.amountFinanced ?? 0;
  const term = finance.termMonths ?? 0;
  if (principal <= 0 || term <= 0) return [];

  const downPayment = finance.downPayment ?? 0;
  const monthlyRate = (finance.apr ?? 0) / 100 / 12;
  const payment =
    finance.monthlyPayment ??
    (monthlyRate > 0
      ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term))
      : principal / term);

  const points: SchedulePoint[] = [];
  let balance = principal;

  for (let month = 0; month <= term; month += 1) {
    points.push({
      month,
      label: monthLabel(finance.startDate, month),
      equity: Math.round(downPayment + (principal - balance)),
      debt: Math.round(balance),
    });
    const interest = balance * monthlyRate;
    balance = Math.max(balance + interest - payment, 0);
  }

  return points;
}

/**
 * Leases build no equity, so this tracks payments made against the remaining
 * obligation for the term.
 */
export function buildLeaseSchedule(finance: FinanceInfo): SchedulePoint[] {
  const term = finance.termMonths ?? 0;
  const payment = finance.monthlyPayment ?? 0;
  if (term <= 0 || payment <= 0) return [];

  const total = payment * term;
  const points: SchedulePoint[] = [];

  for (let month = 0; month <= term; month += 1) {
    points.push({
      month,
      label: monthLabel(finance.startDate, month),
      equity: Math.round(payment * month),
      debt: Math.round(total - payment * month),
    });
  }

  return points;
}

/** Number of months elapsed since the contract started, capped at the term. */
export function monthsElapsed(finance: FinanceInfo): number {
  if (!finance.startDate || !finance.termMonths) return 0;
  const start = new Date(finance.startDate);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth());
  return Math.min(Math.max(months, 0), finance.termMonths);
}
