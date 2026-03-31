import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, getCpars, getKpis, getKpiReports, getMocs, getAuditors } from "@/lib/db";
import type { AuditPlan, CPAR, KPI, KPIReport, MOC } from "@/lib/types";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Target, ShieldCheck, AlertTriangle, GitMerge, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#e11d48"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DashboardPage() {
  const { selectedYear } = useYearCycle();
  const [audits,   setAudits]   = useState<AuditPlan[]>([]);
  const [cpars,    setCpars]    = useState<CPAR[]>([]);
  const [kpis,     setKpis]     = useState<KPI[]>([]);
  const [reports,  setReports]  = useState<KPIReport[]>([]);
  const [mocs,     setMocs]     = useState<MOC[]>([]);
  const [activeAuditors, setActiveAuditors] = useState(0);
  const [loading,  setLoading]  = useState(true);

  const fetchAll = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [a, c, k, r, m, aud] = await Promise.all([
        getAudits(selectedYear.id),
        getCpars(selectedYear.id),
        getKpis(selectedYear.id),
        getKpiReports({ yearId: selectedYear.id }),
        getMocs(selectedYear.id),
        getAuditors(),
      ]);
      setAudits(a); setCpars(c); setKpis(k); setReports(r); setMocs(m);
      setActiveAuditors(aud.filter(a => a.isActiveAuditor).length);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const completedAudits = audits.filter(a => a.status === "COMPLETED" || a.status === "CLOSED").length;
  const openCpars       = cpars.filter(c => c.status !== "CLOSED").length;
  const closedCpars     = cpars.filter(c => c.status === "CLOSED").length;
  const openMocs        = mocs.filter(m => m.status !== "CLOSED").length;
  const kpiSubmitted    = reports.length;
  const kpiTotal        = kpis.length * 12;
  const kpiPct          = kpiTotal > 0 ? Math.round((kpiSubmitted / kpiTotal) * 100) : 0;

  // CPAR pie
  const cparPie = [
    { name: "Closed",        value: cpars.filter(c => c.status === "CLOSED").length },
    { name: "Pending Verif", value: cpars.filter(c => c.status === "PENDING_VERIFICATION").length },
    { name: "Planning",      value: cpars.filter(c => c.status === "PLANNING").length },
    { name: "Issued",        value: cpars.filter(c => c.status === "ISSUED").length },
  ].filter(d => d.value > 0);

  // KPI trend per month
  const kpiTrend = MONTHS.map((m, i) => {
    const monthReports = reports.filter(r => r.reportMonth === i + 1);
    const onTime = monthReports.filter(r => r.status === "ON_TIME").length;
    const late   = monthReports.filter(r => r.status === "LATE").length;
    return { month: m, onTime, late };
  });

  // MOC per month
  const mocTrend = MONTHS.map((m, i) => {
    const monthMocs = mocs.filter(mo => new Date(mo.createdAt).getMonth() === i);
    return {
      month: m,
      open:   monthMocs.filter(mo => mo.status !== "CLOSED").length,
      closed: monthMocs.filter(mo => mo.status === "CLOSED").length,
    };
  });

  return (
    <AppLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading dashboard data...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={ShieldCheck} label="Audits Completed" value={`${completedAudits}/${audits.length}`} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={AlertTriangle} label="Open CPARs" value={`${openCpars}`} sub={`${closedCpars} closed`} color="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={Target} label="KPI Submission" value={`${kpiPct}%`} sub={`${kpiSubmitted}/${kpiTotal} reports`} color="text-green-600" bg="bg-green-50" />
            <StatCard icon={GitMerge} label="Open MOCs" value={`${openMocs}`} sub={`${mocs.length} total`} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CPAR Status Pie */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700">CPAR Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {cparPie.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No CPAR data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={cparPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {cparPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* KPI Trend Line */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700">KPI Submission Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={kpiTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="onTime" stroke="#22c55e" name="On Time" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="late"   stroke="#ef4444" name="Late"    strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* MOC Progress Bar */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700">MOC Monthly Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mocTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="open"   fill="#f59e0b" name="Open"   stackId="a" />
                    <Bar dataKey="closed" fill="#22c55e" name="Closed" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold text-slate-700">Year Summary — {selectedYear?.year}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <SummaryRow label="Active Auditors"   value={String(activeAuditors)} />
                <SummaryRow label="Total Audits"      value={String(audits.length)} />
                <SummaryRow label="Total CPARs"       value={String(cpars.length)} />
                <SummaryRow label="KPIs Tracked"      value={String(kpis.length)} />
                <SummaryRow label="Total MOCs"        value={String(mocs.length)} />
                <SummaryRow label="KPI Completion"    value={`${kpiPct}%`} highlight={kpiPct >= 80} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; bg: string;
}) {
  return (
    <Card className={cn("border border-slate-200", bg)}>
      <CardContent className="p-3 md:p-4 flex items-start justify-between gap-1 md:gap-2 overflow-hidden">
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-0.5 md:mb-1 truncate">{label}</p>
          <p className={cn("text-lg md:text-2xl font-bold truncate", color)}>{value}</p>
          {sub && <p className="text-[9px] md:text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <Icon className={cn("h-4 w-4 md:h-5 md:w-5 mt-0.5 shrink-0", color)} />
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold", highlight ? "text-green-600" : "text-slate-700")}>{value}</span>
    </div>
  );
}
