import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchProfile, countPendingUsers } from "@/lib/authService";
import type { UserProfile, UserRole } from "@/lib/types";

type AuthContextType = {
  firebaseUser:  FirebaseUser | null;
  userProfile:   UserProfile | null;
  authLoading:   boolean;
  pendingCount:  number;
  refreshProfile: () => Promise<void>;
  refreshPending: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  async function refreshProfile() {
    if (!firebaseUser) return;
    const p = await fetchProfile(firebaseUser.uid);
    setUserProfile(p);
  }

  async function refreshPending() {
    try {
      const n = await countPendingUsers();
      setPendingCount(n);
    } catch { setPendingCount(0); }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const p = await fetchProfile(fbUser.uid);
        setUserProfile(p);
        refreshPending().catch(() => {});
      } else {
        setUserProfile(null);
        setPendingCount(0);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Re-fetch pending count when profile changes (e.g. after admin action)
  useEffect(() => {
    if (userProfile?.roles.includes("MasterAdmin")) {
      refreshPending().catch(() => {});
    }
  }, [userProfile]);

  function hasRole(role: UserRole) {
    return userProfile?.roles.includes(role) ?? false;
  }

  function hasAnyRole(roles: UserRole[]) {
    return roles.some(r => userProfile?.roles.includes(r));
  }

  return (
    <AuthContext.Provider value={{
      firebaseUser, userProfile, authLoading,
      pendingCount, refreshProfile, refreshPending,
      hasRole, hasAnyRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
