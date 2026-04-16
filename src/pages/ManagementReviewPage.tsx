import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getManagementReviews, createManagementReview, updateManagementReview, deleteManagementReview, generateMeetingId } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import type { ManagementReview, AuditAttachment } from "@/lib/types";
import { Users, Plus, Trash2, Pencil, Loader2, Printer, Calendar, CheckCircle, Clock, RefreshCw, Upload, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ManagementReviewPage() {
  const { selectedYear } = useYearCycle();
  const [reviews,  setReviews]  = useState<ManagementReview[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [editing,  setEditing]  = useState<ManagementReview | null>(null);
  const [deleting, setDeleting] = useState<ManagementReview | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({ title: "", meetingDate: "", agendaUrl: "", minutesUrl: "", notes: "", status: "SCHEDULED" });
  const pendingMeetingIdRef = useRef<string>("");
  const mrFileInputRef      = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<AuditAttachment[]>([]);
  const [mrUploading,        setMrUploading]        = useState(false);
  const [mrUploadPct,        setMrUploadPct]        = useState(0);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try { setReviews(await getManagementReviews(selectedYear.id)); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleMrFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setMrUploading(true); setMrUploadPct(0);
    try {
      const path = `managementReviews/${pendingMeetingIdRef.current}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          snap => setMrUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject, resolve);
      });
      const url = await getDownloadURL(task.snapshot.ref);
      setPendingAttachments(prev => [...prev, { name: file.name, url, size: file.size, uploadedAt: new Date().toISOString() }]);
    } finally {
      setMrUploading(false); setMrUploadPct(0);
      if (mrFileInputRef.current) mrFileInputRef.current.value = "";
    }
  }

  function openNew() {
    pendingMeetingIdRef.current = generateMeetingId();
    setPendingAttachments([]);
    setForm({ title:"", meetingDate:"", agendaUrl:"", minutesUrl:"", notes:"", status:"SCHEDULED" });
    setShowNew(true);
  }
  function openEdit(r: ManagementReview) {
    pendingMeetingIdRef.current = r.id;
    setPendingAttachments(r.attachments ?? []);
    setForm({ title: r.title, meetingDate: r.meetingDate.substring(0,10), agendaUrl: r.agendaUrl??"", minutesUrl: r.minutesUrl??"", notes: r.notes??"", status: r.status });
    setEditing(r);
  }

  async function handleSave() {
    if (!form.title || !form.meetingDate) return;
    setSaving(true);
    try {
      const attachments = pendingAttachments.length > 0 ? pendingAttachments : undefined;
      if (editing) {
        await updateManagementReview(editing.id, { title: form.title, meetingDate: form.meetingDate, agendaUrl: form.agendaUrl||null, minutesUrl: form.minutesUrl||null, notes: form.notes||null, status: form.status, attachments });
        setEditing(null);
      } else {
        await createManagementReview({ title: form.title, meetingDate: form.meetingDate, yearCycleId: selectedYear!.id, agendaUrl: form.agendaUrl||null, minutesUrl: form.minutesUrl||null, notes: form.notes||null, status: form.status, attachments }, pendingMeetingIdRef.current);
        setShowNew(false);
      }
      setPendingAttachments([]);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try { await deleteManagementReview(deleting.id); setDeleting(null); fetchData(); }
    finally { setSaving(false); }
  }

  return (
    <AppLayout title="Management Review">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100"><Users className="h-5 w-5 text-purple-600" /></div>
          <div><p className="font-semibold text-slate-800">Management Review</p><p className="text-xs text-slate-500">{reviews.length} meetings · {selectedYear?.year}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          <Button size="sm" onClick={openNew} className="h-9"><Plus className="h-4 w-4 mr-1.5" />Log Meeting</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400"><Users className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">No management reviews for {selectedYear?.year}</p></div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                    <Calendar className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                      <Badge className={cn("text-[10px] border", r.status === "COMPLETED" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200")}>
                        {r.status === "COMPLETED" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(r.meetingDate), "EEEE d MMMM yyyy")}</p>
                    {r.notes && <p className="text-xs text-slate-600 mt-2 bg-slate-50 px-2 py-1.5 rounded border border-slate-100">{r.notes}</p>}
                    {(r.agendaUrl || r.minutesUrl || (r.attachments && r.attachments.length > 0)) && (
                      <div className="flex flex-wrap gap-3 mt-2 items-center">
                        {r.agendaUrl  && <a href={r.agendaUrl}  target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FileText className="h-3 w-3" />Agenda</a>}
                        {r.minutesUrl && <a href={r.minutesUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FileText className="h-3 w-3" />Minutes</a>}
                        {r.attachments?.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 max-w-[200px] truncate">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{att.name}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={showNew || !!editing} onOpenChange={v => { if (!v) { setShowNew(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>{editing ? "Edit Meeting" : "Log New Meeting"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 overflow-y-auto max-h-[72vh] pr-1">

            <div><Label className="text-xs">Meeting Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="mt-1 h-9 text-sm" placeholder="ระบุชื่อการประชุม..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Meeting Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.meetingDate} onChange={e=>setForm(f=>({...f,meetingDate:e.target.value}))} className="mt-1 h-9 text-sm" />
              </div>
              <div><Label className="text-xs">Status</Label>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" type="button" variant={form.status === "SCHEDULED" ? "default" : "outline"} onClick={() => setForm(f=>({...f,status:"SCHEDULED"}))} className="flex-1 h-9 text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1" />Scheduled
                  </Button>
                  <Button size="sm" type="button" variant={form.status === "COMPLETED" ? "default" : "outline"} onClick={() => setForm(f=>({...f,status:"COMPLETED"}))} className="flex-1 h-9 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Completed
                  </Button>
                </div>
              </div>
            </div>

            <div><Label className="text-xs">Agenda URL</Label>
              <Input value={form.agendaUrl} onChange={e=>setForm(f=>({...f,agendaUrl:e.target.value}))} placeholder="https://..." className="mt-1 h-9 text-sm" />
            </div>
            <div><Label className="text-xs">Minutes URL</Label>
              <Input value={form.minutesUrl} onChange={e=>setForm(f=>({...f,minutesUrl:e.target.value}))} placeholder="https://..." className="mt-1 h-9 text-sm" />
            </div>

            <div><Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} className="mt-1 text-sm resize-none" placeholder="บันทึกข้อมูลเพิ่มเติมของการประชุม..." />
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
                        onClick={() => setPendingAttachments(prev => prev.filter((_,i) => i !== idx))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={mrFileInputRef} type="file" className="hidden" onChange={handleMrFileUpload} />
              <Button type="button" variant="outline" size="sm"
                onClick={() => mrFileInputRef.current?.click()}
                disabled={mrUploading}
                className="w-full h-9 text-xs gap-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600">
                {mrUploading
                  ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading... {mrUploadPct}%</>)
                  : (<><Upload className="h-3.5 w-3.5" />Upload File (max 20 MB)</>)}
              </Button>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.meetingDate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editing ? "Save Changes" : "Log Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete Meeting</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Delete <span className="font-semibold">"{deleting?.title}"</span>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
