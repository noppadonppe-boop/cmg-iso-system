import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getKpis, getDepartments, createKpi, updateKpi, deleteKpi } from "@/lib/db";
import type { KPI, Department } from "@/lib/types";
import { Plus, Pencil, Trash2, Target, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KpiPage() {
  const { selectedYear } = useYearCycle();
  const [kpis,    setKpis]    = useState<KPI[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<KPI | null>(null);
  const [deleting, setDeleting] = useState<KPI | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [form, setForm] = useState({ name: "", target: "", unit: "", departmentId: "" });

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [k, d] = await Promise.all([getKpis(selectedYear.id), getDepartments()]);
      setKpis(k); setDepts(d);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() { setForm({ name:"", target:"", unit:"", departmentId:"" }); setErr(""); setShowNew(true); }
  function openEdit(k: KPI) { setForm({ name: k.name, target: String(k.target), unit: k.unit, departmentId: k.departmentId }); setErr(""); setEditing(k); }

  async function handleSave() {
    if (!form.name || !form.target || !form.unit || !form.departmentId) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateKpi(editing.id, { name: form.name, target: Number(form.target), unit: form.unit, departmentId: form.departmentId });
        setEditing(null);
      } else {
        await createKpi({ name: form.name, target: Number(form.target), unit: form.unit, departmentId: form.departmentId, yearCycleId: selectedYear!.id });
        setShowNew(false);
      }
      fetchData();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try { await deleteKpi(deleting.id); setDeleting(null); fetchData(); }
    finally { setSaving(false); }
  }

  const byDept = depts.map(d => ({ dept: d, kpis: kpis.filter(k => k.departmentId === d.id) })).filter(g => g.kpis.length > 0);

  return (
    <AppLayout title="KPI Management">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100"><Target className="h-5 w-5 text-blue-600" /></div>
          <div><p className="font-semibold text-slate-800">KPI Management</p><p className="text-xs text-slate-500">{kpis.length} KPIs · {selectedYear?.year}</p></div>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add KPI</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : (
        <div className="space-y-5">
          {byDept.map(({ dept, kpis: dkpis }) => (
            <Card key={dept.id} className="border border-slate-200">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{dept.code}</Badge>
                  {dept.name}
                  <span className="text-xs text-slate-400 font-normal ml-auto">{dkpis.length} KPIs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                    <th className="text-left px-4 py-2">KPI Name</th>
                    <th className="text-center px-4 py-2">Target</th>
                    <th className="text-center px-4 py-2">Unit</th>
                    <th className="text-center px-4 py-2 w-24">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {dkpis.map(k => (
                      <tr key={k.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{k.name}</td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-blue-700">{k.target}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{k.unit}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleting(k)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
          {byDept.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Target className="h-10 w-10 mb-3 text-slate-200" />
              <p className="text-sm">No KPIs for {selectedYear?.year}</p>
            </div>
          )}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={showNew || !!editing} onOpenChange={v => { if (!v) { setShowNew(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit KPI" : "New KPI"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">KPI Name *</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Target *</Label><Input type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Unit *</Label><Input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="%, ชั่วโมง, ครั้ง" className="mt-1 h-9 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Department *</Label>
              <Select value={form.departmentId} onValueChange={v=>setForm(f=>({...f,departmentId:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>{depts.map(d=><SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {err && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setShowNew(false);setEditing(null);}}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:null}{editing?"Save Changes":"Create KPI"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete KPI</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Are you sure you want to delete <span className="font-semibold">"{deleting?.name}"</span>? This will also delete all associated reports.</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<Trash2 className="h-4 w-4 mr-1"/>}Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
