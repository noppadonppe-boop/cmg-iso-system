import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginWithEmail, loginWithGoogle } from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { userProfile, authLoading, refreshProfile } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";
  const wasRejected = (location.state as { rejected?: boolean })?.rejected;

  // Redirect if already logged in + approved
  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) return;
    if (userProfile.status === "pending")  { navigate("/pending", { replace: true }); return; }
    if (userProfile.status === "approved") { navigate(from, { replace: true }); }
  }, [userProfile, authLoading]);

  function friendlyError(code: string): string {
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (code.includes("too-many-requests"))
      return "พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง";
    if (code.includes("popup-closed"))
      return "ปิด popup ก่อนเข้าสู่ระบบ กรุณาลองใหม่";
    if (code.includes("unauthorized-domain"))
      return "Domain นี้ไม่ได้รับอนุญาตสำหรับ Google Sign-In";
    if (code === "user-profile-not-found")
      return "ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ";
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      await refreshProfile();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? String(err);
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      await refreshProfile();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? String(err);
      setError(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg mb-4">
            <span className="text-xl font-bold text-white">CMG</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CMG ISO System</h1>
          <p className="text-slate-400 text-sm mt-1">ISO 9001 · ISO 45001 Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">เข้าสู่ระบบ</h2>

          {wasRejected && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              บัญชีของคุณถูกปฏิเสธการเข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ
            </div>
          )}

          {/* Google Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-3 border-slate-200 hover:bg-slate-50 mb-4"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบด้วย Google"}
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">หรือใช้ Email</div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <Label className="text-sm text-slate-700">Email</Label>
              <Input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className="mt-1 h-11"
                required autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-700">รหัสผ่าน</Label>
              <div className="relative mt-1">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="h-11 pr-10"
                  required autoComplete="current-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              เข้าสู่ระบบ
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            ยังไม่มีบัญชี?{" "}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              สมัครใช้งาน
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
