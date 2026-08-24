import { cn } from "@/lib/utils";

interface DetailItemProps {
  label: string;
  value?: string | number | null;
  className?: string;
  emphasis?: boolean;
}

/** Label-over-value pair that renders an em dash when the underlying data is missing. */
const DetailItem = ({ label, value, className, emphasis }: DetailItemProps) => {
  const display =
    value === undefined || value === null || value === "" ? null : value;

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate text-slate-900",
          emphasis ? "text-lg font-semibold" : "text-sm font-medium",
          !display && "text-slate-300"
        )}
      >
        {display ?? "—"}
      </dd>
    </div>
  );
};

export default DetailItem;
