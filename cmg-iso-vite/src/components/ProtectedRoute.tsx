import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireApproved?: boolean;
  requireRoles?: UserRole[];
}

export function ProtectedRoute({ children, requireApproved = true, requireRoles }: Props) {
  const { firebaseUser, userProfile, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (userProfile.status === "pending") {
    return <Navigate to="/pending" replace />;
  }

  if (userProfile.status === "rejected") {
    return <Navigate to="/login" state={{ rejected: true }} replace />;
  }

  if (requireRoles && requireRoles.length > 0) {
    const hasAccess = requireRoles.some(r => userProfile.roles.includes(r));
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
