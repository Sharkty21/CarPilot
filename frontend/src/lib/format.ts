import type { DocumentKind, VehicleDocument } from "@/src/types/vehicle";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

/** Returns an empty string for missing values so grid cells and detail rows stay blank. */
export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return compactCurrencyFormatter.format(value);
}

export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return numberFormatter.format(value);
}

export function formatMiles(value?: number | null): string {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} mi` : "";
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return `${value.toFixed(2)}%`;
}

/** Full vehicle description, e.g. "2021 Toyota RAV4 XLE Premium AWD". */
export function describeVehicle(vehicle: {
  year: number;
  make: string;
  model: string;
  trim?: string;
}): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function newId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${suffix}`;
}

export function documentKindFor(fileName: string): DocumentKind {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "pdf";
  if (["doc", "docx"].includes(extension)) return "doc";
  return "image";
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function filesToDocuments(files: File[]): VehicleDocument[] {
  return files.map((file) => ({
    id: newId("doc"),
    name: file.name,
    kind: documentKindFor(file.name),
    uploadedAt: today(),
  }));
}
