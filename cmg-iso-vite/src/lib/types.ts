// ── Auth / User Management ────────────────────────────────────────────────────
export const ROLES = [
  "MasterAdmin",
  "QMR",
  "AUDITOR",
  "AUDITEE",
  "DEPT_HEAD",
  "Staff",
  "Viewer",
  "Creator",
] as const;

export type UserRole = typeof ROLES[number];

export type UserProfile = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  roles: UserRole[];
  status: "pending" | "approved" | "rejected";
  assignedProjects: string[];
  createdAt: string;
  photoURL?: string | null;
  isFirstUser: boolean;
};

export type AppMetaConfig = {
  firstUserRegistered: boolean;
  totalUsers: number;
  createdAt: string;
};

export type ActivityLog = {
  uid: string;
  email: string;
  action: "REGISTER" | "LOGIN" | "LOGOUT" | "PROFILE_UPDATE" | "USER_APPROVED" | "USER_REJECTED";
  detail?: string;
  timestamp: string;
};

// ── App Data ──────────────────────────────────────────────────────────────────
export type YearCycle = {
  id: string;
  year: number;
  isActive: boolean;
  isClosed: boolean;
  annualReportUrl: string | null;
  reportSubmittedAt: string | null;
  reportSubmittedBy: string | null;
};

export type Department = {
  id: string;
  code: string;
  name: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  department?: Department;
};

export type AuditorProfile = {
  id: string;
  userId: string;
  user: User;
  isActiveAuditor: boolean;
  iso9001ExamPassed: boolean;
  iso45001ExamPassed: boolean;
  iso9001CertUrl: string | null;
  iso45001CertUrl: string | null;
  department?: Department;
};

export type AuditPlan = {
  id: string;
  yearCycleId: string;
  auditType: string;
  roundNumber: number;
  scheduledDate: string;
  status: string;
  departmentId: string;
  auditorId: string;
  auditeeId: string;
  auditee: { id: string; name: string; department: Department };
  auditor?: { id: string; name: string };
  cpars: { id: string }[];
};

export type CPAR = {
  id: string;
  cparNo: string;
  auditId: string;
  yearCycleId: string;
  audit?: AuditPlan;
  title: string;
  description: string;
  status: string;
  rootCause: string | null;
  correctiveAction: string | null;
  verificationResult: string | null;
  issuedDate: string;
  dueDate: string | null;
  closedDate: string | null;
  departmentId: string;
  department?: Department;
};

export type ManagementReview = {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  yearCycleId: string;
  agendaUrl: string | null;
  minutesUrl: string | null;
  notes: string | null;
};

export type KPI = {
  id: string;
  name: string;
  target: number;
  unit: string;
  departmentId: string;
  department?: Department;
  yearCycleId: string;
  reports?: KPIReport[];
};

export type KPIReport = {
  id: string;
  kpiId: string;
  kpi?: KPI;
  departmentId: string;
  department?: Department;
  yearId: string;
  reportMonth: number;
  value: number;
  status: string;
  submittedAt: string;
};

export type MOC = {
  id: string;
  mocNo: string;
  title: string;
  description: string;
  status: string;
  requestorId: string;
  requestor?: User;
  yearCycleId: string;
  createdAt: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  docNo: string;
  title: string;
  category: string;
  departmentId: string;
  department?: Department;
  ownerId: string;
  owner?: User;
  revision: string;
  status: string;
  issuedDate: string;
  nextReviewDate: string;
  fileUrl: string | null;
  description: string;
  relatedCparId: string | null;
  relatedMocId: string | null;
};
