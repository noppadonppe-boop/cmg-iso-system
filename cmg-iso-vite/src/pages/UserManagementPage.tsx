import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  listAllUsers, approveUser, rejectUser, updateUserByAdmin,
} from "@/lib/authService";
import { ROLES } from "@/lib/types";
import type { UserProfile, UserRole } from "@/lib/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp,
  UserCog, RefreshCw, Users, Clock, ShieldCheck, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types & constants ─────────────────────────────────────────────────────────
type FilterType = "all" | "pending" | "approved" | "rejected";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700 border-green-200" },
  pending:  { label: "รออนุมัติ",   cls: "bg-amber-100 text-amber-700 border-amber-200"  },
  rejected: { label: "ปฏิเสธ",      cls: "bg-red-100   text-red-700   border-red-200"    },
};

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
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
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

// ── User card (full-size) ─────────────────────────────────────────────────────
function UserCard({ user, onUpdated }: { user: UserProfile; onUpdated: () => void }) {
  const { userProfile: me } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [roles,    setRoles]    = useState<UserRole[]>(user.roles ?? []);
  const [position, setPosition] = useState(user.position ?? "");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName,  setLastName]  = useState(user.lastName  ?? "");

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
      await updateUserByAdmin(user.uid, { roles, position, firstName, lastName });
      setEditing(false);
      onUpdated();
    } finally { setSaving(false); }
  }

  function handleCancel() {
    setEditing(false);
    setRoles(user.roles ?? []);
    setPosition(user.position ?? "");
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md",
      user.status === "pending" && "border-amber-300 ring-1 ring-amber-200",
      user.status === "rejected" && "opacity-70",
    )}>
      {/* Card header */}
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        <div className="shrink-0">
          {user.photoURL ? (
            <img src={user.photoURL} alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold ring-2 ring-blue-100">
              {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {!editing ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800 text-base">
                  {user.firstName} {user.lastName}
                  {isSelf && <span className="ml-1.5 text-xs text-blue-500 font-normal">(คุณ)</span>}
                </p>
                <Badge className={cn("text-xs border", STATUS_LABEL[user.status]?.cls)}>
                  {STATUS_LABEL[user.status]?.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user.position || <span className="italic">ไม่ระบุตำแหน่ง</span>}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(user.roles ?? []).map(r => (
                  <span key={r} className="rounded-md bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                    {r}
                  </span>
                ))}
                {(!user.roles || user.roles.length === 0) && (
                  <span className="text-xs text-slate-400 italic">ไม่มี role</span>
                )}
              </div>
            </>
          ) : (
            /* Edit mode */
            <div className="space-y-3 w-full">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">ชื่อ</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="h-9 text-sm" placeholder="ชื่อ" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">นามสกุล</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)}
                    className="h-9 text-sm" placeholder="นามสกุล" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ตำแหน่งงาน</label>
                <Input value={position} onChange={e => setPosition(e.target.value)}
                  className="h-9 text-sm" placeholder="เช่น Quality Engineer" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">สิทธิ์การใช้งาน (Roles)</label>
                <RoleMultiSelect value={roles} onChange={setRoles} />
              </div>
            </div>
          )}
        </div>

        {/* Meta: joined date */}
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-[11px] text-slate-400">สมัครเมื่อ</p>
          <p className="text-xs text-slate-500 font-medium">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("th-TH") : "-"}
          </p>
        </div>
      </div>

      {/* Card footer — actions */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex-wrap">
        {user.status === "pending" && (
          <>
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 h-8"
              onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              อนุมัติ
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5 h-8"
              onClick={handleReject} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              ปฏิเสธ
            </Button>
            <div className="w-px h-4 bg-slate-300" />
          </>
        )}
        {user.status === "approved" && (
          <>
            <Button size="sm" variant="destructive" className="gap-1.5 h-8"
              onClick={handleReject} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              ระงับสิทธิ์
            </Button>
            <div className="w-px h-4 bg-slate-300" />
          </>
        )}
        {user.status === "rejected" && (
          <>
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 h-8"
              onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              อนุมัติใหม่
            </Button>
            <div className="w-px h-4 bg-slate-300" />
          </>
        )}
        {!editing ? (
          <Button size="sm" variant="outline" className="gap-1.5 h-8"
            onClick={() => setEditing(true)}>
            <UserCog className="h-3.5 w-3.5" />
            แก้ไขข้อมูล
          </Button>
        ) : (
          <>
            <Button size="sm" className="gap-1.5 h-8 bg-blue-600 hover:bg-blue-700"
              onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              บันทึก
            </Button>
            <Button size="sm" variant="outline" className="h-8"
              onClick={handleCancel} disabled={saving}>
              ยกเลิก
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, cls }: {
  icon: React.ElementType; label: string; value: number; cls: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", cls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { refreshPending } = useAuth();
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterType>("all");
  const [search,  setSearch]  = useState("");

  async function load() {
    setLoading(true);
    try {
      const all = await listAllUsers();
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
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}       label="ผู้ใช้ทั้งหมด" value={counts.all}      cls="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock}       label="รออนุมัติ"     value={counts.pending}  cls="bg-amber-50 text-amber-600" />
          <StatCard icon={ShieldCheck} label="อนุมัติแล้ว"   value={counts.approved} cls="bg-green-50 text-green-600" />
          <StatCard icon={Ban}         label="ถูกปฏิเสธ"     value={counts.rejected} cls="bg-red-50 text-red-600" />
        </div>

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
          <div className="space-y-3">
            {counts.pending > 0 && filter !== "approved" && filter !== "rejected" && (
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                มี {counts.pending} บัญชีรอการอนุมัติ
              </p>
            )}
            {filtered.map(u => (
              <UserCard key={u.uid} user={u} onUpdated={load} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
