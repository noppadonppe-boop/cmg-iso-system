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
import type { AuditPlan, AuditAttachment, Department, UserProfile, CPAR } from "@/lib/types";
import {
  ShieldCheck, Loader2, RefreshCw, AlertTriangle, Plus, Pencil, Upload, FileText,
  ExternalLink, Trash2, CalendarDays, CheckCircle2, CircleDot, Clock3, UserRound,
  Building2, ListFilter, ArrowRight, ClipboardCheck, ChevronRight, Info,
} from "lucide-react";
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
  const [cpars,   setCpars]   = useState<CPAR[]>([]);
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
      const [a, d, all, c] = await Promise.all([getAudits(selectedYear.id), getDepartments(), listAllUsers(), getCpars(selectedYear.id)]);
      setAudits(a); setDepts(d);
      setUsers(all.filter(u => u.status === "approved"));
      setCpars(c);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = audits.filter(a => {
    if (filterType   !== "ALL" && a.auditType !== filterType)   return false;
    if (filterStatus !== "ALL" && a.status    !== filterStatus) return false;
    return true;
  });

  const statusCounts = filtered.reduce<Record<string, number>>((counts, audit) => {
    counts[audit.status] = (counts[audit.status] ?? 0) + 1;
    return counts;
  }, {});
  const totalCpars = filtered.reduce((total, audit) => total + (audit.cpars?.length ?? 0), 0);
  const completedCount = (statusCounts.COMPLETED ?? 0) + (statusCounts.CLOSED ?? 0);
  const statusSummary = [
    { key: "PLANNED", label: "Planned", color: "bg-blue-500", track: "bg-blue-100" },
    { key: "IN_PROGRESS", label: "In progress", color: "bg-amber-500", track: "bg-amber-100" },
    { key: "COMPLETED", label: "Completed", color: "bg-emerald-500", track: "bg-emerald-100" },
    { key: "CLOSED", label: "Closed", color: "bg-slate-400", track: "bg-slate-100" },
  ];
  const cparMap = new Map(cpars.map(cpar => [cpar.id, cpar]));
  const getOpenCparCount = (audit: AuditPlan) => (audit.cpars ?? []).filter(ref => cparMap.get(ref.id)?.status !== "CLOSED").length;
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aOpenCpar = getOpenCparCount(a) > 0;
    const bOpenCpar = getOpenCparCount(b) > 0;
    const aGroup = aOpenCpar ? 0 : a.status === "CLOSED" ? 2 : 1;
    const bGroup = bOpenCpar ? 0 : b.status === "CLOSED" ? 2 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
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
      <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
        {/* Page introduction */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                Check · Audit programme
              </div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Audit plans at a glance</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 md:text-[15px]">
                วางแผน ติดตามสถานะ และจัดการผลการตรวจประเมินของปีที่เลือกได้จากหน้าจอเดียว
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Selected year</p>
                <p className="mt-0.5 text-xl font-semibold">{selectedYear?.year ?? "—"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
            <CardContent className="flex items-center justify-between p-4 md:p-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Visible audit plans</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{filtered.length}</p>
                <p className="mt-1 text-[11px] text-slate-400">จากตัวกรองปัจจุบัน</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ClipboardCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
            <CardContent className="flex items-center justify-between p-4 md:p-5">
              <div>
                <p className="text-xs font-medium text-slate-500">In progress</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{statusCounts.IN_PROGRESS ?? 0}</p>
                <p className="mt-1 text-[11px] text-slate-400">กำลังดำเนินการ</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
            <CardContent className="flex items-center justify-between p-4 md:p-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Completed / closed</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{completedCount}</p>
                <p className="mt-1 text-[11px] text-slate-400">เสร็จสิ้นแล้ว</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
            <CardContent className="flex items-center justify-between p-4 md:p-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Linked CPARs</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{totalCpars}</p>
                <p className="mt-1 text-[11px] text-slate-400">เชื่อมโยงกับรายการที่แสดง</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters */}
        <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <ListFilter className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Filter audit schedule</p>
                  <p className="mt-0.5 text-xs text-slate-500">เลือกประเภทหรือสถานะเพื่อดูรายการที่ต้องการ</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Audit type</p>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger aria-label="Filter by audit type" className="h-10 w-full border-slate-200 bg-white text-sm sm:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All types</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="EXTERNAL">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger aria-label="Filter by audit status" className="h-10 w-full border-slate-200 bg-white text-sm sm:w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {Object.keys(STATUS_LABELS).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon" onClick={fetchData} aria-label="Refresh audit plans" className="h-10 w-10 border-slate-200">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                <Button onClick={openAdd} className="h-10 gap-1.5 bg-blue-600 px-4 text-white shadow-sm shadow-blue-200 hover:bg-blue-700">
                  <Plus className="h-4 w-4" /> Add audit plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule and status overview */}
        {loading ? (
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="flex min-h-72 items-center justify-center text-sm text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-500" /> Loading audit plans...
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Card className="gap-0 overflow-hidden border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
              <CardHeader className="border-b border-slate-100 bg-white p-5 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      Audit schedule
                    </CardTitle>
                    <p className="mt-1 pl-10 text-xs text-slate-500">รายการตรวจประเมินทั้งหมดของปี {selectedYear?.year ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 self-start rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 sm:self-auto">
                    <CircleDot className="h-3.5 w-3.5 text-blue-500" />
                    {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="bg-slate-50/45 p-3 md:p-4">
                {filtered.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-700">No audit plans found</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">ลองเปลี่ยนตัวกรอง หรือเพิ่ม Audit Plan ใหม่สำหรับปีที่เลือก</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedFiltered.map(audit => {
                      const dept = depts.find(d => d.id === audit.departmentId);
                      const next = STATUS_FLOW[audit.status];
                      const scheduledDate = audit.scheduledDate ? new Date(audit.scheduledDate) : null;
                      const isoLabel = audit.isoStandard ? ISO_LABELS[audit.isoStandard] : "ISO standard not set";
                      const openCparCount = getOpenCparCount(audit);
                      const hasOpenCpar = openCparCount > 0;
                      const isClosed = audit.status === "CLOSED";
                      return (
                        <article key={audit.id} className={cn(
                          "group relative rounded-xl border p-3 shadow-sm transition-all hover:shadow-md md:p-3.5",
                          hasOpenCpar
                            ? "border-amber-200 bg-amber-50/45 hover:border-amber-300"
                            : isClosed
                              ? "border-emerald-200 bg-emerald-50/55 hover:border-emerald-300"
                              : "border-slate-200/90 bg-white hover:border-blue-200",
                        )}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className={cn(
                              "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-blue-700 ring-1 ring-inset",
                              hasOpenCpar
                                ? "from-amber-50 to-orange-50 text-amber-700 ring-amber-100"
                                : isClosed
                                  ? "from-emerald-50 to-green-50 text-emerald-700 ring-emerald-100"
                                  : "from-blue-50 to-indigo-50 text-blue-700 ring-blue-100",
                            )}>
                              {scheduledDate ? (
                                <>
                                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-500">{format(scheduledDate, "MMM")}</span>
                                  <span className="mt-0.5 text-xl font-bold leading-none tracking-tight">{format(scheduledDate, "dd")}</span>
                                  <span className="mt-0.5 text-[9px] font-medium text-blue-400">{format(scheduledDate, "yyyy")}</span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">No date</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {hasOpenCpar && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    <AlertTriangle className="h-3 w-3" /> CPAR pending · {openCparCount}
                                  </span>
                                )}
                                <Badge className={cn("border-0 px-2 py-0.5 text-[10px] font-semibold", audit.auditType === "INTERNAL" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>
                                  {audit.auditType === "INTERNAL" ? "Internal" : "External"}
                                </Badge>
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  Round {audit.roundNumber}
                                </Badge>
                                <span className="text-[11px] text-slate-400">{isoLabel}</span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <h3 className="truncate text-sm font-semibold text-slate-900">{audit.auditee?.name ?? "Unnamed auditee"}</h3>
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{audit.auditee?.department?.code ?? dept?.code ?? "—"}</span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="h-3 w-3 text-slate-400" />
                                  {audit.auditee?.department?.name ?? dept?.name ?? "Department not set"}
                                </span>
                                {audit.auditor && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <UserRound className="h-3 w-3 text-slate-400" />
                                    Auditor: {audit.auditor.name}
                                  </span>
                                )}
                                {scheduledDate && (
                                  <span className="inline-flex items-center gap-1.5 text-slate-400 lg:hidden">
                                    <CalendarDays className="h-3 w-3" />
                                    {format(scheduledDate, "d MMM yyyy")}{audit.endDate ? ` – ${format(new Date(audit.endDate), "d MMM yyyy")}` : ""}
                                  </span>
                                )}
                                {audit.scope && (
                                  <span className="hidden max-w-[280px] truncate text-slate-400 xl:inline-flex"><span className="mr-1 font-medium text-slate-500">Scope:</span>{audit.scope}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto lg:max-w-[390px] lg:justify-end">
                              <Badge className={cn("border px-2 py-0.5 text-[10px]", STATUS_COLOR[audit.status])}>
                                {STATUS_LABELS[audit.status] ?? audit.status}
                              </Badge>
                              {(audit.cpars?.length ?? 0) > 0 && (
                                hasOpenCpar ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    <AlertTriangle className="h-3 w-3" /> {openCparCount} pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> CPAR closed
                                  </span>
                                )
                              )}
                              {next && (
                                <Button size="xs" variant="outline" disabled={!!updating} onClick={() => advanceStatus(audit)} className="h-7 gap-1 border-blue-200 px-2 text-[10px] text-blue-700 hover:bg-blue-50">
                                  {updating === audit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  {updating === audit.id ? "Updating..." : STATUS_LABELS[next]}
                                </Button>
                              )}
                              {(audit.status === "IN_PROGRESS" || audit.status === "COMPLETED") && (
                                <Button size="xs" variant="outline" onClick={() => openRaiseCpar(audit)} className="h-7 gap-1 border-rose-200 px-2 text-[10px] text-rose-600 hover:bg-rose-50">
                                  <AlertTriangle className="h-3 w-3" /> Raise CPAR
                                </Button>
                              )}
                              <Button size="xs" variant="ghost" onClick={() => openEdit(audit)} className="h-7 gap-1 px-2 text-[10px] text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                              <Button size="xs" variant="ghost" onClick={() => handleDelete(audit)} disabled={!!deleting} className="h-7 gap-1 px-2 text-[10px] text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                {deleting === audit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                Delete
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="gap-0 border-slate-200/80 py-0 shadow-sm shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100 p-5">
                  <CardTitle className="text-sm font-semibold text-slate-900">Status overview</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">ภาพรวมตามตัวกรองปัจจุบัน</p>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {statusSummary.map(item => {
                    const count = statusCounts[item.key] ?? 0;
                    const percent = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                    return (
                      <div key={item.key}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="flex items-center gap-2 font-medium text-slate-600"><span className={cn("h-2 w-2 rounded-full", item.color)} />{item.label}</span>
                          <span className="font-semibold text-slate-800">{count}</span>
                        </div>
                        <div className={cn("h-1.5 overflow-hidden rounded-full", item.track)}>
                          <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="gap-0 border-blue-100 bg-blue-50/65 py-0 shadow-sm shadow-blue-100/60">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <Info className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Quick guide</p>
                      <p className="mt-1.5 text-xs leading-5 text-blue-800/75">กด Edit เพื่อแก้ไขรายละเอียด กด Mark เพื่อเลื่อนสถานะ หรือ Raise CPAR เมื่อพบประเด็นจากการตรวจ</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-blue-700">
                    <ArrowRight className="h-3.5 w-3.5" />
                    สถานะจะดำเนินตามลำดับของ Audit Plan
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[760px]">
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
        <DialogContent className="sm:max-w-[600px]">
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
