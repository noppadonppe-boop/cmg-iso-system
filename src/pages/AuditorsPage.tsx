import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAuditors, createAuditor, updateAuditor, deleteAuditor } from "@/lib/db";
import { listAllUsers } from "@/lib/authService";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { AuditorProfile, UserProfile, AuditAttachment } from "@/lib/types";
import { ShieldCheck, Loader2, RefreshCw, CheckCircle, XCircle, Award, Plus, Trash2, Pencil, Upload, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditorsPage() {
  const [auditors,    setAuditors]    = useState<AuditorProfile[]>([]);
  const [allUsers,    setAllUsers]    = useState<UserProfile[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState<AuditorProfile | null>(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [addUserId,   setAddUserId]   = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName,  setAddLastName]  = useState("");
  const [editing,     setEditing]     = useState<AuditorProfile | null>(null);
  const [editForm,    setEditForm]    = useState({
    iso9001ExamPassed: false, iso45001ExamPassed: false,
    iso9001Certs: [] as AuditAttachment[],
    iso45001Certs: [] as AuditAttachment[],
  });
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [activateErr, setActivateErr] = useState<string | null>(null);
  const cert9001Ref    = useRef<HTMLInputElement>(null);
  const cert45001Ref   = useRef<HTMLInputElement>(null);
  const [cert9001Up,   setCert9001Up]   = useState(false);
  const [cert9001Pct,  setCert9001Pct]  = useState(0);
  const [cert45001Up,  setCert45001Up]  = useState(false);
  const [cert45001Pct, setCert45001Pct] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, u] = await Promise.all([getAuditors(), listAllUsers()]);
      setAuditors(a); setAllUsers(u);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableUsers = allUsers.filter(u => !auditors.some(a => a.userId === u.uid));

  function resetAddForm() {
    setAddUserId("");
    setAddFirstName("");
    setAddLastName("");
  }

  async function handleAddAuditor() {
    const firstName = addFirstName.trim();
    const lastName = addLastName.trim();
    if (!addUserId && (!firstName || !lastName)) return;
    setSaving(true);
    try {
      const u = addUserId ? allUsers.find(x => x.uid === addUserId) : undefined;
      if (addUserId && !u) return;
      await createAuditor({
        userId: u?.uid ?? "",
        user: u
          ? { id: u.uid, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email, role: u.roles?.[0] ?? "", departmentId: u.departmentId ?? "" }
          : { id: "", name: `${firstName} ${lastName}`, email: "", role: "", departmentId: "" },
        isActiveAuditor: false,
        iso9001ExamPassed: false, iso45001ExamPassed: false,
        iso9001CertUrl: null, iso45001CertUrl: null,
      });
      setShowAdd(false); resetAddForm(); fetchData();
    } finally { setSaving(false); }
  }

  function formatBytes(b: number) {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }

  function openEdit(a: AuditorProfile) {
    setSelected(null);
    const to9001 = a.iso9001Certs?.length
      ? a.iso9001Certs
      : a.iso9001CertUrl ? [{ name: "ISO 9001 Certificate", url: a.iso9001CertUrl, size: 0, uploadedAt: "" }] : [];
    const to45001 = a.iso45001Certs?.length
      ? a.iso45001Certs
      : a.iso45001CertUrl ? [{ name: "ISO 45001 Certificate", url: a.iso45001CertUrl, size: 0, uploadedAt: "" }] : [];
    setEditForm({ iso9001ExamPassed: a.iso9001ExamPassed, iso45001ExamPassed: a.iso45001ExamPassed, iso9001Certs: to9001, iso45001Certs: to45001 });
    setEditing(a);
  }

  async function handleEditSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateAuditor(editing.id, {
        iso9001ExamPassed:  editForm.iso9001ExamPassed,
        iso45001ExamPassed: editForm.iso45001ExamPassed,
        iso9001Certs:  editForm.iso9001Certs.length  ? editForm.iso9001Certs  : undefined,
        iso45001Certs: editForm.iso45001Certs.length ? editForm.iso45001Certs : undefined,
        iso9001CertUrl:  editForm.iso9001Certs[0]?.url  ?? null,
        iso45001CertUrl: editForm.iso45001Certs[0]?.url ?? null,
      });
      setEditing(null); fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setSaving(true);
    try { await deleteAuditor(deletingId); setDeletingId(null); fetchData(); }
    finally { setSaving(false); }
  }

  async function handleCertUpload(certType: "9001" | "45001", e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !editing) return;
    const file = e.target.files[0];
    const is9001 = certType === "9001";
    if (is9001) { setCert9001Up(true); setCert9001Pct(0); } else { setCert45001Up(true); setCert45001Pct(0); }
    try {
      const path = `auditorProfiles/${editing.id}/iso${certType}_${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          snap => {
            const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            if (is9001) setCert9001Pct(p);
            else setCert45001Pct(p);
          },
          reject, resolve);
      });
      const url = await getDownloadURL(task.snapshot.ref);
      const att: AuditAttachment = { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() };
      setEditForm(f => is9001
        ? { ...f, iso9001Certs:  [...f.iso9001Certs,  att] }
        : { ...f, iso45001Certs: [...f.iso45001Certs, att] });
    } finally {
      if (is9001) { setCert9001Up(false); setCert9001Pct(0); if (cert9001Ref.current) cert9001Ref.current.value = ""; }
      else         { setCert45001Up(false); setCert45001Pct(0); if (cert45001Ref.current) cert45001Ref.current.value = ""; }
    }
  }

  async function toggleActive(a: AuditorProfile) {
    setActivateErr(null);
    if (!a.isActiveAuditor) {
      const missing: string[] = [];
      if (!a.iso9001ExamPassed)  missing.push("ISO 9001 Exam");
      if (!a.iso45001ExamPassed) missing.push("ISO 45001 Exam");
      if (!a.iso9001CertUrl  && !(a.iso9001Certs?.length))  missing.push("ISO 9001 Certificate");
      if (!a.iso45001CertUrl && !(a.iso45001Certs?.length)) missing.push("ISO 45001 Certificate");
      if (missing.length) {
        setActivateErr(`ต้องดำเนินการก่อน Activate: ${missing.join(", ")}`);
        setTimeout(() => setActivateErr(null), 6000);
        return;
      }
    }
    setSaving(true);
    try { await updateAuditor(a.id, { isActiveAuditor: !a.isActiveAuditor }); fetchData(); }
    finally { setSaving(false); }
  }

  const active   = auditors.filter(a => a.isActiveAuditor).length;
  const inactive = auditors.filter(a => !a.isActiveAuditor).length;

  return (
    <AppLayout title="Auditor Management">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <CheckCircle className="h-4 w-4" />Active: {active}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <XCircle className="h-4 w-4" />Inactive: {inactive}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />Add Auditor
          </Button>
        </div>
      </div>

      {activateErr && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />{activateErr}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : auditors.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <ShieldCheck className="h-10 w-10 mb-3 text-slate-200" />
          <p className="text-sm">No auditor profiles yet</p>
          <Button size="sm" className="mt-3 gap-1" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Add First Auditor</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {auditors.map(a => {
            const qualifications = [
              { label: "9001 Exam", passed: a.iso9001ExamPassed },
              { label: "45001 Exam", passed: a.iso45001ExamPassed },
              { label: "9001 Cert", passed: !!a.iso9001CertUrl || (a.iso9001Certs?.length ?? 0) > 0 },
              { label: "45001 Cert", passed: !!a.iso45001CertUrl || (a.iso45001Certs?.length ?? 0) > 0 },
            ];
            const completed = qualifications.filter(item => item.passed).length;

            return (
              <Card key={a.id} className={cn(
                "group relative aspect-square overflow-hidden border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                a.isActiveAuditor ? "border-emerald-200/80" : "border-slate-200",
              )}>
                <div className={cn("h-1 w-full", a.isActiveAuditor ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-slate-300 to-slate-200")} />
                <CardContent className="flex h-[calc(100%-4px)] flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm",
                          a.isActiveAuditor ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-500",
                        )}>
                          {a.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <span className={cn(
                          "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white",
                          a.isActiveAuditor ? "bg-emerald-500" : "bg-slate-300",
                        )}>
                          <ShieldCheck className="h-3 w-3 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{a.user?.name ?? "—"}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{a.user?.email || "Manual entry"}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "shrink-0 gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-none",
                      a.isActiveAuditor
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", a.isActiveAuditor ? "bg-emerald-500" : "bg-slate-400")} />
                      {a.isActiveAuditor ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Qualification</span>
                      <span className={cn("text-xs font-bold", completed === 4 ? "text-emerald-600" : "text-slate-600")}>{completed}/4</span>
                    </div>
                    <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn("h-full rounded-full transition-all", completed === 4 ? "bg-emerald-500" : "bg-blue-500")}
                        style={{ width: `${completed * 25}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {qualifications.map(item => (
                        <div key={item.label} className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium",
                          item.passed ? "border-emerald-100 bg-white text-emerald-700" : "border-slate-100 bg-white/70 text-slate-400",
                        )}>
                          {item.passed
                            ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            : <XCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="outline" className="h-8 flex-1 rounded-lg px-2 text-[11px]" onClick={() => setSelected(a)}>
                      <Award className="mr-1.5 h-3.5 w-3.5" />Details
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => openEdit(a)} title="Edit auditor">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className={cn(
                      "h-8 flex-1 rounded-lg px-2 text-[11px] shadow-sm",
                      a.isActiveAuditor ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700",
                    )} onClick={() => toggleActive(a)} disabled={saving}>
                      {a.isActiveAuditor ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg px-2 text-slate-300 hover:bg-red-50 hover:text-red-500" onClick={() => setDeletingId(a.id)} title="Delete auditor">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />{selected?.user?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {([
                ["ISO 9001 Exam",  selected?.iso9001ExamPassed  ? "✅ Passed"   : "❌ Not passed"],
                ["ISO 45001 Exam", selected?.iso45001ExamPassed ? "✅ Passed"   : "❌ Not passed"],
                ["ISO 9001 Cert",  selected?.iso9001CertUrl     ? "✅ Uploaded" : "❌ Missing"],
                ["ISO 45001 Cert", selected?.iso45001CertUrl    ? "✅ Uploaded" : "❌ Missing"],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} className="bg-slate-50 rounded p-2.5 border border-slate-100">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">{l}</p>
                  <p className="text-slate-700 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {(() => {
              const certs9001 = selected?.iso9001Certs?.length ? selected.iso9001Certs : (selected?.iso9001CertUrl ? [{ name: "ISO 9001 Certificate", url: selected.iso9001CertUrl }] : []);
              const certs45001 = selected?.iso45001Certs?.length ? selected.iso45001Certs : (selected?.iso45001CertUrl ? [{ name: "ISO 45001 Certificate", url: selected.iso45001CertUrl }] : []);
              const all = [...certs9001.map(c => ({ ...c, tag: "9001" })), ...certs45001.map(c => ({ ...c, tag: "45001" }))];
              return all.length > 0 ? (
                <div className="space-y-1">
                  {all.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">{c.name}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => selected && openEdit(selected)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit Certs</Button>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Auditor Dialog ── */}
      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) resetAddForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" />Add Auditor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Select User <span className="font-normal text-slate-400">(optional)</span></Label>
              <Select value={addUserId} onValueChange={value => setAddUserId(value === "__manual__" ? "" : value)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select user to add as auditor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Enter name manually</SelectItem>
                  {availableUsers.length === 0
                    ? <SelectItem value="__none__" disabled>All users are already auditors</SelectItem>
                    : availableUsers.map(u => <SelectItem key={u.uid} value={u.uid}>{u.firstName} {u.lastName} — {u.email}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            {!addUserId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="auditor-first-name" className="text-xs">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="auditor-first-name"
                    value={addFirstName}
                    onChange={e => setAddFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="auditor-last-name" className="text-xs">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="auditor-last-name"
                    value={addLastName}
                    onChange={e => setAddLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">Exam status and certificates can be updated after adding.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetAddForm(); }}>Cancel</Button>
            <Button disabled={saving || (!addUserId && (!addFirstName.trim() || !addLastName.trim()))} onClick={handleAddAuditor}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}Add Auditor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit / Cert Upload Dialog ── */}
      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-blue-600" />Edit Auditor — {editing?.user?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto max-h-[70vh] pr-1">

            {/* Exam toggles */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exam Status</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {([{key:"iso9001ExamPassed",label:"ISO 9001 Exam"},{key:"iso45001ExamPassed",label:"ISO 45001 Exam"}] as const).map(item => (
                  <button key={item.key} type="button"
                    onClick={() => setEditForm(f => ({ ...f, [item.key]: !f[item.key] }))}
                    className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left",
                      editForm[item.key] ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300")}>
                    {editForm[item.key] ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ISO 9001 Certificate */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ISO 9001 Certificate</Label>
              {editForm.iso9001Certs.length > 0 && (
                <div className="space-y-1.5 mt-1.5">
                  {editForm.iso9001Certs.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 group">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <a href={cert.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 min-w-0 text-xs text-green-700 hover:underline truncate flex items-center gap-1">
                        {cert.name}<ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                      {cert.size > 0 && <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(cert.size)}</span>}
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, iso9001Certs: f.iso9001Certs.filter((_, i) => i !== idx) }))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={cert9001Ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleCertUpload("9001", e)} />
              <Button type="button" variant="outline" size="sm" disabled={cert9001Up || cert45001Up}
                onClick={() => cert9001Ref.current?.click()}
                className="w-full h-8 text-xs mt-1.5 gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
                {cert9001Up ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading... {cert9001Pct}%</>) : (<><Upload className="h-3.5 w-3.5" />Upload ISO 9001 Cert (max 20 MB)</>)}
              </Button>
            </div>

            {/* ISO 45001 Certificate */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ISO 45001 Certificate</Label>
              {editForm.iso45001Certs.length > 0 && (
                <div className="space-y-1.5 mt-1.5">
                  {editForm.iso45001Certs.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 group">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <a href={cert.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 min-w-0 text-xs text-green-700 hover:underline truncate flex items-center gap-1">
                        {cert.name}<ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                      {cert.size > 0 && <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(cert.size)}</span>}
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, iso45001Certs: f.iso45001Certs.filter((_, i) => i !== idx) }))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={cert45001Ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleCertUpload("45001", e)} />
              <Button type="button" variant="outline" size="sm" disabled={cert9001Up || cert45001Up}
                onClick={() => cert45001Ref.current?.click()}
                className="w-full h-8 text-xs mt-1.5 gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
                {cert45001Up ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading... {cert45001Pct}%</>) : (<><Upload className="h-3.5 w-3.5" />Upload ISO 45001 Cert (max 20 MB)</>)}
              </Button>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving || cert9001Up || cert45001Up}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Auditor</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Remove <span className="font-semibold">"{auditors.find(a => a.id === deletingId)?.user?.name}"</span> from the auditor list? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
