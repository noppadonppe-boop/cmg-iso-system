import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/lib/db";
import { listAllUsers } from "@/lib/authService";
import type { Department, UserProfile } from "@/lib/types";
import { Building2, Loader2, Users, RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DepartmentsPage() {
  const [depts,      setDepts]      = useState<Department[]>([]);
  const [users,      setUsers]      = useState<UserProfile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Department | null>(null);
  const [form,       setForm]       = useState({ name: "", code: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u] = await Promise.all([getDepartments(), listAllUsers()]);
      setDepts(d); setUsers(u);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openAdd() {
    setForm({ name: "", code: "" });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(dept: Department) {
    setForm({ name: dept.name, code: dept.code });
    setEditing(dept);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, { name: form.name.trim(), code: form.code.trim().toUpperCase() });
      } else {
        await createDepartment({ name: form.name.trim(), code: form.code.trim().toUpperCase() });
      }
      setShowForm(false);
      fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setSaving(true);
    try { await deleteDepartment(deletingId); setDeletingId(null); fetchData(); }
    finally { setSaving(false); }
  }

  return (
    <AppLayout title="Departments">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{depts.length} department{depts.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={openAdd}>
            <Plus className="h-4 w-4" />Add Department
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : depts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Building2 className="h-10 w-10 mb-3 text-slate-200" />
          <p className="text-sm">No departments yet</p>
          <Button size="sm" className="mt-3 gap-1" onClick={openAdd}><Plus className="h-4 w-4" />Add First Department</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(dept => {
            const members = users.filter(u => u.departmentId === dept.id);
            return (
              <Card key={dept.id} className="border border-slate-200 hover:border-slate-300 transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{dept.name}</p>
                        <p className="text-xs font-mono text-blue-600 font-bold mt-0.5">{dept.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(dept)}
                        className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingId(dept.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                    </div>
                    {members.slice(0, 3).map(u => (
                      <div key={u.uid} className="flex items-center gap-2 text-xs text-slate-600 pl-5">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                        <span className="truncate flex-1">{u.firstName} {u.lastName}</span>
                        <span className="text-slate-400 text-[10px] shrink-0">{u.roles?.[0] ?? ""}</span>
                      </div>
                    ))}
                    {members.length > 3 && (
                      <p className="text-xs text-slate-400 pl-5">+{members.length - 3} more</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={v => setShowForm(v)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing
                ? <><Pencil className="h-5 w-5 text-blue-600" />Edit Department</>
                : <><Plus className="h-5 w-5 text-blue-600" />Add Department</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Department Name <span className="text-red-500">*</span></Label>
              <Input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 h-9 text-sm" placeholder="e.g. Quality Control" />
            </div>
            <div>
              <Label className="text-xs">Code <span className="text-red-500">*</span></Label>
              <Input value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="mt-1 h-9 text-sm font-mono" placeholder="e.g. QC" maxLength={10} />
              <p className="text-[11px] text-slate-400 mt-1">Short code, uppercase (max 10 chars)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.code.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editing ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Department</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600 space-y-2">
            <p>Delete <span className="font-semibold">"{depts.find(d => d.id === deletingId)?.name}"</span>?</p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              ⚠️ Members assigned to this department will not be deleted, but their department link will become invalid.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
