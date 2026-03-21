import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getCpars, updateCpar, getDepartments } from "@/lib/db";
import type { CPAR, Department } from "@/lib/types";
import { AlertTriangle, Loader2, RefreshCw, ChevronRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STEPS = [
  { key: "ISSUED",               label: "1. Issued",          color: "bg-red-100 text-red-700 border-red-200" },
  { key: "PLANNING",             label: "2. Planning",        color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "PENDING_VERIFICATION", label: "3. Verification",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "CLOSED",               label: "4. Closed",          color: "bg-green-100 text-green-700 border-green-200" },
];

const STEP_NEXT: Record<string, string> = {
  ISSUED: "PLANNING", PLANNING: "PENDING_VERIFICATION", PENDING_VERIFICATION: "CLOSED",
};

export default function CparPage() {
  const { selectedYear } = useYearCycle();
  const [cpars,   setCpars]   = useState<CPAR[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected] = useState<CPAR | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [editField, setEditField] = useState<"rootCause" | "correctiveAction" | "verificationResult" | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [c, d] = await Promise.all([getCpars(selectedYear.id), getDepartments()]);
      setCpars(c); setDepts(d);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterStatus === "ALL" ? cpars : cpars.filter(c => c.status === filterStatus);

  async function advanceStep(cpar: CPAR) {
    const next = STEP_NEXT[cpar.status];
    if (!next) return;
    setAdvancing(true);
    try {
      const update: Partial<CPAR> = { status: next as CPAR["status"] };
      if (next === "CLOSED") update.closedDate = new Date().toISOString();
      await updateCpar(cpar.id, update);
      fetchData();
      setSelected(prev => prev?.id === cpar.id ? { ...prev, ...update } : prev);
    } finally { setAdvancing(false); }
  }

  async function saveField() {
    if (!selected || !editField) return;
    await updateCpar(selected.id, { [editField]: editValue });
    setSelected(prev => prev ? { ...prev, [editField!]: editValue } : prev);
    fetchData();
    setEditField(null);
  }

  const stats = STEPS.map(s => ({ ...s, count: cpars.filter(c => c.status === s.key).length }));

  return (
    <AppLayout title="CPAR">
      {/* Stat pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        {stats.map(s => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "ALL" : s.key)}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all", filterStatus === s.key ? "ring-2 ring-offset-1 ring-slate-400" : "", s.color)}>
            {s.label} <span className="font-bold">{s.count}</span>
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto h-8" onClick={fetchData}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400"><AlertTriangle className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No CPARs found</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(cpar => {
                const step = STEPS.find(s => s.key === cpar.status) ?? STEPS[0];
                const dept = depts.find(d => d.id === cpar.departmentId);
                const isSel = selected?.id === cpar.id;
                return (
                  <div key={cpar.id} onClick={() => setSelected(isSel ? null : cpar)}
                    className={cn("flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer text-sm transition-all", isSel ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
                    <div className="w-28 shrink-0">
                      <p className="font-mono font-semibold text-xs text-slate-800">{cpar.cparNo}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(cpar.issuedDate), "d MMM yyyy")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{cpar.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{cpar.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{dept?.code}</Badge>
                    <Badge className={cn("text-[10px] shrink-0 border", step.color)}>{step.label}</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 shrink-0">
            <Card className="border border-slate-200 shadow-sm sticky top-0">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-800">{selected.cparNo}</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">{selected.title}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
                </div>
                {/* Step progress */}
                <div className="flex gap-1 mt-3">
                  {STEPS.map((s, i) => (
                    <div key={s.key} className={cn("flex-1 h-1.5 rounded-full transition-all", STEPS.findIndex(ss => ss.key === selected.status) >= i ? s.color.split(" ")[0] : "bg-slate-100")} />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {/* Description */}
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Description</p><p className="text-slate-700">{selected.description || "—"}</p></div>

                {/* Root Cause */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Root Cause</p>
                    {selected.status !== "ISSUED" && selected.status !== "CLOSED" && (
                      <button className="text-[10px] text-blue-600 hover:underline" onClick={() => { setEditField("rootCause"); setEditValue(selected.rootCause ?? ""); }}>Edit</button>
                    )}
                  </div>
                  <p className="text-slate-700">{selected.rootCause || <span className="text-slate-300">Not filled</span>}</p>
                </div>

                {/* Corrective Action */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Corrective Action</p>
                    {selected.status === "PLANNING" && (
                      <button className="text-[10px] text-blue-600 hover:underline" onClick={() => { setEditField("correctiveAction"); setEditValue(selected.correctiveAction ?? ""); }}>Edit</button>
                    )}
                  </div>
                  <p className="text-slate-700">{selected.correctiveAction || <span className="text-slate-300">Not filled</span>}</p>
                </div>

                {/* Verification */}
                {(selected.status === "PENDING_VERIFICATION" || selected.status === "CLOSED") && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Verification Result</p>
                      {selected.status === "PENDING_VERIFICATION" && (
                        <button className="text-[10px] text-blue-600 hover:underline" onClick={() => { setEditField("verificationResult"); setEditValue(selected.verificationResult ?? ""); }}>Edit</button>
                      )}
                    </div>
                    <p className="text-slate-700">{selected.verificationResult || <span className="text-slate-300">Not filled</span>}</p>
                  </div>
                )}

                {STEP_NEXT[selected.status] && (
                  <Button size="sm" className="w-full mt-2" disabled={advancing} onClick={() => advanceStep(selected)}>
                    {advancing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Advance → {STEPS.find(s => s.key === STEP_NEXT[selected.status])?.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit field dialog */}
      <Dialog open={!!editField} onOpenChange={v => !v && setEditField(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="capitalize">{editField?.replace(/([A-Z])/g, " $1")}</DialogTitle></DialogHeader>
          <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={4} className="text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>Cancel</Button>
            <Button onClick={saveField}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
