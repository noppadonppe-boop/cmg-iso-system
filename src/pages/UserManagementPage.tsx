import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listAllUsers, approveUser, rejectUser, updateUserByAdmin,
} from "@/lib/authService";
import { getDepartments } from "@/lib/db";
import { ROLES } from "@/lib/types";
import type { UserProfile, UserRole, Department } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp,
  UserCog, RefreshCw, Users, Clock, ShieldCheck, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompactStats } from "@/components/ui/compact-stats";

// ── Types & constants ─────────────────────────────────────────────────────────
type FilterType = "all" | "pending" | "approved" | "rejected";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700 border-green-200" },
  pending:  { label: "รออนุมัติ",   cls: "bg-amber-100 text-amber-700 border-amber-200"  },
  rejected: { label: "ปฏิเสธ",      cls: "bg-red-100   text-red-700   border-red-200"    },
};

// ── Department single-select ─────────────────────────────────────────────────
function DepartmentSelect({ value, departments, onChange }: {
  value: string;
  departments: Department[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = departments.find(d => d.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="truncate">
          {selected ? `${selected.code} – ${selected.name}` : "เลือก Department..."}
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="absolute z-[10010] mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="flex w-full items-center px-3 py-2 hover:bg-slate-50 text-sm text-slate-400 italic transition-colors"
          >
            ไม่ระบุ
          </button>
          {departments.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => { onChange(d.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm transition-colors",
                value === d.id && "bg-blue-50 text-blue-700 font-medium",
              )}
            >
              <span className="font-mono text-xs text-blue-500 w-10 shrink-0">{d.code}</span>
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role multi-select ─────────────────────────────────────────────────────────
function RoleMultiSelect({ value, onChange }: { value: UserRole[]; onChange: (v: UserRole[]) => void }) {
  const [open, setOpen] = useState(false);
  function toggle(r: UserRole) {
    onChange(value.includes(r) ? value.filter(x => x !== r) : [...value, r]);
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="truncate">
          {value.length === 0 ? "เลือก Role..." : value.join(", ")}
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="absolute z-[10010] mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {ROLES.map(r => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-sm transition-colors">
              <input
                type="checkbox"
                checked={value.includes(r)}
                onChange={() => toggle(r)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              {r}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Compact user table row ───────────────────────────────────────────────────
function UserRow({ user, departments, onUpdated }: { user: UserProfile; departments: Department[]; onUpdated: () => void }) {
  const { userProfile: me } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [roles,      setRoles]      = useState<UserRole[]>(user.roles ?? []);
  const [deptId,     setDeptId]     = useState(user.departmentId ?? "");
  const [position,   setPosition]   = useState(user.position ?? "");
  const [firstName,  setFirstName]  = useState(user.firstName ?? "");
  const [lastName,   setLastName]   = useState(user.lastName  ?? "");

  const isSelf = me?.uid === user.uid;

  async function handleApprove() {
    setSaving(true);
    try { await approveUser(user.uid); onUpdated(); }
    finally { setSaving(false); }
  }

  async function handleReject() {
    setSaving(true);
    try { await rejectUser(user.uid); onUpdated(); }
    finally { setSaving(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserByAdmin(user.uid, { roles, position, firstName, lastName, departmentId: deptId || undefined });
      setEditing(false);
      onUpdated();
    } finally { setSaving(false); }
  }

  function handleCancel() {
    setEditing(false);
    setRoles(user.roles ?? []);
    setDeptId(user.departmentId ?? "");
    setPosition(user.position ?? "");
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }

  const department = departments.find(d => d.id === user.departmentId);
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "ไม่ระบุชื่อ";

  return (
    <>
      <tr className={cn(
        "border-b border-slate-100 transition-colors hover:bg-slate-50/80",
        user.status === "pending" && "bg-amber-50/40",
        user.status === "rejected" && "opacity-70",
      )}>
        <td className="px-3 py-2">
          <div className="flex min-w-[250px] items-center gap-2.5 whitespace-nowrap">
            {user.photoURL ? (
              <img src={user.photoURL} alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white ring-2 ring-blue-100">
                {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              <p className="max-w-[190px] truncate text-sm font-semibold text-slate-800" title={displayName}>
                {displayName}
                {isSelf && <span className="ml-1 text-xs font-normal text-blue-500">(คุณ)</span>}
              </p>
              <span className="max-w-[230px] truncate text-xs text-slate-500" title={user.email}>
                · {user.email || "-"}
              </span>
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          <Badge className={cn("border px-2 py-0.5 text-[11px]", STATUS_LABEL[user.status]?.cls)}>
            {STATUS_LABEL[user.status]?.label ?? user.status}
          </Badge>
        </td>
        <td className="max-w-[190px] whitespace-nowrap px-3 py-2 text-sm text-slate-600">
          <span className="block max-w-[190px] truncate" title={user.position || "ไม่ระบุตำแหน่ง"}>
            {user.position || <span className="italic text-slate-400">ไม่ระบุตำแหน่ง</span>}
          </span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-600">
          {department ? (
            <span title={department.name}>
              <span className="mr-1 font-mono text-xs text-blue-500">{department.code}</span>
              {department.name}
            </span>
          ) : <span className="italic text-slate-400">ไม่ระบุ</span>}
        </td>
        <td className="px-3 py-2">
          <div className="flex max-w-[230px] items-center gap-1 overflow-hidden whitespace-nowrap">
            {(user.roles ?? []).length > 0 ? (user.roles ?? []).map(r => (
              <span key={r} className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                {r}
              </span>
            )) : <span className="text-xs italic text-slate-400">ไม่มี role</span>}
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-slate-500">
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("th-TH") : "-"}
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          <div className="flex items-center justify-end gap-1">
        {user.status === "pending" && (
          <>
            <Button size="icon-sm" className="h-7 w-7 bg-green-600 hover:bg-green-700" aria-label="อนุมัติผู้ใช้" title="อนุมัติผู้ใช้"
              onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon-sm" variant="destructive" className="h-7 w-7" aria-label="ปฏิเสธผู้ใช้" title="ปฏิเสธผู้ใช้"
              onClick={handleReject} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
        {user.status === "approved" && (
          <>
            <Button size="icon-sm" variant="destructive" className="h-7 w-7" aria-label="ระงับสิทธิ์ผู้ใช้" title="ระงับสิทธิ์ผู้ใช้"
              onClick={handleReject} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
        {user.status === "rejected" && (
          <>
            <Button size="icon-sm" className="h-7 w-7 bg-green-600 hover:bg-green-700" aria-label="อนุมัติผู้ใช้อีกครั้ง" title="อนุมัติผู้ใช้อีกครั้ง"
              onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
        {!editing ? (
          <Button size="icon-sm" variant="outline" className="h-7 w-7" aria-label="แก้ไขข้อมูลผู้ใช้" title="แก้ไขข้อมูลผู้ใช้"
            onClick={() => setEditing(true)}>
            <UserCog className="h-3.5 w-3.5" />
          </Button>
        ) : null}
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="border-b border-blue-100 bg-blue-50/40">
          <td colSpan={7} className="px-3 py-3">
            <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">ชื่อ</label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="h-8 text-sm" placeholder="ชื่อ" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">นามสกุล</label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="h-8 text-sm" placeholder="นามสกุล" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">ตำแหน่งงาน</label>
                <Input value={position} onChange={e => setPosition(e.target.value)}
                  className="h-8 text-sm" placeholder="เช่น Quality Engineer" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">สิทธิ์การใช้งาน</label>
                <RoleMultiSelect value={roles} onChange={setRoles} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">แผนก</label>
                <DepartmentSelect value={deptId} departments={departments} onChange={setDeptId} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  บันทึก
                </Button>
                <Button size="sm" variant="outline" className="h-8"
                  onClick={handleCancel} disabled={saving}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { refreshPending } = useAuth();
  const [users,       setUsers]       = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<FilterType>("all");
  const [search,      setSearch]      = useState("");

  async function load() {
    setLoading(true);
    try {
      const [all, depts] = await Promise.all([listAllUsers(), getDepartments()]);
      setDepartments(depts);
      all.sort((a, b) => {
        const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
      });
      setUsers(all);
      refreshPending().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const counts = {
    all:      users.length,
    pending:  users.filter(u => u.status === "pending").length,
    approved: users.filter(u => u.status === "approved").length,
    rejected: users.filter(u => u.status === "rejected").length,
  };

  const filtered = users
    .filter(u => filter === "all" || u.status === filter)
    .filter(u => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q)
      );
    });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all",      label: "ทั้งหมด"    },
    { key: "pending",  label: "รออนุมัติ"  },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: "ปฏิเสธ"     },
  ];

  return (
    <AppLayout title="จัดการผู้ใช้งาน">
      <div className="mx-auto max-w-[1400px] space-y-6">

        <CompactStats items={[
          { icon: Users, label: "ผู้ใช้ทั้งหมด", value: counts.all, tone: "blue" },
          { icon: Clock, label: "รออนุมัติ", value: counts.pending, tone: "amber" },
          { icon: ShieldCheck, label: "อนุมัติแล้ว", value: counts.approved, tone: "green" },
          { icon: Ban, label: "ถูกปฏิเสธ", value: counts.rejected, tone: "red" },
        ]} />

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f.label}
                <span className={cn(
                  "ml-1.5 rounded-full text-[11px] font-bold px-1.5",
                  filter === f.key ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                )}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Refresh */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, email, ตำแหน่ง..."
              className="h-9 text-sm w-full sm:w-64"
            />
            <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* ── User list ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-400">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-slate-400 text-sm">
              {search ? `ไม่พบผู้ใช้งานที่ตรงกับ "${search}"` : "ไม่มีผู้ใช้งานในหมวดนี้"}
            </p>
          </div>
        ) : (
          <div>
            {counts.pending > 0 && filter !== "approved" && filter !== "rejected" && (
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <Clock className="h-4 w-4" />
                มี {counts.pending} บัญชีรอการอนุมัติ
              </p>
            )}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">ผู้ใช้งาน</th>
                      <th className="px-3 py-2.5">สถานะ</th>
                      <th className="px-3 py-2.5">ตำแหน่ง</th>
                      <th className="px-3 py-2.5">แผนก</th>
                      <th className="px-3 py-2.5">Roles</th>
                      <th className="px-3 py-2.5">สมัครเมื่อ</th>
                      <th className="px-3 py-2.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <UserRow key={u.uid} user={u} departments={departments} onUpdated={load} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-400">
                แสดง {filtered.length} จาก {users.length} ผู้ใช้งาน
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
