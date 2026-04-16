/**
 * Firestore service layer
 * Structure: cmg-iso-system (col) → root (doc) → {subcollection}
 *
 * All authenticated and anonymous users share the same root document,
 * so all data is visible to everyone without per-user isolation.
 */
import {
  doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { rootCol, db } from "./firebase";
import type {
  YearCycle, Department, User, AuditorProfile,
  AuditPlan, CPAR, ManagementReview, KPI, KPIReport, MOC, Document,
} from "./types";

// ── helpers ───────────────────────────────────────────────────────────────────
function toSnap<T>(d: import("firebase/firestore").DocumentSnapshot): T {
  return { id: d.id, ...(d.data() as object) } as T;
}
function toSnaps<T>(qs: import("firebase/firestore").QuerySnapshot): T[] {
  return qs.docs.map(d => ({ id: d.id, ...(d.data() as object) } as T));
}
function fromTs(val: unknown): string {
  if (!val) return "";
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === "string") return val;
  return String(val);
}

// ── Year Cycles ───────────────────────────────────────────────────────────────
export async function getYearCycles(): Promise<YearCycle[]> {
  const qs = await getDocs(query(rootCol("yearCycles"), orderBy("year", "desc")));
  return toSnaps<YearCycle>(qs).map(y => ({ ...y, reportSubmittedAt: fromTs(y.reportSubmittedAt) }));
}

export async function createYearCycle(data: Omit<YearCycle, "id">): Promise<string> {
  const ref = await addDoc(rootCol("yearCycles"), data);
  return ref.id;
}

export async function updateYearCycle(id: string, data: Partial<YearCycle>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "yearCycles", id), data);
}

// ── Departments ───────────────────────────────────────────────────────────────
export async function getDepartments(): Promise<Department[]> {
  const qs = await getDocs(query(rootCol("departments"), orderBy("code")));
  return toSnaps<Department>(qs);
}

export async function createDepartment(data: Omit<Department, "id">) {
  const ref = await addDoc(rootCol("departments"), data);
  return ref.id;
}

export async function updateDepartment(id: string, data: Partial<Department>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "departments", id), data);
}

export async function deleteDepartment(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "departments", id));
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  const qs = await getDocs(query(rootCol("users"), orderBy("name")));
  return toSnaps<User>(qs);
}

// ── Auditor Profiles ──────────────────────────────────────────────────────────
export async function getAuditors(): Promise<AuditorProfile[]> {
  const qs = await getDocs(rootCol("auditorProfiles"));
  return toSnaps<AuditorProfile>(qs);
}

export async function createAuditor(data: Omit<AuditorProfile, "id">) {
  const ref = await addDoc(rootCol("auditorProfiles"), data);
  return ref.id;
}

export async function updateAuditor(id: string, data: Partial<AuditorProfile>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "auditorProfiles", id), data);
}

export async function deleteAuditor(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "auditorProfiles", id));
}

// ── Audit Plans ───────────────────────────────────────────────────────────────
export async function getAudits(yearId?: string): Promise<AuditPlan[]> {
  const q = yearId
    ? query(rootCol("auditPlans"), where("yearCycleId", "==", yearId), orderBy("scheduledDate"))
    : query(rootCol("auditPlans"), orderBy("scheduledDate"));
  const qs = await getDocs(q);
  return toSnaps<AuditPlan>(qs).map(a => ({ ...a, scheduledDate: fromTs(a.scheduledDate) }));
}

export async function getAudit(id: string): Promise<AuditPlan | null> {
  const d = await getDoc(doc(db, "cmg-iso-system", "root", "auditPlans", id));
  return d.exists() ? toSnap<AuditPlan>(d) : null;
}

export async function createAudit(data: Omit<AuditPlan, "id">) {
  const ref = await addDoc(rootCol("auditPlans"), data);
  return ref.id;
}

export async function updateAudit(id: string, data: Partial<AuditPlan>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "auditPlans", id), data);
}

export async function deleteAudit(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "auditPlans", id));
}

// ── CPAR ──────────────────────────────────────────────────────────────────────
export async function getCpars(yearId?: string): Promise<CPAR[]> {
  const q = yearId
    ? query(rootCol("cpars"), where("yearCycleId", "==", yearId), orderBy("issuedDate", "desc"))
    : query(rootCol("cpars"), orderBy("issuedDate", "desc"));
  const qs = await getDocs(q);
  return toSnaps<CPAR>(qs).map(c => ({
    ...c,
    issuedDate: fromTs(c.issuedDate),
    dueDate:    fromTs(c.dueDate),
    closedDate: fromTs(c.closedDate),
  }));
}

export async function getCpar(id: string): Promise<CPAR | null> {
  const d = await getDoc(doc(db, "cmg-iso-system", "root", "cpars", id));
  return d.exists() ? toSnap<CPAR>(d) : null;
}

export function generateCparId(): string {
  return doc(rootCol("cpars")).id;
}

export async function createCpar(data: Omit<CPAR, "id">, id?: string) {
  if (id) {
    await setDoc(doc(db, "cmg-iso-system", "root", "cpars", id), data);
    return id;
  }
  const ref = await addDoc(rootCol("cpars"), data);
  return ref.id;
}

export async function updateCpar(id: string, data: Partial<CPAR>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "cpars", id), data);
}

export async function deleteCpar(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "cpars", id));
}

// ── Management Reviews ────────────────────────────────────────────────────────
export async function getManagementReviews(yearId?: string): Promise<ManagementReview[]> {
  const q = yearId
    ? query(rootCol("managementReviews"), where("yearCycleId", "==", yearId), orderBy("meetingDate", "desc"))
    : query(rootCol("managementReviews"), orderBy("meetingDate", "desc"));
  const qs = await getDocs(q);
  return toSnaps<ManagementReview>(qs).map(m => ({ ...m, meetingDate: fromTs(m.meetingDate) }));
}

export function generateMeetingId(): string {
  return doc(rootCol("managementReviews")).id;
}

export async function createManagementReview(data: Omit<ManagementReview, "id">, id?: string) {
  if (id) {
    await setDoc(doc(db, "cmg-iso-system", "root", "managementReviews", id), data);
    return id;
  }
  const ref = await addDoc(rootCol("managementReviews"), data);
  return ref.id;
}

export async function updateManagementReview(id: string, data: Partial<ManagementReview>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "managementReviews", id), data);
}

export async function deleteManagementReview(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "managementReviews", id));
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
export async function getKpis(yearId?: string): Promise<KPI[]> {
  const q = yearId
    ? query(rootCol("kpis"), where("yearCycleId", "==", yearId))
    : query(rootCol("kpis"));
  const qs = await getDocs(q);
  return toSnaps<KPI>(qs);
}

export async function createKpi(data: Omit<KPI, "id">) {
  const ref = await addDoc(rootCol("kpis"), data);
  return ref.id;
}

export async function updateKpi(id: string, data: Partial<KPI>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "kpis", id), data);
}

export async function deleteKpi(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "kpis", id));
}

// ── KPI Reports ───────────────────────────────────────────────────────────────
export async function getKpiReports(params: { kpiId?: string; yearId?: string }): Promise<KPIReport[]> {
  let q;
  if (params.kpiId)       q = query(rootCol("kpiReports"), where("kpiId",  "==", params.kpiId),  orderBy("reportMonth"));
  else if (params.yearId) q = query(rootCol("kpiReports"), where("yearId", "==", params.yearId), orderBy("reportMonth"));
  else                    q = query(rootCol("kpiReports"), orderBy("reportMonth"));
  const qs = await getDocs(q);
  return toSnaps<KPIReport>(qs).map(r => ({ ...r, submittedAt: fromTs(r.submittedAt) }));
}

export async function createKpiReport(data: Omit<KPIReport, "id">) {
  const ref = await addDoc(rootCol("kpiReports"), data);
  return ref.id;
}

export async function updateKpiReport(id: string, data: Partial<KPIReport>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "kpiReports", id), data);
}

// ── MOC ───────────────────────────────────────────────────────────────────────
export async function getMocs(yearId?: string): Promise<MOC[]> {
  const q = yearId
    ? query(rootCol("mocs"), where("yearCycleId", "==", yearId), orderBy("createdAt", "desc"))
    : query(rootCol("mocs"), orderBy("createdAt", "desc"));
  const qs = await getDocs(q);
  return toSnaps<MOC>(qs).map(m => ({ ...m, createdAt: fromTs(m.createdAt), updatedAt: fromTs(m.updatedAt) }));
}

export async function getMoc(id: string): Promise<MOC | null> {
  const d = await getDoc(doc(db, "cmg-iso-system", "root", "mocs", id));
  return d.exists() ? toSnap<MOC>(d) : null;
}

export function generateMocId(): string {
  return doc(rootCol("mocs")).id;
}

export async function createMoc(data: Omit<MOC, "id">, id?: string) {
  if (id) {
    await setDoc(doc(db, "cmg-iso-system", "root", "mocs", id), data);
    return id;
  }
  const ref = await addDoc(rootCol("mocs"), data);
  return ref.id;
}

export async function deleteMoc(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "mocs", id));
}

export async function updateMoc(id: string, data: Partial<MOC>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "mocs", id), { ...data, updatedAt: new Date().toISOString() });
}

// ── Documents ─────────────────────────────────────────────────────────────────
export async function getDocuments(): Promise<Document[]> {
  const qs = await getDocs(query(rootCol("documents"), orderBy("docNo")));
  return toSnaps<Document>(qs).map(d => ({
    ...d,
    issuedDate:     fromTs(d.issuedDate),
    nextReviewDate: fromTs(d.nextReviewDate),
  }));
}

export async function createDocument(data: Omit<Document, "id">) {
  const ref = await addDoc(rootCol("documents"), data);
  return ref.id;
}

export async function updateDocument(id: string, data: Partial<Document>) {
  await updateDoc(doc(db, "cmg-iso-system", "root", "documents", id), data);
}

export async function deleteDocument(id: string) {
  await deleteDoc(doc(db, "cmg-iso-system", "root", "documents", id));
}

// ── Seed helper (used by seed script) ────────────────────────────────────────
export async function upsertDoc(subcol: string, id: string, data: object) {
  await setDoc(doc(db, "cmg-iso-system", "root", subcol, id), data, { merge: true });
}
