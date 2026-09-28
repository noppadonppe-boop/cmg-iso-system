import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, ClipboardList, ClipboardCheck, AlertTriangle, Users,
  FileText, GitMerge, Settings, ShieldCheck, ChevronLeft, ChevronRight,
  Building2, BookOpen, UserCog,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, iconClass: "text-sky-600" }],
  },
  {
    label: "PLAN",
    items: [
      { href: "/master-plan", label: "Master Plan", icon: ClipboardList, iconClass: "text-blue-600" },
    ],
  },
  {
    label: "KPI MANAGEMENT",
    items: [
      { href: "/kpi", label: "KPI Management", icon: Target, iconClass: "text-indigo-600" },
    ],
  },
  {
    label: "DO",
    items: [
      { href: "/documents", label: "Document Control", icon: FileText, iconClass: "text-purple-600" },
    ],
  },
  {
    label: "CHECK",
    items: [
      { href: "/audits", label: "Audit Plans", icon: ShieldCheck, iconClass: "text-teal-600" },
      { href: "/internal-audit-checklist", label: "Internal Audit Checklist", icon: ClipboardCheck, iconClass: "text-cyan-600" },
      { href: "/cpar", label: "CPAR", icon: AlertTriangle, iconClass: "text-amber-600" },
      { href: "/management-review", label: "Management Review", icon: Users, iconClass: "text-cyan-600" },
    ],
  },
  {
    label: "ACT",
    items: [
      { href: "/moc", label: "MOC", icon: GitMerge, iconClass: "text-emerald-600" },
      { href: "/year-rollover", label: "Year Rollover", icon: Settings, iconClass: "text-slate-600" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/auditors", label: "Auditor Management", icon: ShieldCheck, iconClass: "text-blue-600" },
      { href: "/departments", label: "Departments", icon: Building2, iconClass: "text-indigo-600" },
    ],
  },
  {
    label: "Help",
    items: [{ href: "/manual", label: "User Manual", icon: BookOpen, iconClass: "text-sky-600" }],
  },
];

const hiddenGroupLabels = new Set(["KPI MANAGEMENT", "DO", "CHECK", "ACT", "ADMIN"]);

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean, setMobileOpen?: (val: boolean) => void }) {
  const location = useLocation();
  const { userProfile, pendingCount, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isMasterAdmin = hasRole("MasterAdmin");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const effectiveCollapsed = collapsed && !isMobile;

  return (
    <aside
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden border-r border-slate-200/80 bg-[#eef4fa] text-slate-700 shadow-[inset_-1px_0_0_rgba(255,255,255,0.75)] transition-all duration-300 ease-in-out shrink-0 z-50",
        "fixed inset-y-0 left-0 md:relative",
        mobileOpen ? "translate-x-0 w-64 shadow-2xl md:shadow-none" : "-translate-x-full md:translate-x-0",
        effectiveCollapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className={cn("flex items-center gap-3 border-b border-slate-200/80 px-4 py-5", effectiveCollapsed && "justify-center px-2")}>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-400 font-bold text-white text-sm shadow-lg shadow-sky-200/60 ring-1 ring-white/80">
          CMG
        </div>
        {!effectiveCollapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-[0.04em] text-slate-700">CMG ISO</p>
            <p className="mt-1 truncate text-[10px] font-medium tracking-wide text-slate-500">ISO 9001 · ISO 45001</p>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      {userProfile && !effectiveCollapsed && (
        <div className="mx-3 mt-4 mb-3 rounded-2xl border border-slate-200/90 bg-white/70 p-3 shadow-lg shadow-slate-200/45 transition-colors hover:bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-400/30" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 text-sm font-bold text-white ring-2 ring-white">
                  {(userProfile.firstName?.[0] ?? userProfile.email[0]).toUpperCase()}
                </div>
              )}
              <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" aria-label="Online" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(userProfile.roles ?? []).slice(0, 2).map(r => (
                  <span key={r} className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium leading-none text-sky-700">{r}</span>
                ))}
                {(userProfile.roles?.length ?? 0) > 2 && (
                  <span className="text-[9px] text-slate-500">+{(userProfile.roles?.length ?? 0) - 2}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {userProfile && effectiveCollapsed && (
        <div className="flex justify-center border-b border-slate-200/80 py-4">
          {userProfile.photoURL ? (
            <img src={userProfile.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-400/30" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 text-xs font-bold text-white ring-2 ring-white">
              {(userProfile.firstName?.[0] ?? userProfile.email[0]).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="min-h-0 flex-1 py-3">
        <nav className="px-3 pb-4">
          {navGroups.map((group, groupIndex) => {
            const isHiddenGroup = hiddenGroupLabels.has(group.label.toUpperCase());
            const showGroupLabel = !effectiveCollapsed && !isHiddenGroup;

            return (
              <div
                key={group.label}
                className={cn(
                  "space-y-1",
                  groupIndex > 0 && (showGroupLabel ? "mt-5" : "pt-1")
                )}
              >
              {showGroupLabel && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.href}
                            onClick={() => {
                              if (isMobile) setMobileOpen?.(false);
                            }}
                            className={cn(
                              "group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-blue-100/80 text-blue-700 ring-1 ring-inset ring-blue-200 shadow-[0_6px_18px_rgba(96,165,250,0.16)]"
                                : "text-slate-600 hover:bg-white/75 hover:text-slate-800",
                              effectiveCollapsed && "justify-center px-0"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-400 transition-opacity",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-35"
                              )}
                            />
                            <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-blue-700" : `${item.iconClass} group-hover:brightness-90`)} />
                            {!effectiveCollapsed && <span>{item.label}</span>}
                          </NavLink>
                        </TooltipTrigger>
                        {effectiveCollapsed && (
                          <TooltipContent side="right" className="border border-slate-200 bg-white text-xs text-slate-700 shadow-lg">{item.label}</TooltipContent>
                        )}
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Management — MasterAdmin only */}
      {isMasterAdmin && (
        <div className="border-t border-slate-200/80 bg-white/30 px-3 py-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/user-management"
                onClick={() => {
                  if (isMobile) setMobileOpen?.(false);
                }}
                className={({ isActive }) => cn(
                  "group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-100/80 text-blue-700 ring-1 ring-inset ring-blue-200"
                    : "text-slate-600 hover:bg-white/75 hover:text-slate-800",
                  effectiveCollapsed && "justify-center px-0"
                )}
              >
                <div className="relative shrink-0">
                  <UserCog className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white leading-none">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
                {!effectiveCollapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    จัดการผู้ใช้งาน
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            </TooltipTrigger>
            {effectiveCollapsed && (
              <TooltipContent side="right" className="text-xs">
                จัดการผู้ใช้งาน{pendingCount > 0 ? ` (${pendingCount} รออนุมัติ)` : ""}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="hidden border-t border-slate-200/80 p-3 md:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/55 text-slate-500 transition-all hover:bg-white hover:text-slate-700",
            !effectiveCollapsed && "justify-start px-3"
          )}
        >
          {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!effectiveCollapsed && <span className="text-xs font-medium">Collapse navigation</span>}
        </button>
      </div>
    </aside>
  );
}
