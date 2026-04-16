import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useYearCycle } from "@/context/YearCycleContext";
import { getKpis, getKpiReports, getDepartments, createKpiReport, updateKpiReport } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { KPI, KPIReport, Department, AuditAttachment } from "@/lib/types";
import { Printer, Plus, Loader2, CheckCircle, AlertCircle, RefreshCw, Pencil, Upload, FileText, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function statusCell(report?: KPIReport, monthIdx?: number, currentYear?: number) {
  if (!report) {
    const now = new Date();
    const yr = currentYear ?? now.getFullYear();
    const isFuture = monthIdx !== undefined && (
      now.getFullYear() < yr || (now.getFullYear() === yr && now.getMonth() < monthIdx)
    );
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
  const [showNew,     setShowNew]     = useState(false);
  const [editReport,  setEditReport]  = useState<KPIReport | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [err,         setErr]         = useState("");
  const [form,        setForm]        = useState({ kpiId:"", reportMonth:"", value:"", attachments: [] as AuditAttachment[] });
  const [editValue,   setEditValue]   = useState("");
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const tempIdRef     = useRef<string>(`new_${Date.now()}`);

  function formatBytes(b: number) {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true); setUploadPct(0);
    try {
      const path = `kpiReports/${tempIdRef.current}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", snap => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, resolve);
      });
      const url = await getDownloadURL(task.snapshot.ref);
      const att: AuditAttachment = { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() };
      setForm(f => ({ ...f, attachments: [...f.attachments, att] }));
    } finally {
      setUploading(false); setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
  const total  = reports.length;
  const submitRate = kpis.length > 0 ? Math.round((reports.length / (kpis.length * 12)) * 100) : 0;

  async function handleSubmit() {
    if (!form.kpiId || !form.reportMonth || !form.value) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    const month = Number(form.reportMonth);
    const duplicate = reports.find(r => r.kpiId === form.kpiId && r.reportMonth === month);
    if (duplicate) { setErr(`มี report เดือนนี้แล้ว กรุณากดแก้ไขที่ตาราง`); return; }
    setSaving(true);
    try {
      const kpi = kpis.find(k => k.id === form.kpiId)!;
      const now = new Date();
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
        ...(form.attachments.length ? { attachments: form.attachments } : {}),
      });
      setShowNew(false);
      setForm({ kpiId:"", reportMonth:"", value:"", attachments: [] });
      tempIdRef.current = `new_${Date.now()}`;
      fetchData();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleEditSave() {
    if (!editReport || !editValue) return;
    setSaving(true);
    try {
      await updateKpiReport(editReport.id, { value: Number(editValue) });
      setEditReport(null);
      fetchData();
    } finally { setSaving(false); }
  }

  return (
    <AppLayout title="KPI Reports">
      <div className="no-print flex flex-wrap gap-3 items-center mb-5">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Filter dept" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกแผนก</SelectItem>
            {depts.map(d=><SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={()=>window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5"/>Print</Button>
          <Button size="sm" onClick={()=>setShowNew(true)} className="h-9"><Plus className="h-4 w-4 mr-1.5"/>Submit Report</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-5 no-print">
        {([
          ["On Time",      onTime,           "text-green-700",  "bg-green-50"],
          ["Late",         late,             "text-red-700",    "bg-red-50"],
          ["Total Submit", total,            "text-slate-700",  "bg-slate-50"],
          ["Submit Rate",  `${submitRate}%`, "text-blue-700",   "bg-blue-50"],
        ] as [string, string|number, string, string][]).map(([l,v,tc,bg]) => (
          <Card key={l} className={cn("border border-slate-200", bg)}>
            <CardContent className="p-2 md:p-4 text-center md:text-left overflow-hidden">
              <p className="text-[10px] md:text-xs text-slate-500 mb-0.5 md:mb-1 truncate">{l}</p>
              <p className={cn("text-base md:text-2xl font-bold truncate", tc)}>{v}</p>
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
                            {r ? (
                              <button
                                title={`${r.value} ${kpi.unit} — ${r.status} (คลิกเพื่อแก้ไข)`}
                                onClick={() => { setEditReport(r); setEditValue(String(r.value)); }}
                                className="group relative inline-flex items-center justify-center w-8 h-6 rounded hover:bg-slate-100 transition-colors">
                                <span className="group-hover:opacity-0 transition-opacity">{statusCell(r, mi, selectedYear?.year)}</span>
                                <Pencil className="h-3 w-3 text-slate-400 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ) : (() => {
                              const now = new Date();
                              const yr = selectedYear?.year ?? now.getFullYear();
                              const isFuture = now.getFullYear() < yr || (now.getFullYear() === yr && now.getMonth() < mi);
                              if (isFuture) return <span className="text-slate-200 text-xs">—</span>;
                              return (
                                <button
                                  title={`Submit report: ${MONTHS[mi]} ${yr}`}
                                  onClick={() => { tempIdRef.current = `new_${Date.now()}`; setForm({ kpiId: kpi.id, reportMonth: String(mi + 1), value: "", attachments: [] }); setErr(""); setShowNew(true); }}
                                  className="text-xs font-medium text-orange-500 hover:text-orange-700 hover:underline transition-colors">
                                  Missing
                                </button>
                              );
                            })()}
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
      <Dialog open={showNew} onOpenChange={v=>{ if (!v) { setShowNew(false); setErr(""); setForm({ kpiId:"", reportMonth:"", value:"", attachments: [] }); tempIdRef.current = `new_${Date.now()}`; } }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader><DialogTitle>Submit KPI Report</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">KPI *</Label>
              <Select value={form.kpiId} onValueChange={v=>setForm(f=>({...f,kpiId:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select KPI"/></SelectTrigger>
                <SelectContent className="max-h-64">
                  {kpis.map(k => {
                    const dept = depts.find(d => d.id === k.departmentId);
                    return (
                      <SelectItem key={k.id} value={k.id}>
                        <span className="text-slate-500 font-mono text-[11px] mr-1.5">[{dept?.code ?? "?"}]</span>{k.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {form.kpiId && (() => {
              const k = kpis.find(x => x.id === form.kpiId);
              if (!k) return null;
              return (
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-0.5">
                  <p><span className="font-medium text-slate-700">Target:</span> {k.target} {k.unit}</p>
                  {k.description && <p><span className="font-medium text-slate-700">Description:</span> {k.description}</p>}
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Month *</Label>
                <Select value={form.reportMonth} onValueChange={v=>setForm(f=>({...f,reportMonth:v}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select month"/></SelectTrigger>
                  <SelectContent>{MONTHS.map((m,i)=><SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Value *
                  {form.kpiId && (() => { const u = kpis.find(x=>x.id===form.kpiId)?.unit; return u ? <span className="text-slate-400 ml-1">({u})</span> : null; })()}
                </Label>
                <Input type="number" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} className="mt-1 h-9 text-sm" placeholder="0"/>
              </div>
            </div>
            {/* Attachments */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attachments <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
              {form.attachments.length > 0 && (
                <div className="space-y-1.5 mt-1.5">
                  {form.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 group">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 min-w-0 text-xs text-blue-700 hover:underline truncate flex items-center gap-1">
                        {att.name}<ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                      {att.size > 0 && <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.size)}</span>}
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" onChange={handleFileUpload} />
              <Button type="button" variant="outline" size="sm" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-8 text-xs mt-1.5 gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
                {uploading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading... {uploadPct}%</>
                  : <><Upload className="h-3.5 w-3.5" />Attach File (max 20 MB)</>}
              </Button>
            </div>
            {err && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4"/>{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || uploading}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<CheckCircle className="h-4 w-4 mr-1"/>}Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={!!editReport} onOpenChange={v=>!v && setEditReport(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-blue-600"/>Edit Report</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <p className="font-medium text-slate-700">{kpis.find(k=>k.id===editReport?.kpiId)?.name}</p>
              <p className="mt-0.5">เดือน: <span className="font-semibold">{MONTHS[(editReport?.reportMonth ?? 1) - 1]}</span></p>
            </div>
            <div>
              <Label className="text-xs">Value *</Label>
              <Input type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} className="mt-1 h-9 text-sm" autoFocus />
            </div>
            {editReport?.attachments && editReport.attachments.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Attachments</p>
                <div className="space-y-1">
                  {editReport.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs text-blue-700 truncate flex-1">{att.name}</span>
                      <ExternalLink className="h-3 w-3 text-blue-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditReport(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving || !editValue}>
              {saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
