import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, getDepartments, createAudit, updateAudit } from "@/lib/db";
import { listAllUsers } from "@/lib/authService";
import type { AuditPlan, Department, UserProfile } from "@/lib/types";
import { Printer, Loader2, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const NONE = "__none__";
const ISO_LABELS: Record<string, string> = {
  ISO9001:  "ISO 9001 (Quality)",
  ISO45001: "ISO 45001 (Safety)",
  BOTH:     "Both (ISO 9001 + ISO 45001)",
};
const STATUS_LABELS_MAP: Record<string, string> = {
  PLANNED: "Planned", IN_PROGRESS: "In Progress", COMPLETED: "Completed", CLOSED: "Closed",
};
const EMPTY_FORM = {
  auditType: "INTERNAL", isoStandard: "ISO9001", roundNumber: 1,
  scheduledDate: "", endDate: "", status: "PLANNED",
  auditeeId: NONE, auditorId: NONE, scope: "", remarks: "",
};

const STATUS_COLOR: Record<string, string> = {
  PLANNED:    "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS:"bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED:  "bg-green-100 text-green-700 border-green-200",
  CLOSED:     "bg-slate-100 text-slate-500 border-slate-200",
};

export default function MasterPlanPage() {
  const { selectedYear } = useYearCycle();
  const [audits, setAudits]   = useState<AuditPlan[]>([]);
  const [depts,  setDepts]    = useState<Department[]>([]);
  const [users,  setUsers]    = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<AuditPlan | null>(null);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [saving,      setSaving]      = useState(false);

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

  function openAdd(scheduledDate?: string) {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, scheduledDate: scheduledDate ?? "" });
    setDialogOpen(true);
  }

  function openEdit(audit: AuditPlan) {
    setEditTarget(audit);
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
      if (editTarget) await updateAudit(editTarget.id, payload);
      else await createAudit({ ...payload, yearCycleId: selectedYear.id, cpars: [] });
      setDialogOpen(false);
      fetchData();
    } finally { setSaving(false); }
  }

  const isFormValid = form.scheduledDate && form.auditeeId && form.auditeeId !== NONE;

  const filtered = audits.filter(a => filterType === "ALL" || a.auditType === filterType);

  // Group by dept
  const byDept = depts.map(dept => ({
    dept,
    rounds: filtered.filter(a => a.auditee?.department?.id === dept.id || a.departmentId === dept.id),
  })).filter(d => d.rounds.length > 0);

  // Group audits by month
  const auditsByMonth = MONTHS.map((_, i) =>
    filtered.filter(a => new Date(a.scheduledDate).getMonth() === i)
  );

  return (
    <AppLayout title="Master Audit Plan">
      <div className="no-print flex flex-wrap gap-3 mb-5">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9"><Loader2 className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5" />Print Plan</Button>
        <div className="ml-auto flex gap-2 text-xs items-center">
          {Object.entries(STATUS_COLOR).map(([k,v]) => (
            <span key={k} className={cn("px-2 py-0.5 rounded border text-[10px] font-medium", v)}>{k}</span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Audit Master Plan — {selectedYear?.year} ({filtered.length} audits)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-32">Department</th>
                  {MONTHS.map(m => (
                    <th key={m} className="px-2 py-2.5 font-semibold text-slate-600 text-center min-w-[64px]">{m}</th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-slate-600 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {byDept.map(({ dept, rounds }) => (
                  <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">
                      <div>{dept.code}</div>
                      <div className="text-[10px] text-slate-400">{dept.name}</div>
                    </td>
                    {MONTHS.map((_, mi) => {
                      const monthAudits = rounds.filter(a => new Date(a.scheduledDate).getMonth() === mi);
                      return (
                        <td
                          key={mi}
                          className="px-1 py-1.5 text-center group/cell"
                          title="Double-click to add audit plan"
                          onDoubleClick={() => {
                            const d = new Date(selectedYear!.year, mi, 15);
                            openAdd(d.toISOString().slice(0, 10));
                          }}
                        >
                          {monthAudits.map(a => (
                            <div
                              key={a.id}
                              title={`${a.auditType} R${a.roundNumber} — ${a.status} (double-click to edit)`}
                              onDoubleClick={e => { e.stopPropagation(); openEdit(a); }}
                              className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border mb-0.5 cursor-pointer select-none hover:ring-1 hover:ring-blue-400", STATUS_COLOR[a.status] ?? "bg-slate-100 text-slate-600")}>
                              {a.auditType === "INTERNAL" ? "INT" : "EXT"} R{a.roundNumber}
                            </div>
                          ))}
                          {monthAudits.length === 0 && (
                            <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-slate-300 text-[10px] select-none">+</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{rounds.length}</td>
                  </tr>
                ))}
                {/* Monthly totals row */}
                <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                  <td className="px-4 py-2 text-slate-600 text-xs">Monthly Total</td>
                  {auditsByMonth.map((monthAudits, mi) => (
                    <td key={mi} className="px-1 py-2 text-center text-slate-700 text-xs">
                      {monthAudits.length > 0 ? monthAudits.length : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-slate-700">{filtered.length}</td>
                </tr>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No audit plans for {selectedYear?.year}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent audits list */}
      {!loading && filtered.length > 0 && (
        <Card className="border border-slate-200 mt-5">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Audit Schedule Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filtered.slice().sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map(audit => (
                <div key={audit.id} title="Double-click to edit" onDoubleClick={() => openEdit(audit)} className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-slate-50 cursor-pointer select-none">
                  <div className="w-24 text-xs text-slate-500 font-mono shrink-0">
                    {format(new Date(audit.scheduledDate), "d MMM yyyy")}
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", audit.auditType === "INTERNAL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                    {audit.auditType} R{audit.roundNumber}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800">{audit.auditee?.name}</span>
                    <span className="text-slate-400 ml-2 text-xs">{audit.auditee?.department?.code}</span>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", STATUS_COLOR[audit.status])}>{audit.status}</Badge>
                  {audit.cpars.length > 0 && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                      {audit.cpars.length} CPAR{audit.cpars.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* ── Add / Edit Audit Plan Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Audit Plan" : "Add Audit Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 overflow-y-auto max-h-[72vh] pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Audit Type</Label>
                <Select value={form.auditType} onValueChange={v => setForm(f => ({ ...f, auditType: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INTERNAL">Internal</SelectItem><SelectItem value="EXTERNAL">External</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Round No.</Label>
                <Input type="number" min={1} className="h-9 text-sm" value={form.roundNumber} onChange={e => setForm(f => ({ ...f, roundNumber: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ISO Standard <span className="text-red-500">*</span></Label>
              <Select value={form.isoStandard} onValueChange={v => setForm(f => ({ ...f, isoStandard: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ISO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scheduled Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="h-9 text-sm" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input type="date" className="h-9 text-sm" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABELS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auditee <span className="text-red-500">*</span></Label>
              <Select value={form.auditeeId} onValueChange={v => setForm(f => ({ ...f, auditeeId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select auditee..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => {
                    const d = depts.find(d => d.id === u.departmentId);
                    return (
                      <SelectItem key={u.uid} value={u.uid}>
                        <span>{u.firstName} {u.lastName}</span>
                        {d && <span className="text-slate-400 ml-1 text-[11px]">({d.code})</span>}
                        {u.roles?.length > 0 && <span className="text-blue-500 ml-1 text-[11px]">[{u.roles.join(", ")}]</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Auditor</Label>
              <Select value={form.auditorId} onValueChange={v => setForm(f => ({ ...f, auditorId: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select auditor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— ไม่ระบุ —</SelectItem>
                  {users.map(u => {
                    const d = depts.find(d => d.id === u.departmentId);
                    return (
                      <SelectItem key={u.uid} value={u.uid}>
                        <span>{u.firstName} {u.lastName}</span>
                        {d && <span className="text-slate-400 ml-1 text-[11px]">({d.code})</span>}
                        {u.roles?.length > 0 && <span className="text-blue-500 ml-1 text-[11px]">[{u.roles.join(", ")}]</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Audit Scope / ขอบเขต</Label>
              <Textarea placeholder="ระบุขอบเขต process / clause ที่ตรวจ เช่น 4.1, 6.1, 8.1..." className="text-sm min-h-[64px] resize-none" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks / หมายเหตุ</Label>
              <Textarea placeholder="บันทึกข้อมูลเพิ่มเติม..." className="text-sm min-h-[56px] resize-none" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
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
    </AppLayout>
  );
}
