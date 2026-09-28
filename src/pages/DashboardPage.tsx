import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useYearCycle } from "@/context/YearCycleContext";
import {
  getAudits,
  getAuditors,
  getCpars,
  getDepartments,
  getDocuments,
  getInternalAuditChecklistItems,
  getKpiReports,
  getKpis,
  getManagementReviews,
  getMocs,
} from "@/lib/db";
import type {
  AuditorProfile,
  AuditPlan,
  CPAR,
  Department,
  Document,
  InternalAuditChecklistItem,
  KPI,
  KPIReport,
  ManagementReview,
  MOC,
} from "@/lib/types";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CalendarCheck2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitMerge,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CHART_COLORS = {
  blue: "#2563eb",
  cyan: "#0891b2",
  indigo: "#4f46e5",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#9333ea",
  slate: "#64748b",
};

const CPAR_STATUS = [
  { key: "ISSUED", label: "Issued", color: "#ef4444" },
  { key: "PLANNING", label: "Planning", color: "#f59e0b" },
  { key: "PENDING_VERIFICATION", label: "Verification", color: "#3b82f6" },
  { key: "CLOSED", label: "Closed", color: "#22c55e" },
];

const MOC_STATUS = [
  { key: "MEETING_SETUP", label: "Meeting setup", color: "#64748b" },
  { key: "PENDING_APPROVAL", label: "Pending approval", color: "#f59e0b" },
  { key: "ACTION_IN_PROGRESS", label: "In progress", color: "#3b82f6" },
  { key: "CLOSED", label: "Closed", color: "#22c55e" },
];

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function achievementPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return clamp((value / target) * 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function DashboardPage() {
  const { selectedYear } = useYearCycle();
  const [audits, setAudits] = useState<AuditPlan[]>([]);
  const [cpars, setCpars] = useState<CPAR[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [reports, setReports] = useState<KPIReport[]>([]);
  const [mocs, setMocs] = useState<MOC[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [checklistItems, setChecklistItems] = useState<InternalAuditChecklistItem[]>([]);
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [auditors, setAuditors] = useState<AuditorProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!selectedYear) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [auditData, cparData, kpiData, reportData, mocData, documentData, checklistData, reviewData, auditorData, departmentData] = await Promise.all([
        getAudits(selectedYear.id),
        getCpars(selectedYear.id),
        getKpis(selectedYear.id),
        getKpiReports({ yearId: selectedYear.id }),
        getMocs(selectedYear.id),
        getDocuments(),
        getInternalAuditChecklistItems(selectedYear.id),
        getManagementReviews(selectedYear.id),
        getAuditors(),
        getDepartments(),
      ]);

      setAudits(auditData);
      setCpars(cparData);
      setKpis(kpiData);
      setReports(reportData);
      setMocs(mocData);
      setDocuments(documentData);
      setChecklistItems(checklistData);
      setReviews(reviewData);
      setAuditors(auditorData);
      setDepartments(departmentData);
    } catch (fetchError) {
      console.error("Failed to load KPI dashboard", fetchError);
      setError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const departmentMap = useMemo(() => new Map(departments.map(department => [department.id, department.code])), [departments]);
  const kpiMap = useMemo(() => new Map(kpis.map(kpi => [kpi.id, kpi])), [kpis]);

  const completedAudits = audits.filter(audit => audit.status === "COMPLETED" || audit.status === "CLOSED").length;
  const closedCpars = cpars.filter(cpar => cpar.status === "CLOSED").length;
  const closedMocs = mocs.filter(moc => moc.status === "CLOSED").length;
  const activeDocuments = documents.filter(document => document.status !== "OBSOLETE");
  const activeAuditors = auditors.filter(auditor => auditor.isActiveAuditor).length;
  const kpiReportTarget = kpis.length * 12;
  const kpiCoverage = percent(reports.length, kpiReportTarget);
  const auditCompletion = percent(completedAudits, audits.length);
  const cparClosure = percent(closedCpars, cpars.length);
  const mocClosure = percent(closedMocs, mocs.length);
  const reviewCompletion = percent(reviews.filter(review => review.status === "COMPLETED").length, reviews.length);
  const overdueDocuments = documents.filter(document => {
    const nextReviewDate = toDate(document.nextReviewDate);
    return document.status === "ACTIVE" && nextReviewDate !== null && nextReviewDate < new Date();
  }).length;
  const activeDocumentCount = activeDocuments.filter(document => document.status === "ACTIVE").length;
  const documentHealth = percent(activeDocumentCount - overdueDocuments, activeDocuments.length);

  const kpiScores = useMemo(() => kpis.map(kpi => {
    const relatedReports = reports.filter(report => report.kpiId === kpi.id);
    const validReports = kpi.target > 0 ? relatedReports : [];
    const score = validReports.length > 0
      ? validReports.reduce((total, report) => total + achievementPercent(report.value, kpi.target), 0) / validReports.length
      : 0;
    return {
      ...kpi,
      score,
      reportCount: relatedReports.length,
      departmentCode: kpi.department?.code ?? departmentMap.get(kpi.departmentId) ?? "Unassigned",
    };
  }), [departmentMap, kpis, reports]);

  const scoredKpis = kpiScores.filter(kpi => kpi.reportCount > 0);
  const overallKpiScore = scoredKpis.length > 0
    ? Math.round(scoredKpis.reduce((total, kpi) => total + kpi.score, 0) / scoredKpis.length)
    : 0;

  const kpiDepartmentData = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    kpiScores.filter(kpi => kpi.reportCount > 0).forEach(kpi => {
      const current = groups.get(kpi.departmentCode) ?? { total: 0, count: 0 };
      groups.set(kpi.departmentCode, { total: current.total + kpi.score, count: current.count + 1 });
    });
    return Array.from(groups.entries())
      .map(([department, value]) => ({ department, score: Math.round(value.total / value.count) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [kpiScores]);

  const kpiTrend = useMemo(() => MONTHS.map((month, index) => {
    const monthReports = reports.filter(report => report.reportMonth === index + 1);
    const achievementReports = monthReports.filter(report => (kpiMap.get(report.kpiId)?.target ?? 0) > 0);
    const achievement = achievementReports.length > 0
      ? achievementReports.reduce((total, report) => total + achievementPercent(report.value, kpiMap.get(report.kpiId)?.target ?? 0), 0) / achievementReports.length
      : 0;
    return {
      month,
      submitted: monthReports.length,
      onTime: monthReports.filter(report => report.status === "ON_TIME").length,
      late: monthReports.filter(report => report.status === "LATE").length,
      achievement: Math.round(achievement),
    };
  }), [kpiMap, reports]);

  const auditTrend = useMemo(() => MONTHS.map((month, index) => {
    const monthAudits = audits.filter(audit => toDate(audit.scheduledDate)?.getMonth() === index);
    return {
      month,
      planned: monthAudits.length,
      completed: monthAudits.filter(audit => audit.status === "COMPLETED" || audit.status === "CLOSED").length,
    };
  }), [audits]);

  const workstreamData = [
    { label: "Audits", value: auditCompletion, detail: `${completedAudits}/${audits.length}`, color: CHART_COLORS.blue },
    { label: "KPI reports", value: kpiCoverage, detail: `${reports.length}/${kpiReportTarget}`, color: CHART_COLORS.indigo },
    { label: "CPAR closure", value: cparClosure, detail: `${closedCpars}/${cpars.length}`, color: CHART_COLORS.green },
    { label: "Document control", value: documentHealth, detail: `${activeDocumentCount}/${activeDocuments.length}`, color: CHART_COLORS.cyan },
    { label: "MOC closure", value: mocClosure, detail: `${closedMocs}/${mocs.length}`, color: CHART_COLORS.purple },
    { label: "Management review", value: reviewCompletion, detail: `${reviews.filter(review => review.status === "COMPLETED").length}/${reviews.length}`, color: CHART_COLORS.amber },
  ];

  const cparPie = CPAR_STATUS.map(status => ({
    name: status.label,
    value: cpars.filter(cpar => cpar.status === status.key).length,
    color: status.color,
  })).filter(item => item.value > 0);

  const documentStatusData = [
    { name: "Active", value: documents.filter(document => document.status === "ACTIVE").length, color: CHART_COLORS.green },
    { name: "Under review", value: documents.filter(document => document.status === "UNDER_REVIEW").length, color: CHART_COLORS.amber },
    { name: "Draft", value: documents.filter(document => document.status === "DRAFT").length, color: CHART_COLORS.slate },
    { name: "Obsolete", value: documents.filter(document => document.status === "OBSOLETE").length, color: CHART_COLORS.red },
  ];

  const mocStatusData = MOC_STATUS.map(status => ({
    name: status.label,
    value: mocs.filter(moc => moc.status === status.key).length,
    color: status.color,
  }));

  const checklistStandardData = [
    { name: "ISO 9001", value: checklistItems.filter(item => item.isoStandard === "ISO9001" || item.isoStandard === "BOTH").length, color: CHART_COLORS.blue },
    { name: "ISO 45001", value: checklistItems.filter(item => item.isoStandard === "ISO45001" || item.isoStandard === "BOTH").length, color: CHART_COLORS.cyan },
  ];

  const auditorCapabilityData = [
    { name: "Active auditors", value: activeAuditors, color: CHART_COLORS.indigo },
    { name: "ISO 9001 qualified", value: auditors.filter(auditor => auditor.iso9001ExamPassed).length, color: CHART_COLORS.blue },
    { name: "ISO 45001 qualified", value: auditors.filter(auditor => auditor.iso45001ExamPassed).length, color: CHART_COLORS.cyan },
  ];

  const departmentActivityData = useMemo(() => departments.map(department => ({
    department: department.code,
    activity: audits.filter(audit => audit.departmentId === department.id).length
      + cpars.filter(cpar => cpar.departmentId === department.id).length
      + kpis.filter(kpi => kpi.departmentId === department.id).length
      + documents.filter(document => document.departmentId === department.id).length,
  })).sort((a, b) => b.activity - a.activity).slice(0, 8), [audits, cpars, departments, documents, kpis]);

  return (
    <AppLayout title="KPI Dashboard">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAll} />
      ) : (
        <div className="space-y-6 pb-8">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-5 text-white shadow-xl shadow-blue-100 md:p-7">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200"><Activity className="h-4 w-4" /> ISO management system</div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">KPI Dashboard</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">A single view of performance across planning, execution, checking and improvement for the selected year cycle.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <CalendarCheck2 className="h-5 w-5 text-cyan-200" />
                <div><p className="text-[10px] uppercase tracking-wider text-blue-200">Selected year cycle</p><p className="text-lg font-semibold">{selectedYear?.year ?? "—"}</p></div>
              </div>
            </div>
            <div className="relative mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              <HeroStat label="Overall KPI score" value={`${overallKpiScore}%`} note={`${scoredKpis.length}/${kpis.length} KPIs reported`} />
              <HeroStat label="Audit completion" value={`${auditCompletion}%`} note={`${completedAudits} completed`} />
              <HeroStat label="CPAR closure" value={`${cparClosure}%`} note={`${cpars.length - closedCpars} open items`} />
              <HeroStat label="Active auditors" value={formatNumber(activeAuditors)} note={`${auditors.length} profiles`} />
            </div>
          </section>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div><h3 className="text-lg font-semibold text-slate-800">Performance overview</h3><p className="text-sm text-slate-500">Live summary from every ISO workflow menu.</p></div>
            <Button variant="outline" size="sm" onClick={fetchAll} className="w-fit gap-2 border-slate-200 bg-white"><RefreshCw className="h-3.5 w-3.5" /> Refresh data</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Target} label="KPI report coverage" value={`${kpiCoverage}%`} detail={`${reports.length} of ${kpiReportTarget || 0} monthly reports`} tone="indigo" href="/kpi/reports" />
            <MetricCard icon={AlertTriangle} label="Open CPARs" value={formatNumber(cpars.length - closedCpars)} detail={`${closedCpars} closed`} tone="amber" href="/cpar" />
            <MetricCard icon={FileCheck2} label="Documents under review" value={formatNumber(documents.filter(document => document.status === "UNDER_REVIEW").length)} detail={`${overdueDocuments} overdue reviews`} tone="cyan" href="/documents" />
            <MetricCard icon={GitMerge} label="MOCs in progress" value={formatNumber(mocs.filter(moc => moc.status !== "CLOSED").length)} detail={`${closedMocs} closed`} tone="purple" href="/moc" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard className="xl:col-span-2" title="KPI attainment by department" subtitle="Average target achievement, normalized to a maximum of 100%">
              {kpiDepartmentData.length === 0 ? <EmptyChart message="No KPI reports for this year cycle" /> : (
                <ResponsiveContainer width="100%" height={285}>
                  <BarChart data={kpiDepartmentData} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={value => `${value}%`} />
                    <YAxis type="category" dataKey="department" width={62} tick={{ fontSize: 11, fill: "#475569" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => [`${value}%`, "Attainment"]} />
                    <Bar dataKey="score" fill={CHART_COLORS.indigo} radius={[0, 5, 5, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Workstream health" subtitle="Completion across core workflows">
              <div className="space-y-4 pt-1">
                {workstreamData.map(item => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-600">{item.label}</span><span className="font-semibold text-slate-700">{item.value}% <span className="font-normal text-slate-400">({item.detail})</span></span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${clamp(item.value)}%`, backgroundColor: item.color }} /></div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard className="xl:col-span-2" title="KPI reporting trend" subtitle="Monthly submission status and normalized attainment">
              <ResponsiveContainer width="100%" height={285}>
                <ComposedChart data={kpiTrend} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis yAxisId="score" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={value => `${value}%`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar yAxisId="count" dataKey="onTime" name="On time" stackId="reports" fill={CHART_COLORS.green} />
                  <Bar yAxisId="count" dataKey="late" name="Late" stackId="reports" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="score" type="monotone" dataKey="achievement" name="Avg. attainment" stroke={CHART_COLORS.indigo} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="CPAR status" subtitle="Corrective and preventive action flow">
              {cparPie.length === 0 ? <EmptyChart message="No CPAR data for this year cycle" /> : (
                <>
                  <ResponsiveContainer width="100%" height={205}><PieChart><Pie data={cparPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{cparPie.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE} /></PieChart></ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{cparPie.map(item => <div key={item.name} className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span><span className="ml-auto font-semibold text-slate-700">{item.value}</span></div>)}</div>
                </>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard title="Audit plan execution" subtitle="Planned vs completed by month">
              <ResponsiveContainer width="100%" height={230}><LineChart data={auditTrend} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} /><Line type="monotone" dataKey="planned" name="Planned" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.green} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
              <MiniFooter icon={ShieldCheck} label="Audit plans" value={`${completedAudits}/${audits.length} complete`} href="/audits" />
            </ChartCard>

            <ChartCard title="Document control" subtitle="Current document portfolio status">
              <ResponsiveContainer width="100%" height={205}><BarChart data={documentStatusData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={45} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="value" name="Documents" radius={[5, 5, 0, 0]}>{documentStatusData.map(item => <Cell key={item.name} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer>
              <MiniFooter icon={FileText} label="Review alerts" value={`${overdueDocuments} overdue`} href="/documents" tone={overdueDocuments > 0 ? "red" : "green"} />
            </ChartCard>

            <ChartCard title="MOC workflow" subtitle="Management of change status">
              <div className="space-y-3 pt-2">{mocStatusData.map(item => <div key={item.name} className="flex items-center gap-3"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1 truncate text-xs text-slate-600">{item.name}</span><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-32"><div className="h-full rounded-full" style={{ width: `${percent(item.value, mocs.length)}%`, backgroundColor: item.color }} /></div><span className="w-5 text-right text-xs font-semibold text-slate-700">{item.value}</span></div>)}</div>
              <MiniFooter icon={GitMerge} label="Closed changes" value={`${mocClosure}%`} href="/moc" tone={mocClosure >= 80 ? "green" : "amber"} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard title="Internal audit checklist" subtitle="Requirement coverage by ISO standard">
              <ResponsiveContainer width="100%" height={190}><BarChart data={checklistStandardData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="value" name="Checklist items" radius={[5, 5, 0, 0]}>{checklistStandardData.map(item => <Cell key={item.name} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer>
              <MiniFooter icon={ClipboardCheck} label="Total requirements" value={formatNumber(checklistItems.length)} href="/internal-audit-checklist" />
            </ChartCard>

            <ChartCard title="Management review" subtitle="Annual review meeting status">
              <div className="flex items-center justify-center gap-8 py-5"><DonutProgress value={reviewCompletion} color={CHART_COLORS.amber} label="completed" /><div className="space-y-3 text-xs"><LegendRow color={CHART_COLORS.green} label="Completed" value={reviews.filter(review => review.status === "COMPLETED").length} /><LegendRow color={CHART_COLORS.amber} label="Scheduled" value={reviews.filter(review => review.status !== "COMPLETED").length} /><div className="border-t border-slate-100 pt-2 text-slate-400">{reviews.length} total reviews</div></div></div>
              <MiniFooter icon={Users} label="Review completion" value={`${reviewCompletion}%`} href="/management-review" tone={reviewCompletion >= 80 ? "green" : "amber"} />
            </ChartCard>

            <ChartCard title="Auditor capability" subtitle="Availability and qualification profile">
              <ResponsiveContainer width="100%" height={190}><BarChart data={auditorCapabilityData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-18} textAnchor="end" height={48} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} /><Tooltip contentStyle={TOOLTIP_STYLE} /><Bar dataKey="value" name="Auditors" radius={[5, 5, 0, 0]}>{auditorCapabilityData.map(item => <Cell key={item.name} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer>
              <MiniFooter icon={ShieldCheck} label="Auditor profiles" value={formatNumber(auditors.length)} href="/auditors" />
            </ChartCard>
          </div>

          <ChartCard title="Department activity" subtitle="Combined volume across audits, CPARs, KPIs and controlled documents">
            {departmentActivityData.length === 0 ? <EmptyChart message="No department data available" /> : <ResponsiveContainer width="100%" height={240}><BarChart data={departmentActivityData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="department" tick={{ fontSize: 11, fill: "#64748b" }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} /><Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => [value, "Activity records"]} /><Bar dataKey="activity" name="Activity" fill={CHART_COLORS.cyan} radius={[5, 5, 0, 0]} barSize={30} /></BarChart></ResponsiveContainer>}
          </ChartCard>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
            <span className="font-semibold text-slate-700">Dashboard data coverage</span>
            <DataCoverage icon={CalendarCheck2} label="Master plan / Audits" count={audits.length} />
            <DataCoverage icon={Target} label="KPI management" count={kpis.length} />
            <DataCoverage icon={FileText} label="KPI reports" count={reports.length} />
            <DataCoverage icon={FileCheck2} label="Documents" count={documents.length} />
            <DataCoverage icon={ClipboardCheck} label="Checklist" count={checklistItems.length} />
            <DataCoverage icon={AlertCircle} label="CPAR" count={cpars.length} />
            <DataCoverage icon={GitMerge} label="MOC" count={mocs.length} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function LoadingState() {
  return <div className="flex min-h-[480px] items-center justify-center text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" /> Loading KPI dashboard...</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-red-50/50 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertCircle className="h-6 w-6" /></div><div><p className="font-semibold text-slate-800">Dashboard unavailable</p><p className="mt-1 text-sm text-slate-500">{message}</p></div><Button variant="outline" size="sm" onClick={onRetry} className="gap-2 bg-white"><RefreshCw className="h-3.5 w-3.5" /> Try again</Button></div>;
}

function HeroStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-blue-200">{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p><p className="mt-1 truncate text-[10px] text-blue-200">{note}</p></div>;
}

type MetricTone = "indigo" | "amber" | "cyan" | "purple";
const metricToneClasses: Record<MetricTone, { icon: string; value: string }> = {
  indigo: { icon: "bg-indigo-50 text-indigo-600", value: "text-indigo-700" },
  amber: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  cyan: { icon: "bg-cyan-50 text-cyan-600", value: "text-cyan-700" },
  purple: { icon: "bg-purple-50 text-purple-600", value: "text-purple-700" },
};

function MetricCard({ icon: Icon, label, value, detail, tone, href }: { icon: typeof Target; label: string; value: string; detail: string; tone: MetricTone; href: string }) {
  const colors = metricToneClasses[tone];
  return <Link to={href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-start justify-between gap-2"><div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colors.icon)}><Icon className="h-4 w-4" /></div><span className="text-[10px] text-slate-400 transition group-hover:text-blue-500">View →</span></div><p className="mt-4 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={cn("mt-1 text-xl font-bold", colors.value)}>{value}</p><p className="mt-1 truncate text-[11px] text-slate-400">{detail}</p></Link>;
}

function ChartCard({ title, subtitle, className, children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return <Card className={cn("min-w-0 gap-4 border border-slate-200 bg-white py-5 shadow-sm", className)}><CardHeader className="gap-1 border-b border-slate-100 pb-3"><CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle><p className="text-xs text-slate-400">{subtitle}</p></CardHeader><CardContent className="min-w-0">{children}</CardContent></Card>;
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[205px] items-center justify-center text-center text-xs text-slate-400">{message}</div>;
}

function MiniFooter({ icon: Icon, label, value, href, tone = "blue" }: { icon: typeof Target; label: string; value: string; href: string; tone?: "blue" | "red" | "green" | "amber" }) {
  const toneClass = { blue: "text-blue-600", red: "text-red-600", green: "text-green-600", amber: "text-amber-600" }[tone];
  return <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon className={cn("h-3.5 w-3.5", toneClass)} /> {label}</div><Link to={href} className={cn("text-xs font-semibold hover:underline", toneClass)}>{value}</Link></div>;
}

function DonutProgress({ value, color, label }: { value: number; color: string; label: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative h-28 w-28"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="9" /><circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamp(value) / 100)} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold text-slate-800">{value}%</span><span className="text-[9px] text-slate-400">{label}</span></div></div>;
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return <div className="flex items-center gap-2 text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span><span className="ml-auto font-semibold text-slate-700">{value}</span></div>;
}

function DataCoverage({ icon: Icon, label, count }: { icon: typeof Target; label: string; count: number }) {
  return <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-slate-400" /> {label}: <strong className="text-slate-700">{count}</strong></span>;
}
