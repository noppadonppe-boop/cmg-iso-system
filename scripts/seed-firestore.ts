/**
 * Firestore Seed Script — cmg-iso-system
 * Structure: cmg-iso-system (col) → root (doc) → {subcollection} → {docId}
 *
 * Run with:  npm run seed
 *
 * Requires a service-account key at: scripts/serviceAccountKey.json
 * Download: Firebase Console → Project Settings → Service Accounts → Generate new private key
 */
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount: ServiceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Root path helper — all data lives under cmg-iso-system/root/{subcollection}
function rootDoc(subcol: string, id: string) {
  return db.collection("cmg-iso-system").doc("root").collection(subcol).doc(id);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function ts(iso: string) { return Timestamp.fromDate(new Date(iso)); }
async function upsert(subcol: string, id: string, data: object) {
  await rootDoc(subcol, id).set(data, { merge: true });
  console.log(`  ✓ cmg-iso-system/root/${subcol}/${id}`);
}

// ── Data ──────────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: "dept-mkt",  code: "MKT", name: "Bidding" },
  { id: "dept-log",  code: "LOG", name: "Logistic and store" },
  { id: "dept-dcc",  code: "DCC", name: "Document Control" },
  { id: "dept-hr",   code: "HR",  name: "Human Resources" },
  { id: "dept-she",  code: "SHE", name: "Safety Health & Environment" },
  { id: "dept-qc",   code: "QC",  name: "Quality Control" },
  { id: "dept-mfg",  code: "MFG", name: "CMG Work Shop & Maintenance" },
  { id: "dept-it",   code: "IT",  name: "Information Technology" },
  { id: "dept-pct",  code: "PCT", name: "Procurement" },
  { id: "dept-ppe",  code: "PPE", name: "PPE" },
  { id: "dept-con",  code: "CON", name: "Construction" },
  { id: "dept-pp",   code: "PP",  name: "Project Planning" },
];

const YEAR_CYCLES = [
  { id: "yc-2025", year: 2025, isActive: false, isClosed: true,  annualReportUrl: null, reportSubmittedAt: null, reportSubmittedBy: null },
  { id: "yc-2026", year: 2026, isActive: true,  isClosed: false, annualReportUrl: null, reportSubmittedAt: null, reportSubmittedBy: null },
];

const USERS = [
  { id: "usr-001", name: "Admin QMR",      email: "qmr@cmg.co.th",      role: "QMR",       departmentId: "dept-dcc" },
  { id: "usr-002", name: "Somchai Jaidee", email: "somchai@cmg.co.th",  role: "AUDITOR",   departmentId: "dept-qc" },
  { id: "usr-003", name: "Nattaya Ploy",   email: "nattaya@cmg.co.th",  role: "AUDITOR",   departmentId: "dept-she" },
  { id: "usr-004", name: "Kritsana Boom",  email: "kritsana@cmg.co.th", role: "AUDITEE",   departmentId: "dept-mkt" },
  { id: "usr-005", name: "Panida Wan",     email: "panida@cmg.co.th",   role: "AUDITEE",   departmentId: "dept-log" },
  { id: "usr-006", name: "Wichit Dee",     email: "wichit@cmg.co.th",   role: "DEPT_HEAD", departmentId: "dept-hr" },
  { id: "usr-007", name: "Maneerat Sai",   email: "maneerat@cmg.co.th", role: "AUDITOR",   departmentId: "dept-it" },
  { id: "usr-008", name: "Thanit Prao",    email: "thanit@cmg.co.th",   role: "AUDITEE",   departmentId: "dept-mfg" },
  { id: "usr-009", name: "Suda Kaew",      email: "suda@cmg.co.th",     role: "AUDITEE",   departmentId: "dept-it" },
];

const AUDITOR_PROFILES = [
  { id: "aud-001", userId: "usr-002", isActiveAuditor: true,  iso9001ExamPassed: true,  iso45001ExamPassed: true,  iso9001CertUrl: "https://example.com/cert9001-somchai.pdf",  iso45001CertUrl: "https://example.com/cert45001-somchai.pdf" },
  { id: "aud-002", userId: "usr-003", isActiveAuditor: true,  iso9001ExamPassed: true,  iso45001ExamPassed: true,  iso9001CertUrl: "https://example.com/cert9001-nattaya.pdf",  iso45001CertUrl: "https://example.com/cert45001-nattaya.pdf" },
  { id: "aud-003", userId: "usr-007", isActiveAuditor: false, iso9001ExamPassed: true,  iso45001ExamPassed: false, iso9001CertUrl: "https://example.com/cert9001-maneerat.pdf", iso45001CertUrl: null },
];

const KPIS = [
  { id: "kpi-001", yearCycleId: "yc-2026", departmentId: "dept-mkt", name: "Customer Satisfaction Score",        target: 90,   unit: "%" },
  { id: "kpi-002", yearCycleId: "yc-2026", departmentId: "dept-mkt", name: "On-time Delivery Rate",               target: 95,   unit: "%" },
  { id: "kpi-003", yearCycleId: "yc-2026", departmentId: "dept-qc",  name: "Defect Rate",                         target: 2,    unit: "%" },
  { id: "kpi-004", yearCycleId: "yc-2026", departmentId: "dept-qc",  name: "First Pass Yield",                    target: 98,   unit: "%" },
  { id: "kpi-005", yearCycleId: "yc-2026", departmentId: "dept-she", name: "Safety Incident Rate",                target: 0,    unit: "incidents" },
  { id: "kpi-006", yearCycleId: "yc-2026", departmentId: "dept-she", name: "Near Miss Reports",                   target: 12,   unit: "reports/yr" },
  { id: "kpi-007", yearCycleId: "yc-2026", departmentId: "dept-hr",  name: "Training Hours per Employee",         target: 40,   unit: "hours" },
  { id: "kpi-008", yearCycleId: "yc-2026", departmentId: "dept-log", name: "Inventory Accuracy",                  target: 99,   unit: "%" },
  { id: "kpi-009", yearCycleId: "yc-2026", departmentId: "dept-mfg", name: "OEE (Overall Equipment Effectiveness)",target: 85,   unit: "%" },
  { id: "kpi-010", yearCycleId: "yc-2026", departmentId: "dept-it",  name: "System Uptime",                       target: 99.9, unit: "%" },
  { id: "kpi-011", yearCycleId: "yc-2025", departmentId: "dept-mkt", name: "Customer Satisfaction Score",        target: 88,   unit: "%" },
  { id: "kpi-012", yearCycleId: "yc-2025", departmentId: "dept-qc",  name: "Defect Rate",                         target: 3,    unit: "%" },
];

const KPI_REPORTS = [
  { id: "kpr-001", kpiId: "kpi-001", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 1,  value: 88,   status: "LATE",    submittedAt: ts("2026-02-12") },
  { id: "kpr-002", kpiId: "kpi-001", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 2,  value: 91,   status: "ON_TIME", submittedAt: ts("2026-03-04") },
  { id: "kpr-003", kpiId: "kpi-001", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 3,  value: 93,   status: "ON_TIME", submittedAt: ts("2026-04-03") },
  { id: "kpr-004", kpiId: "kpi-002", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 1,  value: 94,   status: "ON_TIME", submittedAt: ts("2026-02-04") },
  { id: "kpr-005", kpiId: "kpi-002", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 2,  value: 96,   status: "ON_TIME", submittedAt: ts("2026-03-05") },
  { id: "kpr-006", kpiId: "kpi-002", departmentId: "dept-mkt", yearId: "yc-2026", reportMonth: 3,  value: 92,   status: "ON_TIME", submittedAt: ts("2026-04-04") },
  { id: "kpr-007", kpiId: "kpi-003", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 1,  value: 1.8,  status: "ON_TIME", submittedAt: ts("2026-02-04") },
  { id: "kpr-008", kpiId: "kpi-003", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 2,  value: 2.1,  status: "LATE",    submittedAt: ts("2026-03-08") },
  { id: "kpr-009", kpiId: "kpi-003", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 3,  value: 1.5,  status: "ON_TIME", submittedAt: ts("2026-04-04") },
  { id: "kpr-010", kpiId: "kpi-004", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 1,  value: 97.5, status: "ON_TIME", submittedAt: ts("2026-02-04") },
  { id: "kpr-011", kpiId: "kpi-004", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 2,  value: 98.2, status: "ON_TIME", submittedAt: ts("2026-03-05") },
  { id: "kpr-012", kpiId: "kpi-004", departmentId: "dept-qc",  yearId: "yc-2026", reportMonth: 3,  value: 98.8, status: "ON_TIME", submittedAt: ts("2026-04-04") },
  { id: "kpr-013", kpiId: "kpi-005", departmentId: "dept-she", yearId: "yc-2026", reportMonth: 1,  value: 0,    status: "ON_TIME", submittedAt: ts("2026-02-03") },
  { id: "kpr-014", kpiId: "kpi-005", departmentId: "dept-she", yearId: "yc-2026", reportMonth: 2,  value: 1,    status: "ON_TIME", submittedAt: ts("2026-03-05") },
  { id: "kpr-015", kpiId: "kpi-005", departmentId: "dept-she", yearId: "yc-2026", reportMonth: 3,  value: 0,    status: "ON_TIME", submittedAt: ts("2026-04-02") },
  { id: "kpr-016", kpiId: "kpi-007", departmentId: "dept-hr",  yearId: "yc-2026", reportMonth: 1,  value: 38,   status: "LATE",    submittedAt: ts("2026-02-10") },
  { id: "kpr-017", kpiId: "kpi-007", departmentId: "dept-hr",  yearId: "yc-2026", reportMonth: 2,  value: 42,   status: "ON_TIME", submittedAt: ts("2026-03-04") },
  { id: "kpr-018", kpiId: "kpi-008", departmentId: "dept-log", yearId: "yc-2026", reportMonth: 1,  value: 98.5, status: "ON_TIME", submittedAt: ts("2026-02-04") },
  { id: "kpr-019", kpiId: "kpi-008", departmentId: "dept-log", yearId: "yc-2026", reportMonth: 2,  value: 99.1, status: "ON_TIME", submittedAt: ts("2026-03-05") },
  { id: "kpr-020", kpiId: "kpi-008", departmentId: "dept-log", yearId: "yc-2026", reportMonth: 3,  value: 99.3, status: "ON_TIME", submittedAt: ts("2026-04-04") },
];

const AUDIT_PLANS = [
  { id: "ap-001", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2026-02-15"), status: "COMPLETED",   departmentId: "dept-mkt", auditorId: "usr-002", auditeeId: "usr-004", auditee: { id: "usr-004", name: "Kritsana Boom", department: { id: "dept-mkt", code: "MKT", name: "Marketing" }                        }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [{ id: "cpar-001" }] },
  { id: "ap-002", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2026-03-10"), status: "COMPLETED",   departmentId: "dept-log", auditorId: "usr-003", auditeeId: "usr-005", auditee: { id: "usr-005", name: "Panida Wan",    department: { id: "dept-log", code: "LOG", name: "Logistics" }                          }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [] },
  { id: "ap-003", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2026-04-20"), status: "IN_PROGRESS", departmentId: "dept-hr",  auditorId: "usr-002", auditeeId: "usr-006", auditee: { id: "usr-006", name: "Wichit Dee",    department: { id: "dept-hr",  code: "HR",  name: "Human Resources" }                    }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [{ id: "cpar-002" }] },
  { id: "ap-004", yearCycleId: "yc-2026", auditType: "EXTERNAL", roundNumber: 1, scheduledDate: ts("2026-06-15"), status: "PLANNED",     departmentId: "dept-qc",  auditorId: "usr-003", auditeeId: "usr-002", auditee: { id: "usr-002", name: "Somchai Jaidee", department: { id: "dept-qc",  code: "QC",  name: "Quality Control" }                    }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [] },
  { id: "ap-005", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 2, scheduledDate: ts("2026-08-12"), status: "PLANNED",     departmentId: "dept-she", auditorId: "usr-002", auditeeId: "usr-003", auditee: { id: "usr-003", name: "Nattaya Ploy",   department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment" }     }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
  { id: "ap-006", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2026-05-08"), status: "PLANNED",     departmentId: "dept-it",  auditorId: "usr-003", auditeeId: "usr-009", auditee: { id: "usr-009", name: "Suda Kaew",     department: { id: "dept-it",  code: "IT",  name: "Information Technology" }          }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [] },
  { id: "ap-007", yearCycleId: "yc-2026", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2026-07-22"), status: "PLANNED",     departmentId: "dept-mfg", auditorId: "usr-002", auditeeId: "usr-008", auditee: { id: "usr-008", name: "Thanit Prao",   department: { id: "dept-mfg", code: "MFG", name: "Manufacturing" }                  }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
  { id: "ap-008", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-03-15"), status: "CLOSED",     departmentId: "dept-dcc", auditorId: "usr-002", auditeeId: "usr-001", auditee: { id: "usr-001", name: "Admin QMR",     department: { id: "dept-dcc", code: "DCC", name: "Document Control" }               }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [{ id: "cpar-003" }] },
];

const CPARS = [
  { id: "cpar-001", cparNo: "CPAR-2026-001", auditId: "ap-001", yearCycleId: "yc-2026", title: "Customer Complaint Handling Procedure", description: "Procedure for handling customer complaints is not consistently followed by MKT staff",       status: "PENDING_VERIFICATION", rootCause: "Staff not trained on updated procedure QP-MKT-003 Rev.2",              correctiveAction: "Conducted training session for all MKT staff. Training records updated in FM-HR-002.", verificationResult: null,                                                                                           issuedDate: ts("2026-02-18"), dueDate: ts("2026-04-18"), closedDate: null,              departmentId: "dept-mkt", department: { id: "dept-mkt", code: "MKT", name: "Marketing" } },
  { id: "cpar-002", cparNo: "CPAR-2026-002", auditId: "ap-003", yearCycleId: "yc-2026", title: "Training Records Incomplete",          description: "Several employees missing mandatory ISO 9001 awareness training records for 2025", status: "PLANNING",              rootCause: "Training tracking spreadsheet not updated since Q4 2025 due to system migration", correctiveAction: null,                                                                                             verificationResult: null, issuedDate: ts("2026-04-22"), dueDate: ts("2026-06-22"), closedDate: null,              departmentId: "dept-hr",  department: { id: "dept-hr",  code: "HR",  name: "Human Resources" } },
  { id: "cpar-003", cparNo: "CPAR-2025-005", auditId: "ap-008", yearCycleId: "yc-2025", title: "Document Version Control Issue",       description: "Obsolete documents found in active work area in Document Control department",       status: "CLOSED",               rootCause: "Document retrieval process not enforced during relocation",                 correctiveAction: "Removed all obsolete documents. Implemented document retrieval checklist POL-DCC-002.",  verificationResult: "All obsolete documents removed and confirmed by QMR. Checklist implemented and verified.", issuedDate: ts("2025-09-10"), dueDate: ts("2025-11-10"), closedDate: ts("2025-11-05"), departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" } },
  { id: "cpar-004", cparNo: "CPAR-2026-003", auditId: "ap-001", yearCycleId: "yc-2026", title: "Supplier Evaluation Not Conducted",    description: "Annual supplier evaluation for key MKT suppliers was overdue by 3 months",        status: "ISSUED",               rootCause: null,                                                                       correctiveAction: null,                                                                                             verificationResult: null, issuedDate: ts("2026-03-10"), dueDate: ts("2026-05-10"), closedDate: null,              departmentId: "dept-mkt", department: { id: "dept-mkt", code: "MKT", name: "Marketing" } },
];

const MANAGEMENT_REVIEWS = [
  { id: "mr-001", title: "Q1 2026 Management Review Meeting",    meetingDate: ts("2026-03-28"), status: "COMPLETED", yearCycleId: "yc-2026", agendaUrl: "https://example.com/mr-q1-2026-agenda.pdf",    minutesUrl: "https://example.com/mr-q1-2026-minutes.pdf",    notes: "Reviewed Q1 KPI results, 2 CPAR open items discussed. Audit schedule confirmed. All Q1 objectives met. Next meeting: June 2026." },
  { id: "mr-002", title: "Q2 2026 Management Review Meeting",    meetingDate: ts("2026-06-30"), status: "SCHEDULED", yearCycleId: "yc-2026", agendaUrl: null,                                              minutesUrl: null,                                             notes: null },
  { id: "mr-003", title: "Mid-Year ISO Surveillance Preparation", meetingDate: ts("2026-05-15"), status: "SCHEDULED", yearCycleId: "yc-2026", agendaUrl: null,                                              minutesUrl: null,                                             notes: "Pre-external audit preparation meeting with all department heads." },
  { id: "mr-004", title: "Annual Management Review 2025",         meetingDate: ts("2025-12-10"), status: "COMPLETED", yearCycleId: "yc-2025", agendaUrl: "https://example.com/mr-annual-2025-agenda.pdf", minutesUrl: "https://example.com/mr-annual-2025-minutes.pdf", notes: "Year-end review. All KPIs reviewed. ISO recertification confirmed. Year closed." },
];

const MOCS = [
  { id: "moc-001", mocNo: "MOC-2026-001", title: "New ERP System Implementation",        description: "Management of change for transitioning from legacy ERP to SAP S/4HANA across all departments. Affects all ISO-related processes and document workflows.", status: "ACTION_IN_PROGRESS", requestorId: "usr-001", requestor: { id: "usr-001", name: "Admin QMR"    }, yearCycleId: "yc-2026", createdAt: ts("2026-01-15"), updatedAt: ts("2026-03-01") },
  { id: "moc-002", mocNo: "MOC-2026-002", title: "Warehouse Layout Restructuring",         description: "Reconfiguring warehouse storage zones to improve forklift safety and comply with ISO 45001 aisle width requirements.",                                         status: "PENDING_APPROVAL",   requestorId: "usr-005", requestor: { id: "usr-005", name: "Panida Wan"   }, yearCycleId: "yc-2026", createdAt: ts("2026-02-20"), updatedAt: ts("2026-02-20") },
  { id: "moc-003", mocNo: "MOC-2026-003", title: "ISO 45001 PPE Requirements Update",      description: "Update personal protective equipment specifications based on ISO 45001:2018 clause 8.1.2 operational control requirements.",                                status: "MEETING_SETUP",      requestorId: "usr-003", requestor: { id: "usr-003", name: "Nattaya Ploy" }, yearCycleId: "yc-2026", createdAt: ts("2026-04-05"), updatedAt: ts("2026-04-05") },
  { id: "moc-004", mocNo: "MOC-2026-004", title: "Quality Lab Equipment Calibration Process", description: "New automated calibration tracking system to replace manual records, affecting QP-QC-004.",                                                              status: "CLOSED",             requestorId: "usr-002", requestor: { id: "usr-002", name: "Somchai Jaidee" }, yearCycleId: "yc-2026", createdAt: ts("2026-01-20"), updatedAt: ts("2026-03-15") },
];

const DOCUMENTS = [
  { id: "doc-001",  docNo: "QP-QMS-001",   title: "Quality Management System Manual",              category: "PROCEDURE",        departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" },              ownerId: "usr-001", owner: { id: "usr-001", name: "Admin QMR"     }, revision: "Rev.3", status: "ACTIVE",        issuedDate: ts("2024-01-01"), nextReviewDate: ts("2027-01-01"), fileUrl: "https://example.com/qp-qms-001.pdf",           description: "Defines the scope, structure, and application of the QMS across all departments",              relatedCparId: null,       relatedMocId: null },
  { id: "doc-002",  docNo: "QP-MKT-003",   title: "Customer Complaint Handling Procedure",         category: "PROCEDURE",        departmentId: "dept-mkt", department: { id: "dept-mkt", code: "MKT", name: "Marketing" },                    ownerId: "usr-004", owner: { id: "usr-004", name: "Kritsana Boom" }, revision: "Rev.2", status: "ACTIVE",        issuedDate: ts("2023-06-01"), nextReviewDate: ts("2026-06-01"), fileUrl: null,                                          description: "Process for receiving, investigating, and resolving customer complaints",                       relatedCparId: "cpar-001", relatedMocId: null },
  { id: "doc-003",  docNo: "WI-SHE-005",   title: "Hazardous Material Handling Work Instruction",  category: "WORK_INSTRUCTION", departmentId: "dept-she", department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment" }, ownerId: "usr-003", owner: { id: "usr-003", name: "Nattaya Ploy"  }, revision: "Rev.1", status: "ACTIVE",        issuedDate: ts("2025-03-01"), nextReviewDate: ts("2028-03-01"), fileUrl: "https://example.com/wi-she-005.pdf",            description: "Step-by-step instructions for safely handling, storing, and disposing of hazardous materials", relatedCparId: null,       relatedMocId: null },
  { id: "doc-004",  docNo: "FM-HR-002",    title: "Employee Training Record Form",                 category: "FORM",             departmentId: "dept-hr",  department: { id: "dept-hr",  code: "HR",  name: "Human Resources" },              ownerId: "usr-006", owner: { id: "usr-006", name: "Wichit Dee"    }, revision: "Rev.4", status: "ACTIVE",        issuedDate: ts("2022-01-01"), nextReviewDate: ts("2025-01-01"), fileUrl: null,                                          description: "Form for recording employee training completion, assessment scores, and certification outcomes", relatedCparId: "cpar-002", relatedMocId: null },
  { id: "doc-005",  docNo: "POL-QMS-001",  title: "Quality Policy Statement",                     category: "POLICY",           departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" },              ownerId: "usr-001", owner: { id: "usr-001", name: "Admin QMR"     }, revision: "Rev.2", status: "ACTIVE",        issuedDate: ts("2024-01-01"), nextReviewDate: ts("2027-01-01"), fileUrl: "https://example.com/pol-qms-001.pdf",           description: "Company Quality Policy signed by top management — commitment to customer satisfaction",         relatedCparId: null,       relatedMocId: null },
  { id: "doc-006",  docNo: "POL-SHE-001",  title: "Occupational Health & Safety Policy",          category: "POLICY",           departmentId: "dept-she", department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment" }, ownerId: "usr-003", owner: { id: "usr-003", name: "Nattaya Ploy"  }, revision: "Rev.2", status: "UNDER_REVIEW",  issuedDate: ts("2024-01-01"), nextReviewDate: ts("2027-01-01"), fileUrl: null,                                          description: "Company OH&S Policy per ISO 45001:2018 clause 5.2 — under annual review",                      relatedCparId: null,       relatedMocId: null },
  { id: "doc-007",  docNo: "EXT-ISO-9001", title: "ISO 9001:2015 International Standard",          category: "EXTERNAL",         departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" },              ownerId: "usr-001", owner: { id: "usr-001", name: "Admin QMR"     }, revision: "2015",  status: "ACTIVE",        issuedDate: ts("2015-09-15"), nextReviewDate: ts("2030-01-01"), fileUrl: "https://www.iso.org/standard/62085.html",      description: "International Standard for Quality Management Systems — reference document",                    relatedCparId: null,       relatedMocId: null },
  { id: "doc-008",  docNo: "EXT-ISO-45001",title: "ISO 45001:2018 International Standard",         category: "EXTERNAL",         departmentId: "dept-she", department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment" }, ownerId: "usr-003", owner: { id: "usr-003", name: "Nattaya Ploy"  }, revision: "2018",  status: "ACTIVE",        issuedDate: ts("2018-03-12"), nextReviewDate: ts("2030-01-01"), fileUrl: "https://www.iso.org/standard/63787.html",      description: "International Standard for Occupational Health and Safety Management Systems",                 relatedCparId: null,       relatedMocId: null },
  { id: "doc-009",  docNo: "QP-LOG-002",   title: "Goods Receiving Procedure",                    category: "PROCEDURE",        departmentId: "dept-log", department: { id: "dept-log", code: "LOG", name: "Logistics" },                    ownerId: "usr-005", owner: { id: "usr-005", name: "Panida Wan"    }, revision: "Rev.1", status: "DRAFT",         issuedDate: ts("2026-03-01"), nextReviewDate: ts("2029-03-01"), fileUrl: null,                                          description: "Procedure for receiving, inspecting, and recording incoming goods in the warehouse",            relatedCparId: null,       relatedMocId: "moc-001" },
  { id: "doc-010",  docNo: "WI-QC-003",    title: "Product Inspection Work Instruction",          category: "WORK_INSTRUCTION", departmentId: "dept-qc",  department: { id: "dept-qc",  code: "QC",  name: "Quality Control" },              ownerId: "usr-002", owner: { id: "usr-002", name: "Somchai Jaidee" }, revision: "Rev.2", status: "ACTIVE",        issuedDate: ts("2024-06-01"), nextReviewDate: ts("2027-06-01"), fileUrl: "https://example.com/wi-qc-003.pdf",             description: "Step-by-step final product inspection process including sampling plans",                         relatedCparId: null,       relatedMocId: null },
  { id: "doc-011",  docNo: "FM-SHE-001",   title: "Hazard Identification & Risk Assessment Form", category: "FORM",             departmentId: "dept-she", department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment" }, ownerId: "usr-003", owner: { id: "usr-003", name: "Nattaya Ploy"  }, revision: "Rev.3", status: "ACTIVE",        issuedDate: ts("2023-01-01"), nextReviewDate: ts("2026-01-01"), fileUrl: null,                                          description: "HIRA form for identifying workplace hazards, assessing risk levels, and planning controls",     relatedCparId: null,       relatedMocId: null },
  { id: "doc-012",  docNo: "QP-QC-004",    title: "Equipment Calibration Procedure",              category: "PROCEDURE",        departmentId: "dept-qc",  department: { id: "dept-qc",  code: "QC",  name: "Quality Control" },              ownerId: "usr-002", owner: { id: "usr-002", name: "Somchai Jaidee" }, revision: "Rev.1", status: "UNDER_REVIEW",  issuedDate: ts("2022-09-01"), nextReviewDate: ts("2025-09-01"), fileUrl: null,                                          description: "Calibration schedule and process for all quality lab equipment — under review for automation",  relatedCparId: null,       relatedMocId: "moc-004" },
];

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱 Seeding Firestore → cmg-iso-system/root/...\n");

  console.log("→ Departments");
  for (const d of DEPARTMENTS) await upsert("departments", d.id, d);

  console.log("\n→ Year Cycles");
  for (const y of YEAR_CYCLES) await upsert("yearCycles", y.id, y);

  console.log("\n→ Users");
  for (const u of USERS) await upsert("users", u.id, u);

  console.log("\n→ Auditor Profiles");
  for (const a of AUDITOR_PROFILES) await upsert("auditorProfiles", a.id, a);

  console.log("\n→ KPIs");
  for (const k of KPIS) await upsert("kpis", k.id, k);

  console.log("\n→ KPI Reports");
  for (const r of KPI_REPORTS) await upsert("kpiReports", r.id, r);

  console.log("\n→ Audit Plans");
  for (const a of AUDIT_PLANS) await upsert("auditPlans", a.id, a);

  console.log("\n→ CPARs");
  for (const c of CPARS) await upsert("cpars", c.id, c);

  console.log("\n→ Management Reviews");
  for (const m of MANAGEMENT_REVIEWS) await upsert("managementReviews", m.id, m);

  console.log("\n→ MOCs");
  for (const m of MOCS) await upsert("mocs", m.id, m);

  console.log("\n→ Documents");
  for (const d of DOCUMENTS) await upsert("documents", d.id, d);

  console.log("\n✅ Seed complete! All data written under cmg-iso-system/root/\n");
  process.exit(0);
}

seed().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });
