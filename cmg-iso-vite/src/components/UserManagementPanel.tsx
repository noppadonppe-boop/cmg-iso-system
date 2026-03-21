import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listAllUsers, approveUser, rejectUser,
  updateUserByAdmin,
} from "@/lib/authService";
import { ROLES } from "@/lib/types";
import type { UserProfile, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, UserCog, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: "อนุมัติแล้ว",   cls: "bg-green-100 text-green-700 border-green-200" },
  pending:  { label: "รออนุมัติ",     cls: "bg-amber-100 text-amber-700 border-amber-200"  },
  rejected: { label: "ปฏิเสธ",        cls: "bg-red-100   text-red-700   border-red-200"    },
};

function RoleMultiSelect({
  value, onChange,
}: { value: UserRole[]; onChange: (v: UserRole[]) => void }) {
  const [open, setOpen] = useState(false);
  function toggle(r: UserRole) {
    onChange(value.includes(r) ? value.filter(x => x !== r) : [...value, r]);
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
      >
        <span className="truncate">
          {value.length === 0 ? "เลือก Role..." : value.join(", ")}
        </span>
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          {ROLES.map(r => (
            <label key={r} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-xs">
              <input
                type="checkbox"
                checked={value.includes(r)}
                onChange={() => toggle(r)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
              />
              {r}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onUpdated }: { user: UserProfile; onUpdated: () => void }) {
  const { userProfile: me } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [roles,    setRoles]    = useState<UserRole[]>(user.roles ?? []);
  const [position, setPosition] = useState(user.position ?? "");

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
      await updateUserByAdmin(user.uid, { roles, position });
      setEditing(false);
      onUpdated();
    } finally { setSaving(false); }
  }

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2 text-xs",
      user.status === "pending" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"
    )}>
      {/* Top row */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="shrink-0">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">
            {user.firstName} {user.lastName}
            {isSelf && <span className="ml-1 text-blue-500">(คุณ)</span>}
          </p>
          <p className="text-slate-500 truncate">{user.email}</p>
        </div>
        <Badge className={cn("text-[10px] border shrink-0", STATUS_LABEL[user.status]?.cls)}>
          {STATUS_LABEL[user.status]?.label}
        </Badge>
      </div>

      {/* Roles */}
      {!editing ? (
        <div className="flex flex-wrap gap-1">
          {(user.roles ?? []).map(r => (
            <span key={r} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{r}</span>
          ))}
          {(!user.roles || user.roles.length === 0) && (
            <span className="text-slate-400 italic">ไม่มี role</span>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <RoleMultiSelect value={roles} onChange={setRoles} />
          <Input value={position} onChange={e => setPosition(e.target.value)}
            placeholder="ตำแหน่งงาน" className="h-7 text-xs" />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 pt-0.5 flex-wrap">
        {user.status === "pending" && (
          <>
            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              อนุมัติ
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
              onClick={handleReject} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              ปฏิเสธ
            </Button>
          </>
        )}
        {!editing ? (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setEditing(true)}>
            <UserCog className="h-3 w-3" />แก้ไข
          </Button>
        ) : (
          <>
            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}บันทึก
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { setEditing(false); setRoles(user.roles ?? []); setPosition(user.position ?? ""); }}>
              ยกเลิก
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function UserManagementPanel() {
  const { refreshPending } = useAuth();
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | "pending" | "approved" | "rejected">("all");

  async function load() {
    setLoading(true);
    try {
      const all = await listAllUsers();
      all.sort((a, b) => {
        const order = { pending: 0, approved: 1, rejected: 2 };
        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
      });
      setUsers(all);
      refreshPending().catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? users : users.filter(u => u.status === filter);
  const pendingCount = users.filter(u => u.status === "pending").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-slate-300" />
          <span className="text-sm font-semibold text-slate-200">จัดการผู้ใช้งาน</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {pendingCount}
            </span>
          )}
        </div>
        <button onClick={load} className="text-slate-400 hover:text-slate-200 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-2 py-2 border-b border-slate-700/40">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded text-[10px] py-1 font-medium transition-colors",
              filter === f
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            {f === "all" ? `ทั้งหมด(${users.length})`
              : f === "pending"  ? `รออนุมัติ(${users.filter(u => u.status === "pending").length})`
              : f === "approved" ? `อนุมัติ(${users.filter(u => u.status === "approved").length})`
              : `ปฏิเสธ(${users.filter(u => u.status === "rejected").length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-8">ไม่มีผู้ใช้งาน</p>
        ) : (
          filtered.map(u => (
            <UserRow key={u.uid} user={u} onUpdated={load} />
          ))
        )}
      </div>
    </div>
  );
}
