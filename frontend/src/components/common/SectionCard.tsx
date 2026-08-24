import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const SectionCard = ({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) => {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-blue-100 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="size-4.5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-heading truncate text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="truncate text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className={cn("border-t border-blue-50", contentClassName)}>
        {children}
      </div>
    </Card>
  );
};

export default SectionCard;
