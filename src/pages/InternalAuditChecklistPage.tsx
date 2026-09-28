import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CompactStats } from "@/components/ui/compact-stats";
import { useYearCycle } from "@/context/YearCycleContext";
import { useAuth } from "@/context/AuthContext";
import {
  createInternalAuditChecklistItem,
  deleteInternalAuditChecklistItem,
  getDepartmentAuditChecklist,
  getDepartments,
  getInternalAuditChecklistLayout,
  getInternalAuditChecklistItems,
  saveDepartmentAuditChecklist,
  saveInternalAuditChecklistLayout,
  updateInternalAuditChecklistItem,
} from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import type {
  AuditAttachment,
  Department,
  DepartmentAuditChecklistEntry,
  DepartmentAuditResult,
  InternalAuditChecklistItem,
} from "@/lib/types";
import {
  AlertCircle,
  Check,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  LockKeyhole,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepartmentColor } from "@/lib/department-colors";

const ISO_LABELS: Record<InternalAuditChecklistItem["isoStandard"], string> = {
  ISO9001: "ISO 9001",
  ISO45001: "ISO 45001",
  BOTH: "ISO 9001 + 45001",
};

type FormState = {
  isoStandard: InternalAuditChecklistItem["isoStandard"];
  clauseNo: string;
  clauseDescriptionEn: string;
  clauseDescriptionTh: string;
  cmgPmReference: string;
  departmentIds: string[];
};

type AuditResult = DepartmentAuditResult;
type AuditEntry = DepartmentAuditChecklistEntry;

type AuditMeta = {
  auditor: string;
  auditDate: string;
  auditee: string;
  status: string;
};

const EMPTY_AUDIT_ENTRY: AuditEntry = { finding: "", result: "/", remark: "", attachments: [] };
const EMPTY_AUDIT_META: AuditMeta = { auditor: "", auditDate: "", auditee: "", status: "" };

const EMPTY_FORM: FormState = {
  isoStandard: "ISO9001",
  clauseNo: "",
  clauseDescriptionEn: "",
  clauseDescriptionTh: "",
  cmgPmReference: "",
  departmentIds: [],
};

const COLUMN_DEFAULTS: Record<string, number> = {
  iso: 112,
  clause: 92,
  description: 300,
  reference: 160,
  actions: 80,
};

const COLUMN_MINIMUMS: Record<string, number> = {
  iso: 88,
  clause: 68,
  description: 190,
  reference: 110,
  actions: 68,
};

const DEPARTMENT_COLUMN_DEFAULTS: Record<string, number> = {
  clause: 92,
  checklist: 280,
  finding: 300,
  result: 128,
  evidence: 76,
  guide: 260,
  remark: 176,
};

const DEPARTMENT_COLUMN_MINIMUMS: Record<string, number> = {
  clause: 68,
  checklist: 180,
  finding: 200,
  result: 96,
  evidence: 58,
  guide: 170,
  remark: 110,
};

export default function InternalAuditChecklistPage() {
  const { selectedYear } = useYearCycle();
  const { userProfile, hasRole } = useAuth();
  const canEditChecklist = hasRole("QMS");
  const isMasterAdmin = hasRole("MasterAdmin");
  const [items, setItems] = useState<InternalAuditChecklistItem[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InternalAuditChecklistItem | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<InternalAuditChecklistItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("matrix");
  const [auditEntries, setAuditEntries] = useState<Record<string, Record<string, AuditEntry>>>({});
  const [auditOriginalEntries, setAuditOriginalEntries] = useState<Record<string, Record<string, AuditEntry>>>({});
  const [auditMeta, setAuditMeta] = useState<Record<string, AuditMeta>>({});
  const [auditSavedAt, setAuditSavedAt] = useState<Record<string, string>>({});
  const [auditChecklistLoading, setAuditChecklistLoading] = useState(false);
  const [auditChecklistSaving, setAuditChecklistSaving] = useState(false);
  const [attachmentUploadingItemId, setAttachmentUploadingItemId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [departmentColumnWidths, setDepartmentColumnWidths] = useState<Record<string, number>>({});
  const [layoutSaving, setLayoutSaving] = useState(false);
  const resizeState = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const departmentResizeState = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const columnWidthsRef = useRef<Record<string, number>>({});
  const departmentColumnWidthsRef = useRef<Record<string, number>>({});
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const matrixDragState = useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isMatrixDragging, setIsMatrixDragging] = useState(false);

  useEffect(() => { columnWidthsRef.current = columnWidths; }, [columnWidths]);
  useEffect(() => { departmentColumnWidthsRef.current = departmentColumnWidths; }, [departmentColumnWidths]);

  useEffect(() => {
    let cancelled = false;
    getInternalAuditChecklistLayout()
      .then(layout => {
        if (cancelled) return;
        const matrixWidths = layout.matrixColumnWidths ?? {};
        const departmentWidths = layout.departmentColumnWidths ?? {};
        columnWidthsRef.current = matrixWidths;
        departmentColumnWidthsRef.current = departmentWidths;
        setColumnWidths(matrixWidths);
        setDepartmentColumnWidths(departmentWidths);
      })
      .catch(() => {
        // Keep the built-in defaults when the shared layout is unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  function getColumnWidth(key: string) {
    return columnWidths[key] ?? COLUMN_DEFAULTS[key] ?? 68;
  }

  function getColumnMinimum(key: string) {
    return COLUMN_MINIMUMS[key] ?? 55;
  }

  function getDepartmentColumnWidth(key: string) {
    return departmentColumnWidths[key] ?? DEPARTMENT_COLUMN_DEFAULTS[key] ?? 120;
  }

  function getDepartmentColumnMinimum(key: string) {
    return DEPARTMENT_COLUMN_MINIMUMS[key] ?? 60;
  }

  async function persistChecklistLayout(matrixWidths: Record<string, number>, departmentWidths: Record<string, number>) {
    if (!isMasterAdmin) return;
    setLayoutSaving(true);
    try {
      await saveInternalAuditChecklistLayout({
        matrixColumnWidths: matrixWidths,
        departmentColumnWidths: departmentWidths,
      }, userProfile?.uid ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "บันทึกความกว้างคอลัมน์ไม่สำเร็จ");
    } finally {
      setLayoutSaving(false);
    }
  }

  function startColumnResize(event: ReactPointerEvent<HTMLSpanElement>, key: string) {
    if (!isMasterAdmin) return;
    event.preventDefault();
    event.stopPropagation();
    resizeState.current = { key, startX: event.clientX, startWidth: getColumnWidth(key) };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = resizeState.current;
      if (!state) return;
      const nextWidth = Math.max(getColumnMinimum(state.key), state.startWidth + moveEvent.clientX - state.startX);
      columnWidthsRef.current = { ...columnWidthsRef.current, [state.key]: nextWidth };
      setColumnWidths(current => ({ ...current, [state.key]: nextWidth }));
    };
    const stopColumnResize = () => {
      resizeState.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopColumnResize);
      void persistChecklistLayout(columnWidthsRef.current, departmentColumnWidthsRef.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopColumnResize);
  }

  function startDepartmentColumnResize(event: ReactPointerEvent<HTMLSpanElement>, key: string) {
    if (!isMasterAdmin) return;
    event.preventDefault();
    event.stopPropagation();
    departmentResizeState.current = { key, startX: event.clientX, startWidth: getDepartmentColumnWidth(key) };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = departmentResizeState.current;
      if (!state) return;
      const nextWidth = Math.max(getDepartmentColumnMinimum(state.key), state.startWidth + moveEvent.clientX - state.startX);
      departmentColumnWidthsRef.current = { ...departmentColumnWidthsRef.current, [state.key]: nextWidth };
      setDepartmentColumnWidths(current => ({ ...current, [state.key]: nextWidth }));
    };
    const stopColumnResize = () => {
      departmentResizeState.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopColumnResize);
      void persistChecklistLayout(columnWidthsRef.current, departmentColumnWidthsRef.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopColumnResize);
  }

  function resetColumnWidths() {
    if (!isMasterAdmin) return;
    setColumnWidths({});
    setDepartmentColumnWidths({});
    columnWidthsRef.current = {};
    departmentColumnWidthsRef.current = {};
    void persistChecklistLayout({}, {});
  }

  function scrollTabs(direction: number) {
    tabsScrollRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  }

  function startMatrixDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest("button, a, input, textarea, select, label, summary, [role='separator']")) return;
    const container = event.currentTarget;
    matrixDragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
    setIsMatrixDragging(true);
  }

  function moveMatrixDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = matrixDragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const container = event.currentTarget;
    event.preventDefault();
    container.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
    container.scrollTop = state.scrollTop - (event.clientY - state.startY);
  }

  function stopMatrixDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = matrixDragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    matrixDragState.current = null;
    document.body.style.userSelect = "";
    setIsMatrixDragging(false);
  }

  function updateAuditEntry(departmentId: string, itemId: string, patch: Partial<AuditEntry>) {
    setAuditEntries(current => ({
      ...current,
      [departmentId]: {
        ...(current[departmentId] ?? {}),
        [itemId]: { ...EMPTY_AUDIT_ENTRY, ...(current[departmentId]?.[itemId] ?? {}), ...patch },
      },
    }));
  }

  function updateAuditMeta(departmentId: string, patch: Partial<AuditMeta>) {
    setAuditMeta(current => ({
      ...current,
      [departmentId]: { ...(current[departmentId] ?? EMPTY_AUDIT_META), ...patch },
    }));
  }

  async function handleDepartmentAttachmentUpload(itemId: string, files: FileList | null) {
    if (!canEditChecklist || !selectedYear || activeTab === "matrix" || !files?.length) return;
    const departmentId = activeTab;
    const selectedFiles = Array.from(files);
    setAttachmentUploadingItemId(itemId);
    setError(null);
    try {
      const uploaded: AuditAttachment[] = [];
      for (const [index, file] of selectedFiles.entries()) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `departmentAuditChecklists/${selectedYear.id}/${departmentId}/${itemId}/${Date.now()}_${index}_${safeName}`;
        const task = uploadBytesResumable(storageRef(storage, path), file);
        await new Promise<void>((resolve, reject) => {
          task.on("state_changed", undefined, reject, resolve);
        });
        uploaded.push({
          name: file.name,
          url: await getDownloadURL(task.snapshot.ref),
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      const existing = auditEntries[departmentId]?.[itemId]?.attachments ?? [];
      updateAuditEntry(departmentId, itemId, { attachments: [...existing, ...uploaded] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "แนบเอกสารไม่สำเร็จ");
    } finally {
      setAttachmentUploadingItemId(null);
    }
  }

  function removeDepartmentAttachment(itemId: string, attachmentIndex: number) {
    if (!canEditChecklist || activeTab === "matrix") return;
    const existing = auditEntries[activeTab]?.[itemId]?.attachments ?? [];
    updateAuditEntry(activeTab, itemId, { attachments: existing.filter((_, index) => index !== attachmentIndex) });
  }

  async function handleSaveDepartmentChecklist() {
    if (!canEditChecklist || !selectedYear || activeTab === "matrix") return;
    const departmentId = activeTab;
    const entries = auditEntries[departmentId] ?? {};
    const savedAt = new Date().toISOString();
    setAuditChecklistSaving(true);
    setError(null);
    try {
      await saveDepartmentAuditChecklist({
        yearCycleId: selectedYear.id,
        departmentId,
        metadata: auditMeta[departmentId] ?? EMPTY_AUDIT_META,
        entries,
        updatedAt: savedAt,
        updatedBy: userProfile?.uid ?? "",
      });

      const currentAttachmentUrls = new Set(
        Object.values(entries).flatMap(entry => (entry.attachments ?? []).map(attachment => attachment.url)),
      );
      const removedAttachments = Object.values(auditOriginalEntries[departmentId] ?? {})
        .flatMap(entry => entry.attachments ?? [])
        .filter(attachment => !currentAttachmentUrls.has(attachment.url));
      await Promise.all(removedAttachments.map(attachment =>
        deleteObject(storageRef(storage, attachment.url)).catch(() => undefined),
      ));

      setAuditOriginalEntries(current => ({ ...current, [departmentId]: entries }));
      setAuditSavedAt(current => ({ ...current, [departmentId]: savedAt }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "บันทึก Department Audit Checklist ไม่สำเร็จ");
    } finally {
      setAuditChecklistSaving(false);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [departmentData, checklistData] = await Promise.all([
        getDepartments(),
        selectedYear ? getInternalAuditChecklistItems(selectedYear.id) : Promise.resolve([]),
      ]);
      setDepts(departmentData);
      setItems(checklistData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูล Checklist ได้");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === "matrix" || !selectedYear?.id) return;
    let cancelled = false;
    setAuditChecklistLoading(true);
    getDepartmentAuditChecklist(selectedYear.id, activeTab)
      .then(record => {
        if (cancelled) return;
        const loadedEntries = Object.fromEntries(
          Object.entries(record?.entries ?? {}).map(([itemId, entry]) => [
            itemId,
            { ...EMPTY_AUDIT_ENTRY, ...entry, attachments: entry.attachments ?? [] },
          ]),
        ) as Record<string, AuditEntry>;
        setAuditMeta(current => ({ ...current, [activeTab]: record?.metadata ?? EMPTY_AUDIT_META }));
        setAuditEntries(current => ({ ...current, [activeTab]: loadedEntries }));
        setAuditOriginalEntries(current => ({ ...current, [activeTab]: loadedEntries }));
        setAuditSavedAt(current => ({ ...current, [activeTab]: record?.updatedAt ?? "" }));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "ไม่สามารถโหลดผลการตรวจของแผนกได้");
      })
      .finally(() => {
        if (!cancelled) setAuditChecklistLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, selectedYear?.id]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    depts.forEach(dept => { counts[dept.id] = 0; });
    items.forEach(item => {
      item.departmentIds.forEach(departmentId => {
        if (departmentId in counts) counts[departmentId] += 1;
      });
    });
    return counts;
  }, [depts, items]);

  const totalAssignments = useMemo(
    () => items.reduce((total, item) => total + item.departmentIds.length, 0),
    [items],
  );

  function openAdd() {
    if (!canEditChecklist) return;
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: InternalAuditChecklistItem) {
    if (!canEditChecklist) return;
    setEditTarget(item);
    setForm({
      isoStandard: item.isoStandard,
      clauseNo: item.clauseNo,
      clauseDescriptionEn: item.clauseDescriptionEn,
      clauseDescriptionTh: item.clauseDescriptionTh,
      cmgPmReference: item.cmgPmReference,
      departmentIds: [...item.departmentIds],
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function toggleDepartment(departmentId: string) {
    setForm(current => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter(id => id !== departmentId)
        : [...current.departmentIds, departmentId],
    }));
  }

  function toggleAllDepartments() {
    setForm(current => ({
      ...current,
      departmentIds: current.departmentIds.length === depts.length ? [] : depts.map(dept => dept.id),
    }));
  }

  async function handleSave() {
    if (!canEditChecklist) {
      setFormError("เฉพาะผู้ใช้ Role QMS เท่านั้นที่สามารถแก้ไข Checklist ได้");
      return;
    }
    if (!selectedYear) {
      setFormError("กรุณาเลือกปีที่ต้องการจัดทำ Checklist");
      return;
    }
    if (!form.clauseNo.trim()) {
      setFormError("กรุณาระบุเลขข้อกำหนด");
      return;
    }
    if (!form.clauseDescriptionEn.trim() && !form.clauseDescriptionTh.trim()) {
      setFormError("กรุณาระบุชื่อข้อกำหนดอย่างน้อยหนึ่งภาษา");
      return;
    }
    if (form.departmentIds.length === 0) {
      setFormError("กรุณาเลือกอย่างน้อยหนึ่งแผนก");
      return;
    }

    setSaving(true);
    setFormError(null);
    const now = new Date().toISOString();
    const payload = {
      yearCycleId: selectedYear.id,
      isoStandard: form.isoStandard,
      clauseNo: form.clauseNo.trim(),
      clauseDescriptionEn: form.clauseDescriptionEn.trim(),
      clauseDescriptionTh: form.clauseDescriptionTh.trim(),
      cmgPmReference: form.cmgPmReference.trim(),
      departmentIds: form.departmentIds,
      ...(editTarget ? {} : { createdAt: now }),
      updatedAt: now,
    };

    try {
      if (editTarget) await updateInternalAuditChecklistItem(editTarget.id, payload);
      else await createInternalAuditChecklistItem(payload);
      setDialogOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "บันทึกรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || !canEditChecklist) return;
    setSaving(true);
    try {
      await deleteInternalAuditChecklistItem(deleting.id);
      setDeleting(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ลบรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Internal Audit Checklist">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="mr-auto flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-800">Internal Audit Checklist</h2>
          </div>
        </div>

        <CompactStats
          className="min-w-[280px] flex-1 sm:flex-initial"
          items={[
            { label: "Clauses", value: items.length },
            { label: "Departments", value: depts.length },
            { label: "Assigned", value: totalAssignments, tone: "blue" },
          ]}
        />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={resetColumnWidths} disabled={!isMasterAdmin || layoutSaving} className="h-9" title={isMasterAdmin ? "Reset shared column widths" : "เฉพาะ MasterAdmin เท่านั้นที่ปรับคอลัมน์ได้"} aria-label="Reset column widths">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openAdd} disabled={!selectedYear || !canEditChecklist} title={!canEditChecklist ? "เฉพาะ Role QMS เท่านั้น" : "Add a checklist clause"} className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Clause
          </Button>
        </div>
      </div>

      {!selectedYear && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          กรุณาเลือก Year Cycle จากแถบด้านบนก่อนเพิ่มรายการ Checklist
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-red-500 hover:text-red-700" onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Checklist views</p>
              <p className="truncate text-xs text-slate-400">เลือก Matrix หรือแผนกที่ต้องการตรวจ</p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 sm:inline-flex">
            {depts.length} Departments
          </span>
        </div>

        <div className="flex items-center gap-1 p-2">
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:flex"
            aria-label="Scroll checklist tabs left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={tabsScrollRef} role="tablist" aria-label="Internal audit checklist views" className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex min-w-max gap-2 px-0.5 py-0.5">
              <button
                role="tab"
                aria-selected={activeTab === "matrix"}
                onClick={() => setActiveTab("matrix")}
                className={cn(
                  "group flex min-h-[58px] min-w-[148px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all",
                  activeTab === "matrix"
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50",
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", activeTab === "matrix" ? "bg-white/15" : "bg-blue-50 text-blue-600")}>
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">Checklist Matrix</span>
                  <span className={cn("mt-0.5 block text-[10px]", activeTab === "matrix" ? "text-blue-100" : "text-slate-400")}>{items.length} clauses</span>
                </span>
              </button>

              {depts.map(dept => {
                const count = departmentCounts[dept.id] ?? 0;
                const isActive = activeTab === dept.id;
                const color = getDepartmentColor(dept.id, dept.code);
                return (
                  <button
                    key={dept.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(dept.id)}
                    className={cn(
                      "group flex min-h-[58px] min-w-[124px] max-w-[150px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all",
                      isActive
                        ? cn(color.badge, "shadow-sm ring-1 ring-inset ring-white/60")
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold", isActive ? cn(color.accent, "text-white") : cn(color.header, "text-slate-600"))}>
                      {dept.code.slice(0, 3)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="truncate">{dept.code}</span>
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", isActive ? cn("bg-white/80", color.foreground) : cn(color.header, "text-slate-500"))}>{count}</span>
                      </span>
                      <span className={cn("mt-0.5 block truncate text-[10px]", isActive ? color.foreground : "text-slate-400")} title={dept.name}>{dept.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollTabs(1)}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:flex"
            aria-label="Scroll checklist tabs right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeTab === "matrix" ? (
        loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading...
        </div>
        ) : (
        <Card className="border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClipboardCheck className="h-4 w-4 text-cyan-600" />
              Checklist Matrix — {selectedYear?.year ?? "No Year Cycle"}
              <span className="ml-auto text-[10px] font-normal text-slate-400">ลากเพื่อเลื่อนตาราง</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-16 text-center text-slate-400">
                <ClipboardCheck className="mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">ยังไม่มีรายการข้อกำหนด</p>
                <p className="mt-1 text-xs">เพิ่มข้อกำหนด แล้วเลือกแผนกที่ต้องสุ่มตรวจได้จากปุ่ม Add Clause</p>
                <Button size="sm" className="mt-4 gap-1 bg-blue-600 text-white hover:bg-blue-700" onClick={openAdd} disabled={!selectedYear || !canEditChecklist}>
                  <Plus className="h-4 w-4" />Add First Clause
                </Button>
              </div>
            ) : (
              <div
                ref={matrixScrollRef}
                onPointerDown={startMatrixDrag}
                onPointerMove={moveMatrixDrag}
                onPointerUp={stopMatrixDrag}
                onPointerCancel={stopMatrixDrag}
                className={cn(
                  "max-h-[calc(100vh-18rem)] overflow-auto",
                  isMatrixDragging ? "cursor-grabbing" : "cursor-grab",
                )}
                title="กดเมาส์ค้างแล้วลากเพื่อเลื่อนตาราง"
              >
                <table
                  className="w-full table-fixed border-collapse text-xs"
                  style={{
                    minWidth: `${getColumnWidth("iso") + getColumnWidth("clause") + getColumnWidth("description") + getColumnWidth("reference") + depts.reduce((total, dept) => total + getColumnWidth(`dept:${dept.id}`), 0) + getColumnWidth("actions")}px`,
                  }}
                >
                  <colgroup>
                    <col style={{ width: getColumnWidth("iso") }} />
                    <col style={{ width: getColumnWidth("clause") }} />
                    <col style={{ width: getColumnWidth("description") }} />
                    <col style={{ width: getColumnWidth("reference") }} />
                    {depts.map(dept => <col key={dept.id} style={{ width: getColumnWidth(`dept:${dept.id}`) }} />)}
                    <col style={{ width: getColumnWidth("actions") }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th style={{ width: getColumnWidth("iso") }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                        <div className="line-clamp-2 leading-tight" title="ISO Standard / มาตรฐาน">ISO Standard / มาตรฐาน</div>
                        {isMasterAdmin && <ResizeHandle columnKey="iso" onStart={startColumnResize} />}
                      </th>
                      <th style={{ width: getColumnWidth("clause") }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                        <div className="line-clamp-2 leading-tight" title="Clause / ข้อกำหนด">Clause / ข้อกำหนด</div>
                        {isMasterAdmin && <ResizeHandle columnKey="clause" onStart={startColumnResize} />}
                      </th>
                      <th style={{ width: getColumnWidth("description") }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                        <div className="line-clamp-2 leading-tight" title="Clause Description / ชื่อข้อกำหนด">Clause Description / ชื่อข้อกำหนด</div>
                        {isMasterAdmin && <ResizeHandle columnKey="description" onStart={startColumnResize} />}
                      </th>
                      <th style={{ width: getColumnWidth("reference") }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                        <div className="line-clamp-2 leading-tight" title="CMG PM Reference / ระเบียบฯ">CMG PM Reference / ระเบียบฯ</div>
                        {isMasterAdmin && <ResizeHandle columnKey="reference" onStart={startColumnResize} />}
                      </th>
                      {depts.map(dept => {
                        const color = getDepartmentColor(dept.id, dept.code);
                        return (
                        <th key={dept.id} style={{ width: getColumnWidth(`dept:${dept.id}`) }} className={cn("relative border-r px-1.5 py-2 text-center font-semibold", color.header)}>
                          <div className={cn("mx-auto line-clamp-2 w-fit rounded px-1.5 py-0.5 text-[10px] leading-tight", color.badge)} title={`${dept.code} — ${dept.name}`}>{dept.code}</div>
                          <div className="mt-0.5 line-clamp-2 text-[9px] font-normal leading-tight text-slate-500" title={dept.name}>{dept.name}</div>
                          {isMasterAdmin && <ResizeHandle columnKey={`dept:${dept.id}`} onStart={startColumnResize} />}
                        </th>
                        );
                      })}
                      <th style={{ width: getColumnWidth("actions") }} className="relative px-2 py-2 text-center font-semibold">
                        <div className="line-clamp-2 leading-tight">Actions</div>
                        {isMasterAdmin && <ResizeHandle columnKey="actions" onStart={startColumnResize} />}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-blue-200 bg-blue-50/80">
                      <td className="border-r border-blue-200 px-3 py-2 font-semibold text-blue-800">Summary / สรุป</td>
                      <td colSpan={2} className="border-r border-blue-200 px-3 py-2 font-semibold text-blue-800">
                        <span className="line-clamp-2 leading-tight" title="Total Auditable Clauses per Department">Total Auditable Clauses per Department</span>
                        <span className="mt-0.5 block line-clamp-2 text-[9px] font-normal leading-tight text-blue-600">จำนวนข้อกำหนดที่ต้องสุ่มตรวจ</span>
                      </td>
                      <td className="border-r border-blue-200 px-3 py-2 text-center text-blue-400">—</td>
                      {depts.map(dept => {
                        const color = getDepartmentColor(dept.id, dept.code);
                        return (
                        <td key={dept.id} style={{ width: getColumnWidth(`dept:${dept.id}`) }} className={cn("border-r px-1.5 py-2 text-center text-sm font-bold text-slate-700", color.cell)}>
                          {departmentCounts[dept.id] ?? 0}
                        </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center text-blue-400">—</td>
                    </tr>
                    {items.map(item => (
                      <tr key={item.id} className="group border-b border-slate-100 odd:bg-white even:bg-slate-50/60 hover:bg-cyan-50/40">
                        <td className="border-r border-slate-100 px-3 py-3 align-top">
                          <Badge className="border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700">
                            {ISO_LABELS[item.isoStandard]}
                          </Badge>
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3 align-top">
                          <span className="font-semibold text-slate-800">{item.clauseNo}</span>
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3 align-top text-slate-700">
                          <div className="line-clamp-2 leading-tight" title={`${item.clauseDescriptionEn}${item.clauseDescriptionTh ? ` (${item.clauseDescriptionTh})` : ""}`}>
                            {item.clauseDescriptionEn && <span className="font-medium">{item.clauseDescriptionEn}</span>}
                            {item.clauseDescriptionTh && <span className="text-[11px] text-slate-500"> ({item.clauseDescriptionTh})</span>}
                          </div>
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3 align-top font-mono text-[11px] text-blue-700">
                          <span className="line-clamp-2 break-words" title={item.cmgPmReference || undefined}>
                            {item.cmgPmReference || <span className="font-sans text-slate-300">—</span>}
                          </span>
                        </td>
                        {depts.map(dept => {
                          const assigned = item.departmentIds.includes(dept.id);
                          const color = getDepartmentColor(dept.id, dept.code);
                          return (
                            <td key={dept.id} style={{ width: getColumnWidth(`dept:${dept.id}`) }} className={cn("border-r border-slate-100 px-1.5 py-2 text-center align-top", assigned && color.cell)}>
                              {assigned ? <Check className={cn("mx-auto h-3.5 w-3.5", color.foreground)} strokeWidth={2.5} /> : <span className="text-slate-200">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 align-top">
                          {canEditChecklist ? (
                            <div className="flex justify-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                              <button onClick={() => openEdit(item)} aria-label={`Edit clause ${item.clauseNo}`} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleting(item)} aria-label={`Delete clause ${item.clauseNo}`} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : <LockKeyhole className="mx-auto h-3.5 w-3.5 text-slate-300" aria-label="Read only for this role" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        )
      ) : (
        <DepartmentChecklistTab
          department={depts.find(dept => dept.id === activeTab) ?? null}
          items={items.filter(item => item.departmentIds.includes(activeTab))}
          metadata={auditMeta[activeTab] ?? EMPTY_AUDIT_META}
          entries={auditEntries[activeTab] ?? {}}
          canEdit={canEditChecklist}
          isMasterAdmin={isMasterAdmin}
          loading={auditChecklistLoading}
          saving={auditChecklistSaving}
          layoutSaving={layoutSaving}
          columnWidths={departmentColumnWidths}
          uploadingItemId={attachmentUploadingItemId}
          savedAt={auditSavedAt[activeTab]}
          onMetaChange={patch => updateAuditMeta(activeTab, patch)}
          onEntryChange={(itemId, patch) => updateAuditEntry(activeTab, itemId, patch)}
          onSave={handleSaveDepartmentChecklist}
          onColumnResize={startDepartmentColumnResize}
          onAttachmentUpload={handleDepartmentAttachmentUpload}
          onAttachmentRemove={removeDepartmentAttachment}
          year={selectedYear?.year}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setFormError(null); }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editTarget ? <Pencil className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
              {editTarget ? "Edit Checklist Clause" : "Add Checklist Clause"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <Label className="text-xs">ISO Standard / มาตรฐาน <span className="text-red-500">*</span></Label>
                <Select value={form.isoStandard} onValueChange={value => setForm(current => ({ ...current, isoStandard: value as FormState["isoStandard"] }))}>
                  <SelectTrigger className="mt-1 h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO9001">ISO 9001:2015</SelectItem>
                    <SelectItem value="ISO45001">ISO 45001:2018</SelectItem>
                    <SelectItem value="BOTH">Both standards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Clause No. / เลขข้อกำหนด <span className="text-red-500">*</span></Label>
                <Input value={form.clauseNo} onChange={event => setForm(current => ({ ...current, clauseNo: event.target.value }))} className="mt-1 h-9 text-sm" placeholder="เช่น 4.1, 7.5.1, 8.4.2" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Clause Description (English)</Label>
                <Textarea value={form.clauseDescriptionEn} onChange={event => setForm(current => ({ ...current, clauseDescriptionEn: event.target.value }))} className="mt-1 min-h-20 resize-y text-sm" placeholder="เช่น Context of the organization" />
              </div>
              <div>
                <Label className="text-xs">Clause Description (ภาษาไทย)</Label>
                <Textarea value={form.clauseDescriptionTh} onChange={event => setForm(current => ({ ...current, clauseDescriptionTh: event.target.value }))} className="mt-1 min-h-20 resize-y text-sm" placeholder="เช่น บริบทขององค์กร" />
              </div>
            </div>

            <div>
              <Label className="text-xs">CMG PM Reference / ระเบียบปฏิบัติที่เกี่ยวข้อง</Label>
              <Input value={form.cmgPmReference} onChange={event => setForm(current => ({ ...current, cmgPmReference: event.target.value }))} className="mt-1 h-9 text-sm" placeholder="เช่น CMG-PM-005, CMG-PM-006" />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs">Assigned Departments / แผนกที่ได้รับข้อกำหนด <span className="text-red-500">*</span></Label>
                <button type="button" onClick={toggleAllDepartments} disabled={depts.length === 0} className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-300">
                  {form.departmentIds.length === depts.length && depts.length > 0 ? "Clear all" : "Select all"}
                </button>
              </div>
              {depts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">ยังไม่มีข้อมูลแผนก กรุณาเพิ่มแผนกก่อน</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {depts.map(dept => {
                    const checked = form.departmentIds.includes(dept.id);
                    return (
                      <button key={dept.id} type="button" onClick={() => toggleDepartment(dept.id)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors", checked ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
                        <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white")}>
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold">{dept.code}</span>
                          <span className="block truncate text-[10px] text-slate-400">{dept.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !selectedYear} className="bg-blue-600 text-white hover:bg-blue-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Add Clause"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Checklist Clause</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-600">
            <p>ต้องการลบข้อกำหนด <span className="font-semibold text-slate-800">{deleting?.clauseNo}</span> ใช่หรือไม่?</p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">การลบรายการนี้จะนำข้อกำหนดออกจาก Summary ของทุกแผนก</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ResizeHandle({ columnKey, onStart }: {
  columnKey: string;
  onStart: (event: ReactPointerEvent<HTMLSpanElement>, key: string) => void;
}) {
  return (
    <span
      role="separator"
      aria-label={`Resize ${columnKey} column`}
      title="ลากเพื่อปรับความกว้างคอลัมน์"
      onPointerDown={event => onStart(event, columnKey)}
      className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-blue-400/60"
    />
  );
}

function DepartmentChecklistTab({
  department,
  items,
  metadata,
  entries,
  canEdit,
  isMasterAdmin,
  loading,
  saving,
  layoutSaving,
  columnWidths,
  uploadingItemId,
  savedAt,
  onMetaChange,
  onEntryChange,
  onSave,
  onColumnResize,
  onAttachmentUpload,
  onAttachmentRemove,
  year,
}: {
  department: Department | null;
  items: InternalAuditChecklistItem[];
  metadata: AuditMeta;
  entries: Record<string, AuditEntry>;
  canEdit: boolean;
  isMasterAdmin: boolean;
  loading: boolean;
  saving: boolean;
  layoutSaving: boolean;
  columnWidths: Record<string, number>;
  uploadingItemId: string | null;
  savedAt?: string;
  onMetaChange: (patch: Partial<AuditMeta>) => void;
  onEntryChange: (itemId: string, patch: Partial<AuditEntry>) => void;
  onSave: () => void;
  onColumnResize: (event: ReactPointerEvent<HTMLSpanElement>, key: string) => void;
  onAttachmentUpload: (itemId: string, files: FileList | null) => void;
  onAttachmentRemove: (itemId: string, attachmentIndex: number) => void;
  year?: number;
}) {
  if (!department) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-sm text-slate-400">
        ไม่พบข้อมูลแผนกที่เลือก
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด Department Audit Checklist...
        </CardContent>
      </Card>
    );
  }

  const passed = items.filter(item => (entries[item.id]?.result ?? "/") === "C").length;
  const car = items.filter(item => (entries[item.id]?.result ?? "/") === "CAR").length;
  const obs = items.filter(item => (entries[item.id]?.result ?? "/") === "OBS").length;
  const tableMinWidth = Object.keys(DEPARTMENT_COLUMN_DEFAULTS)
    .reduce((total, key) => total + (columnWidths[key] ?? DEPARTMENT_COLUMN_DEFAULTS[key]), 0);

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
              <ClipboardCheck className="h-4 w-4 text-cyan-600" />
              Internal Audit Checklist — {department.code}: {department.name}
              <Badge className="border border-cyan-200 bg-cyan-50 text-[10px] text-cyan-700">{items.length} clauses</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <Badge className="border border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">QMS edit access</Badge>
              ) : (
                <Badge className="gap-1 border border-slate-200 bg-slate-50 text-[10px] text-slate-500">
                  <LockKeyhole className="h-3 w-3" /> Read only
                </Badge>
              )}
              {savedAt && <span className="text-[10px] text-slate-400">บันทึกล่าสุด {new Date(savedAt).toLocaleString("th-TH")}</span>}
              <Button size="sm" onClick={onSave} disabled={!canEdit || saving || uploadingItemId !== null} className="h-8 gap-1.5 bg-cyan-600 text-xs text-white hover:bg-cyan-700">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {!canEdit && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <span>หน้านี้เปิดดูได้สำหรับทุก Role แต่การกรอกผลการตรวจ แนบเอกสาร และกดบันทึก สงวนสิทธิ์เฉพาะ Role <strong>QMS</strong> เท่านั้น</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs">Auditor / ผู้ตรวจประเมิน</Label>
              <Input disabled={!canEdit} value={metadata.auditor} onChange={event => onMetaChange({ auditor: event.target.value })} className="mt-1 h-9 text-sm" placeholder="ชื่อผู้ตรวจประเมิน" />
            </div>
            <div>
              <Label className="text-xs">Audit Date / วันที่ตรวจ</Label>
              <Input disabled={!canEdit} type="date" value={metadata.auditDate} onChange={event => onMetaChange({ auditDate: event.target.value })} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Auditee / ผู้ถูกตรวจ</Label>
              <Input disabled={!canEdit} value={metadata.auditee} onChange={event => onMetaChange({ auditee: event.target.value })} className="mt-1 h-9 text-sm" placeholder="ชื่อหรืออีเมลผู้ถูกตรวจ" />
            </div>
            <div>
              <Label className="text-xs">Status / สถานะการตรวจ</Label>
              <Select disabled={!canEdit} value={metadata.status} onValueChange={status => onMetaChange({ status })}>
                <SelectTrigger className="mt-1 h-9 w-full text-sm"><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ตรวจประเมินภายในประจำปี">ตรวจประเมินภายในประจำปี</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-600">SUMMARY REPORT</span>
            <span className="rounded border border-green-200 bg-green-50 px-2 py-1 font-semibold text-green-700">Passed (C): {passed}</span>
            <span className="rounded border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">CAR: {car}</span>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">OBS: {obs}</span>
            <span className="ml-auto text-slate-400">Year {year ?? "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Department Audit Checklist</CardTitle>
            <span className="text-[10px] text-slate-400">
              {layoutSaving ? "กำลังบันทึก layout..." : isMasterAdmin ? "ลากเส้นแบ่งคอลัมน์เพื่อปรับ layout กลาง" : "แนบหลักฐานแยกตามข้อกำหนด"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-slate-400">ยังไม่มีข้อกำหนดที่กำหนดให้แผนกนี้ใน Checklist Matrix</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-xs" style={{ minWidth: `${tableMinWidth}px` }}>
                <colgroup>
                  {Object.keys(DEPARTMENT_COLUMN_DEFAULTS).map(key => (
                    <col key={key} style={{ width: columnWidths[key] ?? DEPARTMENT_COLUMN_DEFAULTS[key] }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th style={{ width: columnWidths.clause ?? DEPARTMENT_COLUMN_DEFAULTS.clause }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                      Clause / ข้อกำหนด
                      {isMasterAdmin && <ResizeHandle columnKey="clause" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.checklist ?? DEPARTMENT_COLUMN_DEFAULTS.checklist }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                      Checklist Items / รายการตรวจสอบ
                      {isMasterAdmin && <ResizeHandle columnKey="checklist" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.finding ?? DEPARTMENT_COLUMN_DEFAULTS.finding }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                      Comments / Audit Finding
                      {isMasterAdmin && <ResizeHandle columnKey="finding" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.result ?? DEPARTMENT_COLUMN_DEFAULTS.result }} className="relative border-r border-slate-200 px-2 py-2 text-center font-semibold">
                      Result
                      {isMasterAdmin && <ResizeHandle columnKey="result" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.evidence ?? DEPARTMENT_COLUMN_DEFAULTS.evidence }} className="relative border-r border-slate-200 px-1 py-2 text-center font-semibold">
                      <span className="line-clamp-2">Evidence / เอกสารแนบ</span>
                      {isMasterAdmin && <ResizeHandle columnKey="evidence" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.guide ?? DEPARTMENT_COLUMN_DEFAULTS.guide }} className="relative border-r border-slate-200 px-3 py-2 text-left font-semibold">
                      Auditor Guide & Sampling Focus
                      {isMasterAdmin && <ResizeHandle columnKey="guide" onStart={onColumnResize} />}
                    </th>
                    <th style={{ width: columnWidths.remark ?? DEPARTMENT_COLUMN_DEFAULTS.remark }} className="relative px-3 py-2 text-left font-semibold">
                      Remark / หมายเหตุ
                      {isMasterAdmin && <ResizeHandle columnKey="remark" onStart={onColumnResize} />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const entry = entries[item.id] ?? EMPTY_AUDIT_ENTRY;
                    return (
                      <tr key={item.id} className="border-b border-slate-100 align-top odd:bg-white even:bg-slate-50/50">
                        <td className="border-r border-slate-100 px-3 py-3 font-semibold text-slate-800">{item.clauseNo}</td>
                        <td className="border-r border-slate-100 px-3 py-3 text-slate-700">
                          <p className="font-medium">{item.clauseDescriptionEn}</p>
                          {item.clauseDescriptionTh && <p className="mt-1 text-[11px] leading-tight text-slate-500">({item.clauseDescriptionTh})</p>}
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2">
                          <Textarea disabled={!canEdit} value={entry.finding} onChange={event => onEntryChange(item.id, { finding: event.target.value })} className="min-h-20 resize-y bg-white text-xs" placeholder="บันทึกผลการตรวจ / หลักฐาน / ข้อค้นพบ" />
                        </td>
                        <td className="border-r border-slate-100 px-2 py-3">
                          <div className="flex flex-wrap justify-center gap-1">
                            {(["/", "C", "CAR", "OBS"] as AuditResult[]).map(result => (
                              <button
                                key={result}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => onEntryChange(item.id, { result })}
                                className={cn(
                                  "rounded border px-2 py-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                  entry.result === result
                                    ? result === "C" ? "border-green-300 bg-green-100 text-green-700"
                                      : result === "CAR" ? "border-red-300 bg-red-100 text-red-700"
                                        : result === "OBS" ? "border-amber-300 bg-amber-100 text-amber-700"
                                          : "border-slate-300 bg-slate-200 text-slate-700"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600",
                                )}
                              >
                                {result}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="border-r border-slate-100 px-1 py-2 align-top">
                          <div className="flex flex-col items-center gap-1">
                            {(entry.attachments ?? []).length > 0 ? (
                              <details className="relative">
                                <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-1 text-[10px] font-semibold text-blue-700" title="คลิกเพื่อดูไฟล์แนบ">
                                  <Paperclip className="h-3 w-3" />{(entry.attachments ?? []).length}
                                </summary>
                                <div className="absolute right-0 z-20 mt-1 w-64 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-lg">
                                  {(entry.attachments ?? []).map((attachment, attachmentIndex) => (
                                    <div key={`${attachment.url}-${attachmentIndex}`} className="flex min-w-0 items-center gap-1.5 rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" title={attachment.name} className="min-w-0 flex-1 truncate text-[10px] text-blue-700 hover:underline">
                                        {attachment.name}
                                      </a>
                                      {canEdit && (
                                        <button type="button" onClick={() => onAttachmentRemove(item.id, attachmentIndex)} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600" aria-label={`Remove ${attachment.name}`}>
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : <span className="text-[10px] text-slate-300">0</span>}
                            <input
                              id={`department-attachment-${item.id}`}
                              type="file"
                              multiple
                              className="sr-only"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
                              disabled={!canEdit || uploadingItemId === item.id}
                              onChange={event => {
                                onAttachmentUpload(item.id, event.target.files);
                                event.currentTarget.value = "";
                              }}
                            />
                            <label
                              htmlFor={`department-attachment-${item.id}`}
                              className={cn(
                                "inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed px-1.5 py-1 text-[10px] font-medium transition-colors",
                                canEdit && uploadingItemId !== item.id
                                  ? "border-blue-200 text-blue-600 hover:bg-blue-50"
                                  : "cursor-not-allowed border-slate-200 text-slate-300",
                              )}
                            >
                              <span title={uploadingItemId === item.id ? "กำลังแนบไฟล์" : "แนบไฟล์"}>
                                {uploadingItemId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3 text-slate-500">
                          <p className="font-medium text-blue-700">{item.cmgPmReference || "—"}</p>
                          <p className="mt-1 text-[11px] leading-tight">สุ่มตรวจหลักฐานและการปฏิบัติงานตามข้อกำหนดและระเบียบปฏิบัติที่เกี่ยวข้อง</p>
                        </td>
                        <td className="px-2 py-2">
                          <Input disabled={!canEdit} value={entry.remark} onChange={event => onEntryChange(item.id, { remark: event.target.value })} className="h-9 bg-white text-xs" placeholder="หมายเหตุ" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
