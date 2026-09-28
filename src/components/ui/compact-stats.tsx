import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompactStat = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple";
};

const TONE_CLASSES: Record<NonNullable<CompactStat["tone"]>, { icon: string; value: string }> = {
  slate:  { icon: "bg-slate-100 text-slate-600", value: "text-slate-800" },
  blue:   { icon: "bg-blue-50 text-blue-600", value: "text-blue-700" },
  green:  { icon: "bg-green-50 text-green-600", value: "text-green-700" },
  amber:  { icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  red:    { icon: "bg-red-50 text-red-600", value: "text-red-700" },
  purple: { icon: "bg-purple-50 text-purple-600", value: "text-purple-700" },
};

export function CompactStats({ items, className }: { items: CompactStat[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const tone = TONE_CLASSES[item.tone ?? "slate"];
        return (
          <div
            key={`${item.label}-${index}`}
            className="flex min-w-[145px] flex-1 items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            {Icon && (
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.icon)}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className={cn("mt-0.5 truncate text-base font-semibold", tone.value)}>
                {item.value}
                {item.sub && <span className="ml-1 text-[10px] font-normal text-slate-400">{item.sub}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
