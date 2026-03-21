/**
 * Firebase Auth service layer
 * Handles: Email/Password login, Google Sign-In, Registration, Profile CRUD, Activity Logging
 */
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  runTransaction, serverTimestamp, query, where, getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import type { UserProfile, UserRole, AppMetaConfig } from "./types";

const APP = "cmg-iso-system";

// ── Path helpers ──────────────────────────────────────────────────────────────
const userDoc   = (uid: string) => doc(db, APP, "root", "users", uid);
const metaDoc   = ()            => doc(db, APP, "root", "appMeta", "config");
const logsCol   = ()            => collection(db, APP, "root", "activityLogs");

// ── Activity log (non-blocking) ───────────────────────────────────────────────
export function logActivity(
  uid: string,
  email: string,
  action: string,
  detail?: string,
) {
  addDoc(logsCol(), {
    uid, email, action,
    detail: detail ?? "",
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

// ── Fetch profile ─────────────────────────────────────────────────────────────
export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch {
    return null;
  }
}

// ── First-user detection via transaction ─────────────────────────────────────
async function isFirstUser(): Promise<boolean> {
  try {
    const snap = await getDoc(metaDoc());
    if (!snap.exists()) return true;
    return !(snap.data() as AppMetaConfig).firstUserRegistered;
  } catch {
    return false;
  }
}

async function markFirstUserRegistered() {
  try {
    const snap = await getDoc(metaDoc());
    if (!snap.exists()) {
      await setDoc(metaDoc(), {
        firstUserRegistered: true,
        totalUsers: 1,
        createdAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(metaDoc(), { firstUserRegistered: true });
    }
  } catch {}
}

// ── Create user profile in Firestore ─────────────────────────────────────────
export async function createUserProfile(
  fbUser: FirebaseUser,
  extra: { firstName: string; lastName: string; position: string },
  forceFirst = false,
): Promise<UserProfile> {
  const first = forceFirst || (await isFirstUser());

  const profile: UserProfile = {
    uid:              fbUser.uid,
    email:            fbUser.email ?? "",
    firstName:        extra.firstName,
    lastName:         extra.lastName,
    position:         extra.position,
    roles:            first ? ["MasterAdmin"] : ["Staff"],
    status:           first ? "approved" : "pending",
    assignedProjects: [],
    createdAt:        new Date().toISOString(),
    photoURL:         fbUser.photoURL ?? null,
    isFirstUser:      first,
  };

  await setDoc(userDoc(fbUser.uid), profile);
  if (first) await markFirstUserRegistered();
  return profile;
}

// ── Email / Password Login ────────────────────────────────────────────────────
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchProfile(cred.user.uid);
  if (!profile) throw new Error("user-profile-not-found");
  logActivity(cred.user.uid, email, "LOGIN", "email");
  return profile;
}

// ── Google Sign-In ────────────────────────────────────────────────────────────
export async function loginWithGoogle(): Promise<{ profile: UserProfile; isNew: boolean }> {
  const cred = await signInWithPopup(auth, googleProvider);
  const fbUser = cred.user;

  let profile = await fetchProfile(fbUser.uid);
  let isNew = false;

  if (!profile) {
    isNew = true;
    const nameParts = (fbUser.displayName ?? "").split(" ");
    profile = await createUserProfile(fbUser, {
      firstName: nameParts[0] ?? "",
      lastName:  nameParts.slice(1).join(" ") ?? "",
      position:  "",
    });
    logActivity(fbUser.uid, fbUser.email ?? "", "REGISTER", "google");
  } else {
    if (fbUser.photoURL && profile.photoURL !== fbUser.photoURL) {
      await updateDoc(userDoc(fbUser.uid), { photoURL: fbUser.photoURL });
      profile.photoURL = fbUser.photoURL;
    }
    logActivity(fbUser.uid, fbUser.email ?? "", "LOGIN", "google");
  }

  return { profile, isNew };
}

// ── Email / Password Registration ─────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  position: string,
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await createUserProfile(cred.user, { firstName, lastName, position });
  logActivity(cred.user.uid, email, "REGISTER", "email");
  return profile;
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout(uid: string, email: string) {
  logActivity(uid, email, "LOGOUT");
  await signOut(auth);
}

// ── Update profile ────────────────────────────────────────────────────────────
export async function updateProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "firstName" | "lastName" | "position" | "photoURL">>,
) {
  await updateDoc(userDoc(uid), data);
  logActivity(uid, "", "PROFILE_UPDATE");
}

// ── Admin: list all users ─────────────────────────────────────────────────────
export async function listAllUsers(): Promise<UserProfile[]> {
  const qs = await getDocs(collection(db, APP, "root", "users"));
  return qs.docs.map(d => d.data() as UserProfile);
}

// ── Admin: approve / reject / update roles ────────────────────────────────────
export async function approveUser(uid: string) {
  await updateDoc(userDoc(uid), { status: "approved" });
}

export async function rejectUser(uid: string) {
  await updateDoc(userDoc(uid), { status: "rejected" });
}

export async function updateUserRoles(uid: string, roles: UserRole[]) {
  await updateDoc(userDoc(uid), { roles });
}

export async function updateUserByAdmin(
  uid: string,
  data: Partial<Pick<UserProfile, "firstName" | "lastName" | "position" | "roles" | "status">>,
) {
  await updateDoc(userDoc(uid), data);
}

// ── Count pending users ───────────────────────────────────────────────────────
export async function countPendingUsers(): Promise<number> {
  const q = query(collection(db, APP, "root", "users"), where("status", "==", "pending"));
  const qs = await getDocs(q);
  return qs.size;
}
