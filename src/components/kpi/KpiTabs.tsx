import { NavLink } from "react-router-dom";
import { FileText, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/kpi", label: "KPI Management", icon: Target },
  { href: "/kpi/reports", label: "KPI Reports", icon: FileText },
];

export function KpiTabs() {
  return (
    <nav aria-label="KPI sections" role="tablist" className="no-print mb-5 flex w-full max-w-xl gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {tabs.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          end={href === "/kpi"}
          role="tab"
          className={({ isActive }) => cn(
            "group flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            isActive
              ? "bg-blue-100/90 text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
