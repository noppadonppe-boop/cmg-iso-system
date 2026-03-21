import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getManagementReviews, createManagementReview, updateManagementReview, deleteManagementReview } from "@/lib/db";
import type { ManagementReview } from "@/lib/types";
import { Users, Plus, Trash2, Pencil, Loader2, Printer, Calendar, CheckCircle, Clock } from "lucide-react";
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

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try { setReviews(await getManagementReviews(selectedYear.id)); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() { setForm({ title:"", meetingDate:"", agendaUrl:"", minutesUrl:"", notes:"", status:"SCHEDULED" }); setShowNew(true); }
  function openEdit(r: ManagementReview) {
    setForm({ title: r.title, meetingDate: r.meetingDate.substring(0,10), agendaUrl: r.agendaUrl??"", minutesUrl: r.minutesUrl??"", notes: r.notes??"", status: r.status });
    setEditing(r);
  }

  async function handleSave() {
    if (!form.title || !form.meetingDate) return;
    setSaving(true);
    try {
      if (editing) {
        await updateManagementReview(editing.id, { title: form.title, meetingDate: form.meetingDate, agendaUrl: form.agendaUrl||null, minutesUrl: form.minutesUrl||null, notes: form.notes||null, status: form.status });
        setEditing(null);
      } else {
        await createManagementReview({ title: form.title, meetingDate: form.meetingDate, yearCycleId: selectedYear!.id, agendaUrl: form.agendaUrl||null, minutesUrl: form.minutesUrl||null, notes: form.notes||null, status: "SCHEDULED" });
        setShowNew(false);
      }
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
                    <div className="flex gap-3 mt-2">
                      {r.agendaUrl  && <a href={r.agendaUrl}  target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">📄 Agenda</a>}
                      {r.minutesUrl && <a href={r.minutesUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">📝 Minutes</a>}
                    </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Meeting" : "Log New Meeting"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Meeting Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Meeting Date *</Label><Input type="date" value={form.meetingDate} onChange={e=>setForm(f=>({...f,meetingDate:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Agenda URL</Label><Input value={form.agendaUrl} onChange={e=>setForm(f=>({...f,agendaUrl:e.target.value}))} placeholder="https://..." className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Minutes URL</Label><Input value={form.minutesUrl} onChange={e=>setForm(f=>({...f,minutesUrl:e.target.value}))} placeholder="https://..." className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} className="mt-1 text-sm" /></div>
            {editing && (
              <div className="flex gap-2">
                <Button size="sm" variant={form.status === "SCHEDULED" ? "default" : "outline"} onClick={() => setForm(f=>({...f,status:"SCHEDULED"}))}>Scheduled</Button>
                <Button size="sm" variant={form.status === "COMPLETED" ? "default" : "outline"} onClick={() => setForm(f=>({...f,status:"COMPLETED"}))}>Mark Completed</Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.meetingDate}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{editing ? "Save" : "Log Meeting"}</Button>
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
