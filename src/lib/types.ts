// ── Auth / User Management ────────────────────────────────────────────────────
export const ROLES = [
  "MasterAdmin",
  "QMS",
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
  departmentId?: string;
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

export type InternalAuditChecklistItem = {
  id: string;
  yearCycleId: string;
  isoStandard: "ISO9001" | "ISO45001" | "BOTH";
  clauseNo: string;
  clauseDescriptionEn: string;
  clauseDescriptionTh: string;
  cmgPmReference: string;
  departmentIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type DepartmentAuditResult = "/" | "C" | "CAR" | "OBS";

export type DepartmentAuditChecklistEntry = {
  finding: string;
  result: DepartmentAuditResult;
  remark: string;
  attachments?: AuditAttachment[];
};

export type DepartmentAuditChecklist = {
  id: string;
  yearCycleId: string;
  departmentId: string;
  metadata: {
    auditor: string;
    auditDate: string;
    auditee: string;
    status: string;
  };
  entries: Record<string, DepartmentAuditChecklistEntry>;
  updatedAt?: string;
  updatedBy?: string;
};

export type InternalAuditChecklistLayout = {
  matrixColumnWidths?: Record<string, number>;
  departmentColumnWidths?: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
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
  iso9001Certs?: AuditAttachment[];
  iso45001Certs?: AuditAttachment[];
  internalAttachments?: AuditorAttachment[];
  externalAttachments?: AuditorAttachment[];
  department?: Department;
};

export type AuditAttachment = {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
};

export type AuditorAttachment = AuditAttachment & {
  category: "internal" | "external";
};

export type AuditPlan = {
  id: string;
  yearCycleId: string;
  auditType: string;
  isoStandard?: "ISO9001" | "ISO45001" | "BOTH";
  roundNumber: number;
  scheduledDate: string;
  endDate?: string;
  status: string;
  departmentId: string;
  auditorId: string;
  auditeeId: string;
  auditee: { id: string; name: string; department: Department };
  auditor?: { id: string; name: string };
  scope?: string;
  remarks?: string;
  attachments?: AuditAttachment[];
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
  attachments?: AuditAttachment[];
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
  attachments?: AuditAttachment[];
};

export type KPI = {
  id: string;
  name: string;
  description?: string;
  target: number;
  unit: string;
  departmentId: string;
  department?: Department;
  yearCycleId: string;
  attachments?: AuditAttachment[];
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
  attachments?: AuditAttachment[];
};

export type MOC = {
  id: string;
  mocNo: string;
  title: string;
  description: string;
  status: string;
  requestorId: string;
  requestor?: { id: string; name: string };
  yearCycleId: string;
  createdAt: string;
  updatedAt: string;
  attachments?: AuditAttachment[];
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
  attachments?: AuditAttachment[];
  versions?: DocumentVersion[];
  pendingRevisionRequestId?: string | null;
};

export type DocumentRevisionProposal = {
  docNo: string;
  title: string;
  category: string;
  departmentId: string;
  department?: Department;
  ownerId: string;
  owner?: User;
  revision: string;
  issuedDate: string;
  nextReviewDate: string;
  fileUrl: string | null;
  description: string;
  relatedCparId: string | null;
  relatedMocId: string | null;
  attachments?: AuditAttachment[];
};

export type DocumentVersion = DocumentRevisionProposal & {
  status: string;
  archivedAt: string;
  darRequestId?: string;
  approvedAt?: string;
  effectiveDate?: string;
};

export type DocumentRevisionRequest = {
  id: string;
  documentId: string;
  docNo: string;
  title: string;
  category: string;
  previousRevision: string;
  previousDocumentStatus: string;
  proposal: DocumentRevisionProposal;
  changeSummary: string;
  effectiveDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  requestorId: string;
  requestorName: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerName?: string;
  decisionNote?: string;
};
