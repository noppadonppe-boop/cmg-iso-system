import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Target, ClipboardList, AlertTriangle, Users,
  FileText, GitMerge, Settings, ShieldCheck, ChevronLeft, ChevronRight,
  Building2, BookOpen, UserCog,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "PLAN",
    items: [
      { href: "/master-plan", label: "Master Plan", icon: ClipboardList },
      { href: "/kpi", label: "KPI Management", icon: Target },
    ],
  },
  {
    label: "DO",
    items: [
      { href: "/kpi/reports", label: "KPI Reports", icon: FileText },
      { href: "/documents", label: "Document Control", icon: FileText },
    ],
  },
  {
    label: "CHECK",
    items: [
      { href: "/audits", label: "Audit Plans", icon: ShieldCheck },
      { href: "/cpar", label: "CPAR", icon: AlertTriangle },
      { href: "/management-review", label: "Management Review", icon: Users },
    ],
  },
  {
    label: "ACT",
    items: [
      { href: "/moc", label: "MOC", icon: GitMerge },
      { href: "/year-rollover", label: "Year Rollover", icon: Settings },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/auditors", label: "Auditor Management", icon: ShieldCheck },
      { href: "/departments", label: "Departments", icon: Building2 },
    ],
  },
  {
    label: "Help",
    items: [{ href: "/manual", label: "User Manual", icon: BookOpen }],
  },
];

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
        "flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out shrink-0 z-50",
        "fixed inset-y-0 left-0 md:relative",
        mobileOpen ? "translate-x-0 w-64 shadow-2xl md:shadow-none" : "-translate-x-full md:translate-x-0",
        effectiveCollapsed ? "md:w-16" : "md:w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-slate-700/60", effectiveCollapsed && "justify-center px-2")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-sm">
          CMG
        </div>
        {!effectiveCollapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-white">CMG ISO</p>
            <p className="text-[10px] text-slate-400 font-medium">ISO 9001 · ISO 45001</p>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      {userProfile && !effectiveCollapsed && (
        <div className="mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
          <div className="flex items-center gap-2.5">
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-500/40" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-500/40">
                {(userProfile.firstName?.[0] ?? userProfile.email[0]).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {(userProfile.roles ?? []).slice(0, 2).map(r => (
                  <span key={r} className="text-[9px] bg-blue-600/30 text-blue-300 rounded px-1 py-0.5 leading-none">{r}</span>
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
        <div className="flex justify-center py-3 border-b border-slate-700/40">
          {userProfile.photoURL ? (
            <img src={userProfile.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-500/40" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {(userProfile.firstName?.[0] ?? userProfile.email[0]).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!effectiveCollapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
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
                              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                              effectiveCollapsed && "justify-center px-0"
                            )}
                          >
                            <Icon className={cn("shrink-0 h-4 w-4", isActive ? "text-blue-400" : "text-slate-500")} />
                            {!effectiveCollapsed && <span>{item.label}</span>}
                          </NavLink>
                        </TooltipTrigger>
                        {effectiveCollapsed && (
                          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                        )}
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
              {effectiveCollapsed && <Separator className="bg-slate-700/40 my-2" />}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User Management — MasterAdmin only */}
      {isMasterAdmin && (
        <div className="border-t border-slate-700/60 px-2 py-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/user-management"
                onClick={() => {
                  if (isMobile) setMobileOpen?.(false);
                }}
                className={({ isActive }) => cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                  effectiveCollapsed && "justify-center px-0"
                )}
              >
                <div className="relative shrink-0">
                  <UserCog className="h-4 w-4" />
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
      <div className={cn("p-2 hidden md:block", isMasterAdmin ? "" : "border-t border-slate-700/60")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md py-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
