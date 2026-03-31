import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useYearCycle } from "@/context/YearCycleContext";
import { getKpis, getKpiReports, getDepartments, createKpiReport } from "@/lib/db";
import type { KPI, KPIReport, Department } from "@/lib/types";
import { Printer, Plus, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function statusCell(report?: KPIReport, monthIdx?: number) {
  if (!report) {
    const now = new Date();
    const isFuture = monthIdx !== undefined && (now.getFullYear() < 2026 || (now.getMonth() < monthIdx));
    return isFuture
      ? <span className="text-slate-200 text-xs">—</span>
      : <span className="cell-missing text-xs font-medium text-orange-500">Missing</span>;
  }
  if (report.status === "ON_TIME") return <span className="cell-on-time text-xs font-semibold text-green-700">✓</span>;
  return <span className="cell-late text-xs font-semibold text-red-600">LATE</span>;
}

export default function KpiReportsPage() {
  const { selectedYear } = useYearCycle();
  const [kpis,    setKpis]    = useState<KPI[]>([]);
  const [reports, setReports] = useState<KPIReport[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [form, setForm] = useState({ kpiId:"", reportMonth:"", value:"" });

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [k, r, d] = await Promise.all([
        getKpis(selectedYear.id),
        getKpiReports({ yearId: selectedYear.id }),
        getDepartments(),
      ]);
      setKpis(k); setReports(r); setDepts(d);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredKpis = filterDept === "ALL" ? kpis : kpis.filter(k => k.departmentId === filterDept);

  function getReport(kpiId: string, month: number) {
    return reports.find(r => r.kpiId === kpiId && r.reportMonth === month);
  }

  const onTime = reports.filter(r => r.status === "ON_TIME").length;
  const late   = reports.filter(r => r.status === "LATE").length;
  const submitRate = kpis.length > 0 ? Math.round((reports.length / (kpis.length * 12)) * 100) : 0;

  async function handleSubmit() {
    if (!form.kpiId || !form.reportMonth || !form.value) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    try {
      const kpi = kpis.find(k => k.id === form.kpiId)!;
      const now = new Date();
      const month = Number(form.reportMonth);
      const deadline = new Date(selectedYear!.year, month, 5);
      const isLate = now > deadline;
      await createKpiReport({
        kpiId: form.kpiId,
        departmentId: kpi.departmentId,
        yearId: selectedYear!.id,
        reportMonth: month,
        value: Number(form.value),
        status: isLate ? "LATE" : "ON_TIME",
        submittedAt: now.toISOString(),
      });
      setShowNew(false);
      setForm({ kpiId:"", reportMonth:"", value:"" });
      fetchData();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <AppLayout title="KPI Reports">
      <div className="no-print flex flex-wrap gap-3 items-center mb-5">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Filter dept" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกแผนก</SelectItem>
            {depts.map(d=><SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5"/>Print</Button>
          <Button size="sm" onClick={()=>setShowNew(true)} className="h-9"><Plus className="h-4 w-4 mr-1.5"/>Submit Report</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 no-print">
        {[["On Time", onTime, "text-green-700 bg-green-50"], ["Late", late, "text-red-700 bg-red-50"], ["Rate", `${submitRate}%`, "text-blue-700 bg-blue-50"]].map(([l,v,c]) => (
          <Card key={l as string} className={cn("border border-slate-200", (c as string).split(" ").slice(1).join(" "))}>
            <CardContent className="p-2 md:p-4 text-center md:text-left overflow-hidden">
              <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1 truncate">{l as string}</p>
              <p className={cn("text-base md:text-2xl font-bold truncate", (c as string).split(" ")[0])}>{v as string|number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2"/>Loading...</div>
      ) : (
        <Card className="border border-slate-200 print-area">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">KPI Monthly Submission Heatmap — {selectedYear?.year}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-20">Dept</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 min-w-[180px]">KPI Name</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 w-14">Target</th>
                  {MONTHS.map(m=><th key={m} className="px-1.5 py-2.5 text-center font-medium text-slate-500 min-w-[40px]">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredKpis.map(kpi => {
                  const dept = depts.find(d => d.id === kpi.departmentId);
                  return (
                    <tr key={kpi.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">{dept?.code}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{kpi.name}</td>
                      <td className="px-2 py-2.5 text-center font-mono text-slate-600">{kpi.target} {kpi.unit}</td>
                      {MONTHS.map((_, mi) => {
                        const r = getReport(kpi.id, mi + 1);
                        return (
                          <td key={mi} className="px-1 py-2.5 text-center">
                            <div title={r ? `${r.value} ${kpi.unit} — ${r.status}` : "Not submitted"}>
                              {statusCell(r, mi)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredKpis.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">No KPIs found</div>}
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);setErr("");}}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Submit KPI Report</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">KPI *</Label>
              <Select value={form.kpiId} onValueChange={v=>setForm(f=>({...f,kpiId:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select KPI"/></SelectTrigger>
                <SelectContent>{kpis.map(k=><SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Month *</Label>
              <Select value={form.reportMonth} onValueChange={v=>setForm(f=>({...f,reportMonth:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select month"/></SelectTrigger>
                <SelectContent>{MONTHS.map((m,i)=><SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Value *</Label>
              <Input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} className="mt-1 h-9 text-sm"/>
            </div>
            {err && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4"/>{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<CheckCircle className="h-4 w-4 mr-1"/>}Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
