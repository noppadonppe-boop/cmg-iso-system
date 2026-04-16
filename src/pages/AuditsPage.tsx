import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, createAudit, updateAudit, deleteAudit, getDepartments, getCpars, createCpar } from "@/lib/db";
import { listAllUsers } from "@/lib/authService";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { AuditPlan, AuditAttachment, Department, UserProfile } from "@/lib/types";
import { ShieldCheck, Loader2, RefreshCw, AlertTriangle, Plus, Pencil, Upload, FileText, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned", IN_PROGRESS: "In Progress", COMPLETED: "Completed", CLOSED: "Closed",
};

const STATUS_FLOW: Record<string, string> = {
  PLANNED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED", COMPLETED: "CLOSED",
};

const STATUS_COLOR: Record<string, string> = {
  PLANNED:     "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  CLOSED:      "bg-slate-100 text-slate-500 border-slate-200",
};

const NONE = "__none__";
const ISO_LABELS: Record<string, string> = {
  ISO9001:  "ISO 9001 (Quality)",
  ISO45001: "ISO 45001 (Safety)",
  BOTH:     "Both (ISO 9001 + ISO 45001)",
};
const EMPTY_FORM = {
  auditType:   "INTERNAL",
  isoStandard: "ISO9001",
  roundNumber:  1,
  scheduledDate: "",
  endDate:      "",
  status:       "PLANNED",
  auditeeId:    NONE,
  auditorId:    NONE,
  scope:        "",
  remarks:      "",
};

export default function AuditsPage() {
  const { selectedYear } = useYearCycle();
  const [audits,  setAudits]  = useState<AuditPlan[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType,   setFilterType]   = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [raiseTarget,   setRaiseTarget]   = useState<AuditPlan | null>(null);
  const [raiseForm,     setRaiseForm]     = useState({ cparNo: "", title: "", description: "", dueDate: "" });
  const [raisingSaving, setRaisingSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuditPlan | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving,         setSaving]         = useState(false);
  const [attachments,    setAttachments]    = useState<AuditAttachment[]>([]);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [a, d, all] = await Promise.all([getAudits(selectedYear.id), getDepartments(), listAllUsers()]);
      setAudits(a); setDepts(d);
      setUsers(all.filter(u => u.status === "approved"));
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = audits.filter(a => {
    if (filterType   !== "ALL" && a.auditType !== filterType)   return false;
    if (filterStatus !== "ALL" && a.status    !== filterStatus) return false;
    return true;
  });

  async function openRaiseCpar(audit: AuditPlan) {
    setRaiseTarget(audit);
    setRaiseForm({ cparNo: "", title: "", description: "", dueDate: "" });
    if (selectedYear) {
      const existing = await getCpars(selectedYear.id);
      const prefix = `CPAR-${selectedYear.year}-`;
      const nums = existing.filter(c => c.cparNo.startsWith(prefix)).map(c => parseInt(c.cparNo.slice(prefix.length)) || 0);
      const next = Math.max(0, ...nums) + 1;
      setRaiseForm(f => ({ ...f, cparNo: `${prefix}${String(next).padStart(3, "0")}` }));
    }
  }

  async function handleRaiseCpar() {
    if (!selectedYear || !raiseTarget || !raiseForm.title || !raiseForm.dueDate || !raiseForm.cparNo) return;
    const dept = depts.find(d => d.id === raiseTarget.departmentId) ?? { id: "", code: "", name: "" };
    setRaisingSaving(true);
    try {
      const newId = await createCpar({
        cparNo:             raiseForm.cparNo,
        auditId:            raiseTarget.id,
        yearCycleId:        selectedYear.id,
        title:              raiseForm.title,
        description:        raiseForm.description,
        status:             "ISSUED",
        rootCause:          null,
        correctiveAction:   null,
        verificationResult: null,
        issuedDate:         new Date().toISOString(),
        dueDate:            raiseForm.dueDate,
        closedDate:         null,
        departmentId:       raiseTarget.departmentId,
        department:         dept,
      });
      await updateAudit(raiseTarget.id, { cpars: [...(raiseTarget.cpars ?? []), { id: newId }] });
      setRaiseTarget(null);
      fetchData();
    } finally { setRaisingSaving(false); }
  }

  async function handleDelete(audit: AuditPlan) {
    if (!window.confirm(`ลบ Audit Plan ของ "${audit.auditee?.name}" วันที่ ${audit.scheduledDate ? format(new Date(audit.scheduledDate), "d MMM yyyy") : "-"}?\nการลบนี้ไม่สามารถย้อนกลับได้`)) return;
    setDeleting(audit.id);
    try { await deleteAudit(audit.id); fetchData(); }
    finally { setDeleting(null); }
  }

  async function advanceStatus(audit: AuditPlan) {
    const next = STATUS_FLOW[audit.status];
    if (!next) return;
    setUpdating(audit.id);
    try { await updateAudit(audit.id, { status: next }); fetchData(); }
    finally { setUpdating(null); }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openAdd() {
    setEditTarget(null);
    setAttachments([]);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(audit: AuditPlan) {
    setEditTarget(audit);
    setAttachments(audit.attachments ?? []);
    setForm({
      auditType:    audit.auditType,
      isoStandard:  audit.isoStandard  ?? "ISO9001",
      roundNumber:  audit.roundNumber,
      scheduledDate: audit.scheduledDate ? audit.scheduledDate.slice(0, 10) : "",
      endDate:      audit.endDate      ? audit.endDate.slice(0, 10) : "",
      status:       audit.status,
      auditeeId:    audit.auditeeId || NONE,
      auditorId:    audit.auditorId  || NONE,
      scope:        audit.scope    ?? "",
      remarks:      audit.remarks  ?? "",
    });
    setDialogOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editTarget || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    setUploadProgress(0);
    try {
      const path = `auditPlans/${editTarget.id}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve,
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      const newAtt: AuditAttachment = { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() };
      const updated = [...attachments, newAtt];
      await updateAudit(editTarget.id, { attachments: updated });
      setAttachments(updated);
      fetchData();
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(idx: number) {
    if (!editTarget) return;
    const updated = attachments.filter((_, i) => i !== idx);
    await updateAudit(editTarget.id, { attachments: updated });
    setAttachments(updated);
    fetchData();
  }

  async function handleSave() {
    if (!selectedYear || !form.auditeeId || form.auditeeId === NONE) return;
    const auditee = users.find(u => u.uid === form.auditeeId);
    const auditor = form.auditorId !== NONE ? users.find(u => u.uid === form.auditorId) : undefined;
    if (!auditee) return;
    const dept = depts.find(d => d.id === auditee.departmentId) ?? { id: "", code: "", name: "" };
    const auditeeName = `${auditee.firstName} ${auditee.lastName}`.trim();
    const auditorName = auditor ? `${auditor.firstName} ${auditor.lastName}`.trim() : "";
    const payload = {
      auditType:    form.auditType,
      isoStandard:  form.isoStandard as "ISO9001" | "ISO45001" | "BOTH",
      roundNumber:  Number(form.roundNumber),
      scheduledDate: form.scheduledDate,
      endDate:      form.endDate      || undefined,
      status:       form.status,
      departmentId: auditee.departmentId ?? "",
      auditeeId:    form.auditeeId,
      auditorId:    form.auditorId !== NONE ? form.auditorId : "",
      auditee:      { id: auditee.uid, name: auditeeName, department: dept },
      auditor:      auditor ? { id: auditor.uid, name: auditorName } : undefined,
      scope:        form.scope    || undefined,
      remarks:      form.remarks  || undefined,
    };
    setSaving(true);
    try {
      if (editTarget) {
        await updateAudit(editTarget.id, payload);
      } else {
        await createAudit({ ...payload, yearCycleId: selectedYear.id, cpars: [] });
      }
      setDialogOpen(false);
      fetchData();
    } finally { setSaving(false); }
  }

  const isFormValid = form.scheduledDate && form.auditeeId && form.auditeeId !== NONE;

  return (
    <AppLayout title="Audit Plans">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.keys(STATUS_LABELS).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <div className="text-sm text-slate-500">{filtered.length} audit{filtered.length !== 1 ? "s" : ""}</div>
        <Button size="sm" onClick={openAdd} className="h-9 gap-1.5 ml-auto bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4" /> Add Audit Plan
        </Button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />Audit Plans — {selectedYear?.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No audit plans found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(audit => {
                  const dept = depts.find(d => d.id === audit.departmentId);
                  const next = STATUS_FLOW[audit.status];
                  return (
                    <div key={audit.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-sm">
                      <div className="w-24 text-xs text-slate-500 font-mono shrink-0">
                        {audit.scheduledDate ? format(new Date(audit.scheduledDate), "d MMM yyyy") : "—"}
                      </div>
                      <Badge className={cn("text-[10px] shrink-0", audit.auditType === "INTERNAL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                        {audit.auditType === "INTERNAL" ? "INT" : "EXT"} R{audit.roundNumber}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-800">{audit.auditee?.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{audit.auditee?.department?.code ?? dept?.code}</span>
                      </div>
                      {audit.auditor && (
                        <span className="text-xs text-slate-500 hidden md:block">Auditor: {audit.auditor.name}</span>
                      )}
                      <Badge className={cn("text-[10px] shrink-0 border", STATUS_COLOR[audit.status])}>
                        {STATUS_LABELS[audit.status] ?? audit.status}
                      </Badge>
                      {audit.cpars.length > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />{audit.cpars.length}
                        </span>
                      )}
                      <Button size="xs" variant="ghost" onClick={() => openEdit(audit)} className="shrink-0 h-7 w-7 p-0 text-slate-400 hover:text-blue-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => handleDelete(audit)} disabled={!!deleting} className="shrink-0 h-7 w-7 p-0 text-slate-300 hover:text-red-500">
                        {deleting === audit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                      {(audit.status === "IN_PROGRESS" || audit.status === "COMPLETED") && (
                        <Button size="xs" variant="outline" onClick={() => openRaiseCpar(audit)} className="shrink-0 text-[10px] h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 gap-1">
                          <AlertTriangle className="h-3 w-3" />CPAR
                        </Button>
                      )}
                      {next && (
                        <Button size="xs" variant="outline" disabled={!!updating} onClick={() => advanceStatus(audit)} className="shrink-0 text-xs h-7">
                          {updating === audit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : `→ ${STATUS_LABELS[next]}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Audit Plan" : "Add Audit Plan"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 overflow-y-auto max-h-[72vh] pr-1">
            {/* Row: Type + Round */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Audit Type</Label>
                <Select value={form.auditType} onValueChange={v => setForm(f => ({ ...f, auditType: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Round No.</Label>
                <Input
                  type="number" min={1} className="h-9 text-sm"
                  value={form.roundNumber}
                  onChange={e => setForm(f => ({ ...f, roundNumber: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* ISO Standard */}
            <div className="space-y-1.5">
              <Label className="text-xs">ISO Standard <span className="text-red-500">*</span></Label>
              <Select value={form.isoStandard} onValueChange={v => setForm(f => ({ ...f, isoStandard: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ISO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scheduled Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date" className="h-9 text-sm"
                  value={form.scheduledDate}
                  onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date" className="h-9 text-sm"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auditee */}
            <div className="space-y-1.5">
              <Label className="text-xs">Auditee <span className="text-red-500">*</span></Label>
              <Select value={form.auditeeId} onValueChange={v => setForm(f => ({ ...f, auditeeId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select auditee..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => {
                    const dept = depts.find(d => d.id === u.departmentId);
                    return (
                      <SelectItem key={u.uid} value={u.uid}>
                        <span>{u.firstName} {u.lastName}</span>
                        {dept && <span className="text-slate-400 ml-1 text-[11px]">({dept.code})</span>}
                        {u.roles?.length > 0 && <span className="text-blue-500 ml-1 text-[11px]">[{u.roles.join(", ")}]</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Auditor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Auditor</Label>
              <Select value={form.auditorId} onValueChange={v => setForm(f => ({ ...f, auditorId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select auditor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— ไม่ระบุ —</SelectItem>
                  {users.map(u => {
                    const dept = depts.find(d => d.id === u.departmentId);
                    return (
                      <SelectItem key={u.uid} value={u.uid}>
                        <span>{u.firstName} {u.lastName}</span>
                        {dept && <span className="text-slate-400 ml-1 text-[11px]">({dept.code})</span>}
                        {u.roles?.length > 0 && <span className="text-blue-500 ml-1 text-[11px]">[{u.roles.join(", ")}]</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <Label className="text-xs">Audit Scope / ขอบเขต</Label>
              <Textarea
                placeholder="ระบุขอบเขต process / clause ที่ตรวจ เช่น 4.1, 6.1, 8.1..."
                className="text-sm min-h-[64px] resize-none"
                value={form.scope}
                onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks / หมายเหตุ</Label>
              <Textarea
                placeholder="บันทึกข้อมูลเพิ่มเติม..."
                className="text-sm min-h-[56px] resize-none"
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              />
            </div>

            {/* Attachments — Edit mode only */}
            {editTarget && (
              <div className="space-y-2">
                <Label className="text-xs">Attachments / เอกสารแนบ</Label>

                {/* File list */}
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 group">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                        >
                          {att.name}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.size)}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 hidden sm:block">
                          {format(new Date(att.uploadedAt), "d MMM yy")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Upload button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-9 text-xs gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload File (max 20 MB)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !isFormValid} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editTarget ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Raise CPAR Dialog ── */}
      <Dialog open={!!raiseTarget} onOpenChange={v => !v && setRaiseTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-red-700">Raise CPAR</DialogTitle>
            {raiseTarget && (
              <p className="text-xs text-slate-500 mt-1">
                From: {raiseTarget.auditee?.name}
                {raiseTarget.auditee?.department?.code ? ` (${raiseTarget.auditee.department.code})` : ""}
                {" — "}{raiseTarget.scheduledDate ? format(new Date(raiseTarget.scheduledDate), "d MMM yyyy") : ""}
              </p>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">CPAR No. <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm font-mono" value={raiseForm.cparNo} onChange={e => setRaiseForm(f => ({ ...f, cparNo: e.target.value }))} placeholder="CPAR-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title / หัวข้อ Non-Conformance <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm" value={raiseForm.title} onChange={e => setRaiseForm(f => ({ ...f, title: e.target.value }))} placeholder="ระบุหัวข้อข้อบกพร่อง..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description / รายละเอียด</Label>
              <Textarea className="text-sm min-h-[72px] resize-none" value={raiseForm.description} onChange={e => setRaiseForm(f => ({ ...f, description: e.target.value }))} placeholder="อธิบายรายละเอียดของ non-conformance..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date <span className="text-red-500">*</span></Label>
              <Input type="date" className="h-9 text-sm" value={raiseForm.dueDate} onChange={e => setRaiseForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaiseTarget(null)} disabled={raisingSaving}>Cancel</Button>
            <Button onClick={handleRaiseCpar} disabled={raisingSaving || !raiseForm.title || !raiseForm.dueDate || !raiseForm.cparNo} className="bg-red-600 hover:bg-red-700 text-white">
              {raisingSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Raise CPAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
