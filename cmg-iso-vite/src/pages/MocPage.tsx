import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getMocs, createMoc, updateMoc, getUsers } from "@/lib/db";
import type { MOC } from "@/lib/types";
import { GitMerge, Plus, Loader2, RefreshCw, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STEPS = [
  { key: "MEETING_SETUP",      label: "1. Meeting Setup",    color: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "PENDING_APPROVAL",   label: "2. Pending Approval", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "ACTION_IN_PROGRESS", label: "3. In Progress",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "CLOSED",             label: "4. Closed",           color: "bg-green-100 text-green-700 border-green-200" },
];

const STEP_NEXT: Record<string, string> = {
  MEETING_SETUP: "PENDING_APPROVAL",
  PENDING_APPROVAL: "ACTION_IN_PROGRESS",
  ACTION_IN_PROGRESS: "CLOSED",
};

export default function MocPage() {
  const { selectedYear } = useYearCycle();
  const [mocs,    setMocs]    = useState<MOC[]>([]);
  const [users,   setUsers]   = useState<{id:string;name:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MOC | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<MOC | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [form, setForm] = useState({ title: "", description: "", requestorId: "" });

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [m, u] = await Promise.all([getMocs(selectedYear.id), getUsers()]);
      setMocs(m); setUsers(u);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterStatus === "ALL" ? mocs : mocs.filter(m => m.status === filterStatus);

  async function handleCreate() {
    if (!form.title || !form.requestorId) return;
    setSaving(true);
    try {
      const count = mocs.length + 1;
      await createMoc({
        mocNo: `MOC-${selectedYear!.year}-${String(count).padStart(3,"0")}`,
        title: form.title, description: form.description,
        requestorId: form.requestorId, yearCycleId: selectedYear!.id,
        status: "MEETING_SETUP", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setShowNew(false); setForm({ title:"", description:"", requestorId:"" });
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateMoc(editing.id, { title: form.title, description: form.description });
      setEditing(null); fetchData();
      setSelected(prev => prev?.id === editing.id ? { ...prev, title: form.title, description: form.description } : prev);
    } finally { setSaving(false); }
  }

  async function advanceStep(moc: MOC) {
    const next = STEP_NEXT[moc.status];
    if (!next) return;
    setSaving(true);
    try {
      await updateMoc(moc.id, { status: next });
      fetchData();
      setSelected(prev => prev?.id === moc.id ? { ...prev, status: next } : prev);
    } finally { setSaving(false); }
  }

  const stats = STEPS.map(s => ({ ...s, count: mocs.filter(m => m.status === s.key).length }));

  return (
    <AppLayout title="Management of Change (MOC)">
      {/* Step pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {stats.map(s => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "ALL" : s.key)}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all", filterStatus === s.key ? "ring-2 ring-offset-1 ring-slate-400" : "", s.color)}>
            {s.label} <span className="font-bold">{s.count}</span>
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto h-8" onClick={fetchData}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
        <Button size="sm" className="h-8" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" />New MOC</Button>
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400"><GitMerge className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No MOCs found</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(moc => {
                const step = STEPS.find(s => s.key === moc.status) ?? STEPS[0];
                const isSel = selected?.id === moc.id;
                return (
                  <div key={moc.id} onClick={() => setSelected(isSel ? null : moc)}
                    className={cn("flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer text-sm transition-all", isSel ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300")}>
                    <div className="w-32 shrink-0">
                      <p className="font-mono font-semibold text-xs text-slate-800">{moc.mocNo}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(moc.createdAt), "d MMM yyyy")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{moc.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{moc.description}</p>
                    </div>
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
                    <CardTitle className="text-sm font-semibold">{selected.mocNo}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{selected.title}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
                </div>
                {/* Step progress */}
                <div className="flex gap-1 mt-3">
                  {STEPS.map((s, i) => (
                    <div key={s.key} className={cn("flex-1 h-1.5 rounded-full", STEPS.findIndex(ss => ss.key === selected.status) >= i ? s.color.split(" ")[0] : "bg-slate-100")} />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Description</p><p className="text-slate-700">{selected.description || "—"}</p></div>
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Requestor</p><p className="text-slate-700">{selected.requestor?.name ?? selected.requestorId}</p></div>
                <div><p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Created</p><p className="text-slate-700">{format(new Date(selected.createdAt), "d MMMM yyyy")}</p></div>
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setEditing(selected); setForm({ title: selected.title, description: selected.description, requestorId: selected.requestorId }); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  {STEP_NEXT[selected.status] && (
                    <Button size="sm" className="flex-1 h-8 text-xs" disabled={saving} onClick={() => advanceStep(selected)}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}→ Advance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* New MOC Dialog */}
      <Dialog open={showNew} onOpenChange={v => setShowNew(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New MOC Request</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} className="mt-1 text-sm" /></div>
            <div><Label className="text-xs">Requestor *</Label>
              <Select value={form.requestorId} onValueChange={v=>setForm(f=>({...f,requestorId:v}))}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select requestor" /></SelectTrigger>
                <SelectContent>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving||!form.title||!form.requestorId}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:null}Create MOC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit MOC</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} className="mt-1 text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
