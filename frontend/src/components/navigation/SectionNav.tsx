import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SectionNavProps {
  items: readonly SectionNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Vertical rail beside the page content. The highlighted segment of the track
 * marks the section currently in view; clicking any item scrolls to it.
 */
const SectionNav = ({ items, activeId, onSelect }: SectionNavProps) => {
  return (
    <nav
      aria-label="Page sections"
      className="sticky top-6 hidden w-44 shrink-0 self-start lg:block"
    >
      <p className="mb-2 pl-4 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        On this page
      </p>
      <ul>
        {items.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group flex w-full items-center gap-2 border-l-2 py-2.5 pr-2 pl-4 text-left text-sm transition-colors",
                  isActive
                    ? "border-blue-500 font-semibold text-blue-700"
                    : "border-blue-100 text-slate-500 hover:border-blue-300 hover:text-slate-800"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    isActive
                      ? "text-blue-500"
                      : "text-slate-300 group-hover:text-slate-400"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SectionNav;
