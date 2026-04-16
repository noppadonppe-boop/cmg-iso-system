import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { Input } from "@/components/ui/input";
import { getCpars, createCpar, deleteCpar, updateCpar, getAudits, updateAudit, getDepartments, generateCparId } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { CPAR, AuditPlan, Department, AuditAttachment } from "@/lib/types";
import { AlertTriangle, Loader2, RefreshCw, ChevronRight, Printer, Plus, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
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
  const [cpars,      setCpars]      = useState<CPAR[]>([]);
  const [depts,      setDepts]      = useState<Department[]>([]);
  const [audits,     setAudits]     = useState<AuditPlan[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected,   setSelected]   = useState<CPAR | null>(null);
  const [advancing,  setAdvancing]  = useState(false);
  const [editField,  setEditField]  = useState<"rootCause" | "correctiveAction" | "verificationResult" | null>(null);
  const [editValue,  setEditValue]  = useState("");
  const [addOpen,    setAddOpen]    = useState(false);
  const [addForm,    setAddForm]    = useState({ title: "", description: "", auditId: "", dueDate: "" });
  const [addSaving,  setAddSaving]  = useState(false);
  const [deletingId,        setDeletingId]        = useState<string | null>(null);
  const pendingCparIdRef  = useRef<string>("");
  const cparFileInputRef  = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<AuditAttachment[]>([]);
  const [cparUploading,      setCparUploading]      = useState(false);
  const [cparUploadPct,      setCparUploadPct]      = useState(0);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [c, d, a] = await Promise.all([getCpars(selectedYear.id), getDepartments(), getAudits(selectedYear.id)]);
      setCpars(c); setDepts(d); setAudits(a);
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

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleCparFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setCparUploading(true); setCparUploadPct(0);
    try {
      const path = `cpars/${pendingCparIdRef.current}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          snap => setCparUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, resolve);
      });
      const url = await getDownloadURL(task.snapshot.ref);
      setPendingAttachments(prev => [...prev, { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() }]);
    } finally {
      setCparUploading(false); setCparUploadPct(0);
      if (cparFileInputRef.current) cparFileInputRef.current.value = "";
    }
  }

  function nextCparNo() {
    const year = selectedYear?.year ?? new Date().getFullYear();
    const prefix = `CPAR-${year}-`;
    const nums = cpars.filter(c => c.cparNo.startsWith(prefix)).map(c => parseInt(c.cparNo.slice(prefix.length)) || 0);
    return `${prefix}${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
  }

  async function handleAddCpar() {
    if (!selectedYear || !addForm.title || !addForm.auditId || !addForm.dueDate) return;
    const audit = audits.find(a => a.id === addForm.auditId);
    if (!audit) return;
    const dept = depts.find(d => d.id === audit.departmentId) ?? { id: "", code: "", name: "" };
    setAddSaving(true);
    try {
      const newId = await createCpar({
        cparNo:             nextCparNo(),
        auditId:            addForm.auditId,
        yearCycleId:        selectedYear.id,
        title:              addForm.title,
        description:        addForm.description,
        status:             "ISSUED",
        rootCause:          null,
        correctiveAction:   null,
        verificationResult: null,
        issuedDate:         new Date().toISOString(),
        dueDate:            addForm.dueDate,
        closedDate:         null,
        departmentId:       audit.departmentId,
        department:         dept,
        attachments:        pendingAttachments.length > 0 ? pendingAttachments : undefined,
      }, pendingCparIdRef.current);
      await updateAudit(addForm.auditId, { cpars: [...(audit.cpars ?? []), { id: newId }] });
      setAddOpen(false);
      setAddForm({ title: "", description: "", auditId: "", dueDate: "" });
      setPendingAttachments([]);
      fetchData();
    } finally { setAddSaving(false); }
  }

  async function handleDeleteCpar(cpar: CPAR) {
    if (!window.confirm(`ลบ CPAR "${cpar.cparNo} — ${cpar.title}"?\nการลบนี้ไม่สามารถย้อนกลับได้`)) return;
    setDeletingId(cpar.id);
    try {
      await deleteCpar(cpar.id);
      const audit = audits.find(a => a.id === cpar.auditId);
      if (audit) await updateAudit(cpar.auditId, { cpars: (audit.cpars ?? []).filter(c => c.id !== cpar.id) });
      if (selected?.id === cpar.id) setSelected(null);
      fetchData();
    } finally { setDeletingId(null); }
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
        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => { pendingCparIdRef.current = generateCparId(); setAddForm({ title: "", description: "", auditId: "", dueDate: "" }); setPendingAttachments([]); setAddOpen(true); }}>
          <Plus className="h-4 w-4" />Add CPAR
        </Button>
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
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteCpar(cpar); }}
                      disabled={!!deletingId}
                      className="shrink-0 text-slate-200 hover:text-red-500 transition-colors p-1 rounded"
                    >
                      {deletingId === cpar.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
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

      {/* ── Add CPAR Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Add CPAR</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 overflow-y-auto max-h-[70vh] pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Audit Plan <span className="text-red-500">*</span></Label>
              <Select value={addForm.auditId} onValueChange={v => setAddForm(f => ({ ...f, auditId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="เลือก Audit Plan..." /></SelectTrigger>
                <SelectContent>
                  {audits.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.auditee?.name}
                      {a.auditee?.department?.code ? ` (${a.auditee.department.code})` : ""}
                      {" — "}{a.scheduledDate ? format(new Date(a.scheduledDate), "d MMM yyyy") : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title / หัวข้อ Non-Conformance <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="ระบุหัวข้อข้อบกพร่อง..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description / รายละเอียด</Label>
              <Textarea className="text-sm min-h-[80px] resize-none" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="อธิบายรายละเอียดของ non-conformance..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date <span className="text-red-500">*</span></Label>
              <Input type="date" className="h-9 text-sm" value={addForm.dueDate} onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-xs">Attachments / เอกสารแนบ</Label>
              {pendingAttachments.length > 0 && (
                <div className="space-y-1.5">
                  {pendingAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 group">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 min-w-0 text-xs text-blue-600 hover:underline truncate flex items-center gap-1">
                        {att.name}<ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.size)}</span>
                      <button type="button"
                        onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={cparFileInputRef} type="file" className="hidden" onChange={handleCparFileUpload} />
              <Button type="button" variant="outline" size="sm"
                onClick={() => cparFileInputRef.current?.click()}
                disabled={cparUploading}
                className="w-full h-9 text-xs gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
                {cparUploading
                  ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading... {cparUploadPct}%</>)
                  : (<><Upload className="h-3.5 w-3.5" />Upload File (max 20 MB)</>)}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>Cancel</Button>
            <Button onClick={handleAddCpar} disabled={addSaving || !addForm.title || !addForm.auditId || !addForm.dueDate} className="bg-blue-600 hover:bg-blue-700 text-white">
              {addSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create CPAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
