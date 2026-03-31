import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PendingApprovalPage() {
  const { userProfile, firebaseUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    if (firebaseUser) await logout(firebaseUser.uid, firebaseUser.email ?? "");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
            <span className="text-xl font-bold text-white">CMG</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CMG ISO System</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mx-auto mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">รอการอนุมัติ</h2>
          <p className="text-slate-500 text-sm mb-2">
            บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
          </p>
          {userProfile && (
            <p className="text-slate-700 text-sm font-medium mb-1">
              {userProfile.firstName} {userProfile.lastName}
            </p>
          )}
          {userProfile?.email && (
            <p className="text-slate-400 text-xs mb-6">{userProfile.email}</p>
          )}
          <p className="text-slate-400 text-xs mb-6">
            กรุณาติดต่อผู้ดูแลระบบ (MasterAdmin) เพื่อขอการอนุมัติ
            เมื่อได้รับการอนุมัติแล้วให้ล็อกอินเข้าสู่ระบบอีกครั้ง
          </p>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  );
}
