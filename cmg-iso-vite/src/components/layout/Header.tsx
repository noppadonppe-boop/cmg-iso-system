import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useYearCycle } from "@/context/YearCycleContext";
import { useAuth } from "@/context/AuthContext";
import { logout, updateProfile } from "@/lib/authService";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, ChevronDown, Loader2, LogOut, UserCircle, Save, X, Menu } from "lucide-react";

export function Header({ title, onMenuClick }: { title?: string, onMenuClick?: () => void }) {
  const { yearCycles, selectedYear, setSelectedYear, isLoading } = useYearCycle();
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [dropOpen,   setDropOpen]   = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [firstName,  setFirstName]  = useState(userProfile?.firstName ?? "");
  const [lastName,   setLastName]   = useState(userProfile?.lastName  ?? "");
  const [position,   setPosition]   = useState(userProfile?.position  ?? "");
  const dropRef = useRef<HTMLDivElement>(null);

  // Sync fields when profile changes
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName);
      setLastName(userProfile.lastName);
      setPosition(userProfile.position);
    }
  }, [userProfile]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
        setEditMode(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleSaveProfile() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await updateProfile(firebaseUser.uid, { firstName, lastName, position });
      await refreshProfile();
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (firebaseUser) await logout(firebaseUser.uid, firebaseUser.email ?? "");
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 md:px-6 gap-2 md:gap-4">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && <h1 className="text-base md:text-lg font-semibold text-slate-800 truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Year Cycle Selector */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
          <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : yearCycles.length === 0 ? (
            <span className="text-sm text-slate-500">No cycles</span>
          ) : (
            <Select
              value={selectedYear?.id ?? ""}
              onValueChange={(val) => {
                const found = yearCycles.find((yc) => yc.id === val);
                if (found) setSelectedYear(found);
              }}
            >
              <SelectTrigger className="border-0 bg-transparent p-0 h-auto text-sm font-semibold text-slate-700 shadow-none focus:ring-0 gap-1.5 [&>svg]:hidden">
                <SelectValue />
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </SelectTrigger>
              <SelectContent align="end">
                {yearCycles.map((yc) => (
                  <SelectItem key={yc.id} value={yc.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{yc.year}</span>
                      {yc.isActive && !yc.isClosed && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                      {yc.isClosed && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500">
                          Closed
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* User Avatar + Dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => { setDropOpen(o => !o); setEditMode(false); }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt=""
                className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-100" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                {(userProfile?.firstName?.[0] ?? userProfile?.email?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Loading..."}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {userProfile?.roles?.slice(0, 2).join(", ")}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
              {!editMode ? (
                <div>
                  {/* Profile header */}
                  <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-100" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-bold">
                        {(userProfile?.firstName?.[0] ?? "U").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {userProfile?.firstName} {userProfile?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{userProfile?.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{userProfile?.position}</p>
                    </div>
                  </div>
                  {/* Roles */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">สิทธิ์การใช้งาน</p>
                    <div className="flex flex-wrap gap-1">
                      {(userProfile?.roles ?? []).map(r => (
                        <span key={r} className="rounded bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-xs">{r}</span>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <UserCircle className="h-4 w-4 text-slate-400" />
                      แก้ไขโปรไฟล์
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-slate-700 text-sm">แก้ไขโปรไฟล์</p>
                    <button onClick={() => setEditMode(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">ชื่อ</Label>
                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">นามสกุล</Label>
                        <Input value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 h-9 text-sm" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">ตำแหน่งงาน</Label>
                      <Input value={position} onChange={e => setPosition(e.target.value)} className="mt-1 h-9 text-sm" />
                    </div>
                    <Button className="w-full h-9 bg-blue-600 hover:bg-blue-700 gap-2"
                      disabled={saving} onClick={handleSaveProfile}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      บันทึก
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
