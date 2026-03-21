/**
 * Seed full 2025 data for all collections — fills the gaps for reference year
 * Run:  npx tsx scripts/seed-2025.ts
 */
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyChOBhPrP-XAaY1sigatrccjzUofZ42dqk",
  authDomain:        "cmg-iso-system.firebaseapp.com",
  projectId:         "cmg-iso-system",
  storageBucket:     "cmg-iso-system.firebasestorage.app",
  messagingSenderId: "467594837441",
  appId:             "1:467594837441:web:1e1e1b418240a987490340",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

function ts(iso: string) { return Timestamp.fromDate(new Date(iso)); }
async function upsert(subcol: string, id: string, data: object) {
  await setDoc(doc(db, "cmg-iso-system", "root", subcol, id), data, { merge: true });
  console.log(`  ✓ ${subcol}/${id}`);
}

// ── 2025 Audit Plans (full year — 2 rounds covering all departments) ──────────
const AUDIT_PLANS_2025 = [
  { id: "ap-2025-01", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-02-12"), status: "CLOSED", departmentId: "dept-mkt", auditorId: "usr-002", auditeeId: "usr-004", auditee: { id: "usr-004", name: "Kritsana Boom",  department: { id: "dept-mkt", code: "MKT", name: "Marketing"                       } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [{ id: "cpar-2025-01" }] },
  { id: "ap-2025-02", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-03-05"), status: "CLOSED", departmentId: "dept-log", auditorId: "usr-003", auditeeId: "usr-005", auditee: { id: "usr-005", name: "Panida Wan",     department: { id: "dept-log", code: "LOG", name: "Logistics"                         } }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [] },
  { id: "ap-2025-03", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-03-15"), status: "CLOSED", departmentId: "dept-dcc", auditorId: "usr-002", auditeeId: "usr-001", auditee: { id: "usr-001", name: "Admin QMR",      department: { id: "dept-dcc", code: "DCC", name: "Document Control"               } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [{ id: "cpar-2025-03" }] },
  { id: "ap-2025-04", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-04-08"), status: "CLOSED", departmentId: "dept-hr",  auditorId: "usr-003", auditeeId: "usr-006", auditee: { id: "usr-006", name: "Wichit Dee",     department: { id: "dept-hr",  code: "HR",  name: "Human Resources"                   } }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [{ id: "cpar-2025-02" }] },
  { id: "ap-2025-05", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-04-22"), status: "CLOSED", departmentId: "dept-qc",  auditorId: "usr-002", auditeeId: "usr-004", auditee: { id: "usr-004", name: "Kritsana Boom",  department: { id: "dept-qc",  code: "QC",  name: "Quality Control"                   } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
  { id: "ap-2025-06", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 1, scheduledDate: ts("2025-05-14"), status: "CLOSED", departmentId: "dept-she", auditorId: "usr-003", auditeeId: "usr-003", auditee: { id: "usr-003", name: "Nattaya Ploy",   department: { id: "dept-she", code: "SHE", name: "Safety Health & Environment"    } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
  { id: "ap-2025-07", yearCycleId: "yc-2025", auditType: "EXTERNAL", roundNumber: 1, scheduledDate: ts("2025-06-20"), status: "CLOSED", departmentId: "dept-dcc", auditorId: "usr-003", auditeeId: "usr-001", auditee: { id: "usr-001", name: "Admin QMR",      department: { id: "dept-dcc", code: "DCC", name: "Document Control"               } }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [{ id: "cpar-2025-04" }] },
  { id: "ap-2025-08", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 2, scheduledDate: ts("2025-08-18"), status: "CLOSED", departmentId: "dept-mkt", auditorId: "usr-003", auditeeId: "usr-004", auditee: { id: "usr-004", name: "Kritsana Boom",  department: { id: "dept-mkt", code: "MKT", name: "Marketing"                       } }, auditor: { id: "usr-003", name: "Nattaya Ploy"   }, cpars: [] },
  { id: "ap-2025-09", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 2, scheduledDate: ts("2025-09-10"), status: "CLOSED", departmentId: "dept-log", auditorId: "usr-002", auditeeId: "usr-005", auditee: { id: "usr-005", name: "Panida Wan",     department: { id: "dept-log", code: "LOG", name: "Logistics"                         } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
  { id: "ap-2025-10", yearCycleId: "yc-2025", auditType: "INTERNAL", roundNumber: 2, scheduledDate: ts("2025-10-05"), status: "CLOSED", departmentId: "dept-hr",  auditorId: "usr-002", auditeeId: "usr-006", auditee: { id: "usr-006", name: "Wichit Dee",     department: { id: "dept-hr",  code: "HR",  name: "Human Resources"                   } }, auditor: { id: "usr-002", name: "Somchai Jaidee" }, cpars: [] },
];

// ── 2025 CPARs ────────────────────────────────────────────────────────────────
const CPARS_2025 = [
  { id: "cpar-2025-01", cparNo: "CPAR-2025-001", auditId: "ap-2025-01", yearCycleId: "yc-2025", title: "Marketing Promo Material Not Controlled",   description: "Promotional materials found in field without version control or approved stamps",          status: "CLOSED",  rootCause: "No document control process for marketing collateral",          correctiveAction: "Updated QP-MKT-001 to include promo material control. Training completed.", verificationResult: "All promo materials now carry approval stamp. Verified during round 2 audit.", issuedDate: ts("2025-02-16"), dueDate: ts("2025-04-16"), closedDate: ts("2025-04-10"), departmentId: "dept-mkt", department: { id: "dept-mkt", code: "MKT", name: "Marketing"        } },
  { id: "cpar-2025-02", cparNo: "CPAR-2025-002", auditId: "ap-2025-04", yearCycleId: "yc-2025", title: "Incomplete New Employee Onboarding Records", description: "3 employees hired in Q4 2024 missing signed induction checklist",                         status: "CLOSED",  rootCause: "HR onboarding checklist not updated after org restructure in 2024", correctiveAction: "Updated FM-HR-001 onboarding checklist. Backdated records signed and filed.", verificationResult: "All 3 records completed. New process in place for future hires.",            issuedDate: ts("2025-04-12"), dueDate: ts("2025-06-12"), closedDate: ts("2025-06-01"), departmentId: "dept-hr",  department: { id: "dept-hr",  code: "HR",  name: "Human Resources" } },
  { id: "cpar-2025-03", cparNo: "CPAR-2025-003", auditId: "ap-2025-03", yearCycleId: "yc-2025", title: "Document Version Control Issue",             description: "Obsolete documents found in active work area in Document Control department",             status: "CLOSED",  rootCause: "Document retrieval process not enforced during office relocation",  correctiveAction: "Removed all obsolete documents. Implemented retrieval checklist.",          verificationResult: "All obsolete documents removed and confirmed by QMR. Checklist in use.",    issuedDate: ts("2025-03-19"), dueDate: ts("2025-05-19"), closedDate: ts("2025-05-10"), departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" } },
  { id: "cpar-2025-04", cparNo: "CPAR-2025-004", auditId: "ap-2025-07", yearCycleId: "yc-2025", title: "Calibration Records Missing for 2 Devices",  description: "2 measuring instruments in QC lab had expired calibration certificates at time of external audit", status: "CLOSED", rootCause: "Calibration schedule not tracked in centralised system", correctiveAction: "Created calibration tracker in SharePoint. Devices re-calibrated.", verificationResult: "All devices calibrated and tracker verified by external auditor.",           issuedDate: ts("2025-06-24"), dueDate: ts("2025-08-24"), closedDate: ts("2025-08-15"), departmentId: "dept-qc",  department: { id: "dept-qc",  code: "QC",  name: "Quality Control" } },
  { id: "cpar-2025-05", cparNo: "CPAR-2025-005", auditId: "ap-2025-03", yearCycleId: "yc-2025", title: "Supplier Approval List Outdated",             description: "Approved supplier list not reviewed in 18 months — 3 suppliers no longer active",          status: "CLOSED",  rootCause: "No annual review trigger in procurement process",                  correctiveAction: "Updated approved supplier list. Set annual review reminder.",               verificationResult: "List updated and review calendar confirmed.",                               issuedDate: ts("2025-09-10"), dueDate: ts("2025-11-10"), closedDate: ts("2025-11-05"), departmentId: "dept-dcc", department: { id: "dept-dcc", code: "DCC", name: "Document Control" } },
];

// ── 2025 KPIs (all departments) ───────────────────────────────────────────────
const KPIS_2025 = [
  { id: "kpi-2025-01", yearCycleId: "yc-2025", departmentId: "dept-mkt", name: "Customer Satisfaction Score",         target: 88,   unit: "%" },
  { id: "kpi-2025-02", yearCycleId: "yc-2025", departmentId: "dept-mkt", name: "On-time Delivery Rate",               target: 93,   unit: "%" },
  { id: "kpi-2025-03", yearCycleId: "yc-2025", departmentId: "dept-qc",  name: "Defect Rate",                         target: 3,    unit: "%" },
  { id: "kpi-2025-04", yearCycleId: "yc-2025", departmentId: "dept-qc",  name: "First Pass Yield",                    target: 96,   unit: "%" },
  { id: "kpi-2025-05", yearCycleId: "yc-2025", departmentId: "dept-she", name: "Safety Incident Rate",                target: 0,    unit: "incidents" },
  { id: "kpi-2025-06", yearCycleId: "yc-2025", departmentId: "dept-she", name: "Near Miss Reports",                   target: 10,   unit: "reports/yr" },
  { id: "kpi-2025-07", yearCycleId: "yc-2025", departmentId: "dept-hr",  name: "Training Hours per Employee",         target: 36,   unit: "hours" },
  { id: "kpi-2025-08", yearCycleId: "yc-2025", departmentId: "dept-log", name: "Inventory Accuracy",                  target: 98,   unit: "%" },
  { id: "kpi-2025-09", yearCycleId: "yc-2025", departmentId: "dept-mfg", name: "OEE (Overall Equipment Effectiveness)", target: 82,  unit: "%" },
  { id: "kpi-2025-10", yearCycleId: "yc-2025", departmentId: "dept-it",  name: "System Uptime",                       target: 99.5, unit: "%" },
];

// ── 2025 KPI Reports (full year Jan–Dec for each KPI) ────────────────────────
const KPIR_2025 = [
  // MKT — Customer Satisfaction
  { id: "kpr-2025-001", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 1,  value: 85,   status: "LATE",    submittedAt: ts("2025-02-10") },
  { id: "kpr-2025-002", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 2,  value: 87,   status: "ON_TIME", submittedAt: ts("2025-03-04") },
  { id: "kpr-2025-003", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 3,  value: 89,   status: "ON_TIME", submittedAt: ts("2025-04-03") },
  { id: "kpr-2025-004", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 4,  value: 90,   status: "ON_TIME", submittedAt: ts("2025-05-04") },
  { id: "kpr-2025-005", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 5,  value: 88,   status: "ON_TIME", submittedAt: ts("2025-06-04") },
  { id: "kpr-2025-006", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 6,  value: 91,   status: "ON_TIME", submittedAt: ts("2025-07-03") },
  { id: "kpr-2025-007", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 7,  value: 92,   status: "ON_TIME", submittedAt: ts("2025-08-05") },
  { id: "kpr-2025-008", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 8,  value: 90,   status: "ON_TIME", submittedAt: ts("2025-09-04") },
  { id: "kpr-2025-009", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 9,  value: 93,   status: "ON_TIME", submittedAt: ts("2025-10-03") },
  { id: "kpr-2025-010", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 10, value: 91,   status: "LATE",    submittedAt: ts("2025-11-08") },
  { id: "kpr-2025-011", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 11, value: 89,   status: "ON_TIME", submittedAt: ts("2025-12-04") },
  { id: "kpr-2025-012", kpiId: "kpi-2025-01", departmentId: "dept-mkt", yearId: "yc-2025", reportMonth: 12, value: 92,   status: "ON_TIME", submittedAt: ts("2026-01-05") },
  // QC — Defect Rate
  { id: "kpr-2025-013", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 1,  value: 3.2,  status: "LATE",    submittedAt: ts("2025-02-09") },
  { id: "kpr-2025-014", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 2,  value: 2.9,  status: "ON_TIME", submittedAt: ts("2025-03-05") },
  { id: "kpr-2025-015", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 3,  value: 2.7,  status: "ON_TIME", submittedAt: ts("2025-04-04") },
  { id: "kpr-2025-016", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 4,  value: 2.5,  status: "ON_TIME", submittedAt: ts("2025-05-04") },
  { id: "kpr-2025-017", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 5,  value: 2.3,  status: "ON_TIME", submittedAt: ts("2025-06-03") },
  { id: "kpr-2025-018", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 6,  value: 2.1,  status: "ON_TIME", submittedAt: ts("2025-07-04") },
  { id: "kpr-2025-019", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 7,  value: 1.9,  status: "ON_TIME", submittedAt: ts("2025-08-04") },
  { id: "kpr-2025-020", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 8,  value: 2.0,  status: "ON_TIME", submittedAt: ts("2025-09-03") },
  { id: "kpr-2025-021", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 9,  value: 1.8,  status: "ON_TIME", submittedAt: ts("2025-10-04") },
  { id: "kpr-2025-022", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 10, value: 1.7,  status: "ON_TIME", submittedAt: ts("2025-11-04") },
  { id: "kpr-2025-023", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 11, value: 2.2,  status: "LATE",    submittedAt: ts("2025-12-09") },
  { id: "kpr-2025-024", kpiId: "kpi-2025-03", departmentId: "dept-qc",  yearId: "yc-2025", reportMonth: 12, value: 1.9,  status: "ON_TIME", submittedAt: ts("2026-01-04") },
  // SHE — Safety Incidents
  { id: "kpr-2025-025", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 1,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-02-04") },
  { id: "kpr-2025-026", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 2,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-03-04") },
  { id: "kpr-2025-027", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 3,  value: 1,    status: "ON_TIME", submittedAt: ts("2025-04-03") },
  { id: "kpr-2025-028", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 4,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-05-04") },
  { id: "kpr-2025-029", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 5,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-06-04") },
  { id: "kpr-2025-030", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 6,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-07-04") },
  { id: "kpr-2025-031", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 7,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-08-04") },
  { id: "kpr-2025-032", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 8,  value: 0,    status: "ON_TIME", submittedAt: ts("2025-09-03") },
  { id: "kpr-2025-033", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 9,  value: 1,    status: "ON_TIME", submittedAt: ts("2025-10-04") },
  { id: "kpr-2025-034", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 10, value: 0,    status: "ON_TIME", submittedAt: ts("2025-11-04") },
  { id: "kpr-2025-035", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 11, value: 0,    status: "ON_TIME", submittedAt: ts("2025-12-04") },
  { id: "kpr-2025-036", kpiId: "kpi-2025-05", departmentId: "dept-she", yearId: "yc-2025", reportMonth: 12, value: 0,    status: "ON_TIME", submittedAt: ts("2026-01-04") },
  // HR — Training Hours
  { id: "kpr-2025-037", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 1,  value: 32,   status: "LATE",    submittedAt: ts("2025-02-11") },
  { id: "kpr-2025-038", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 2,  value: 35,   status: "ON_TIME", submittedAt: ts("2025-03-05") },
  { id: "kpr-2025-039", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 3,  value: 38,   status: "ON_TIME", submittedAt: ts("2025-04-04") },
  { id: "kpr-2025-040", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 4,  value: 40,   status: "ON_TIME", submittedAt: ts("2025-05-03") },
  { id: "kpr-2025-041", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 5,  value: 37,   status: "ON_TIME", submittedAt: ts("2025-06-04") },
  { id: "kpr-2025-042", kpiId: "kpi-2025-07", departmentId: "dept-hr",  yearId: "yc-2025", reportMonth: 6,  value: 42,   status: "ON_TIME", submittedAt: ts("2025-07-04") },
  // LOG — Inventory Accuracy
  { id: "kpr-2025-043", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 1,  value: 97.2, status: "ON_TIME", submittedAt: ts("2025-02-04") },
  { id: "kpr-2025-044", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 2,  value: 97.8, status: "ON_TIME", submittedAt: ts("2025-03-04") },
  { id: "kpr-2025-045", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 3,  value: 98.1, status: "ON_TIME", submittedAt: ts("2025-04-03") },
  { id: "kpr-2025-046", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 4,  value: 98.5, status: "ON_TIME", submittedAt: ts("2025-05-04") },
  { id: "kpr-2025-047", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 5,  value: 98.3, status: "ON_TIME", submittedAt: ts("2025-06-05") },
  { id: "kpr-2025-048", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 6,  value: 98.9, status: "ON_TIME", submittedAt: ts("2025-07-04") },
  { id: "kpr-2025-049", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 7,  value: 99.0, status: "ON_TIME", submittedAt: ts("2025-08-04") },
  { id: "kpr-2025-050", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 8,  value: 98.7, status: "ON_TIME", submittedAt: ts("2025-09-04") },
  { id: "kpr-2025-051", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 9,  value: 99.1, status: "ON_TIME", submittedAt: ts("2025-10-04") },
  { id: "kpr-2025-052", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 10, value: 99.2, status: "ON_TIME", submittedAt: ts("2025-11-04") },
  { id: "kpr-2025-053", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 11, value: 98.8, status: "LATE",    submittedAt: ts("2025-12-08") },
  { id: "kpr-2025-054", kpiId: "kpi-2025-08", departmentId: "dept-log", yearId: "yc-2025", reportMonth: 12, value: 99.3, status: "ON_TIME", submittedAt: ts("2026-01-05") },
];

// ── 2025 MOCs ─────────────────────────────────────────────────────────────────
const MOCS_2025 = [
  { id: "moc-2025-01", mocNo: "MOC-2025-001", title: "Office Layout Redesign Q1",          description: "Reconfiguring open-plan office to improve collaboration and reduce noise distraction affecting productivity", status: "CLOSED",             requestorId: "usr-006", requestor: { id: "usr-006", name: "Wichit Dee"     }, yearCycleId: "yc-2025", createdAt: ts("2025-01-10"), updatedAt: ts("2025-03-20") },
  { id: "moc-2025-02", mocNo: "MOC-2025-002", title: "Forklift Safety Barrier Installation", description: "Install physical safety barriers in warehouse aisles to comply with ISO 45001 requirements and prevent forklift incidents", status: "CLOSED", requestorId: "usr-005", requestor: { id: "usr-005", name: "Panida Wan"     }, yearCycleId: "yc-2025", createdAt: ts("2025-02-05"), updatedAt: ts("2025-05-15") },
  { id: "moc-2025-03", mocNo: "MOC-2025-003", title: "Quality Lab Upgrade",                 description: "Replacement of 3 legacy testing instruments with new calibrated equipment; requires re-validation of test procedures", status: "CLOSED",   requestorId: "usr-002", requestor: { id: "usr-002", name: "Somchai Jaidee" }, yearCycleId: "yc-2025", createdAt: ts("2025-03-01"), updatedAt: ts("2025-06-30") },
  { id: "moc-2025-04", mocNo: "MOC-2025-004", title: "IT Security Policy Update",            description: "Update IT security policy to align with new ISO 27001 requirements and recent cybersecurity incident response findings", status: "CLOSED",  requestorId: "usr-007", requestor: { id: "usr-007", name: "Maneerat Sai"   }, yearCycleId: "yc-2025", createdAt: ts("2025-07-01"), updatedAt: ts("2025-09-20") },
  { id: "moc-2025-05", mocNo: "MOC-2025-005", title: "Chemical Storage Relocation",          description: "Relocate chemical storage area to dedicated zone per SHE risk assessment findings from external audit round",          status: "CLOSED",   requestorId: "usr-003", requestor: { id: "usr-003", name: "Nattaya Ploy"   }, yearCycleId: "yc-2025", createdAt: ts("2025-08-12"), updatedAt: ts("2025-11-30") },
];

// ── 2025 Management Reviews (full year — quarterly) ──────────────────────────
const MR_2025 = [
  { id: "mr-2025-01", title: "Q1 2025 Management Review Meeting",    meetingDate: ts("2025-03-28"), status: "COMPLETED", yearCycleId: "yc-2025", agendaUrl: "https://example.com/mr-q1-2025-agenda.pdf",    minutesUrl: "https://example.com/mr-q1-2025-minutes.pdf",    notes: "Q1 KPI targets reviewed. 2 CPARs opened. Audit schedule confirmed. New ERP project discussed." },
  { id: "mr-2025-02", title: "Q2 2025 Management Review Meeting",    meetingDate: ts("2025-06-27"), status: "COMPLETED", yearCycleId: "yc-2025", agendaUrl: "https://example.com/mr-q2-2025-agenda.pdf",    minutesUrl: "https://example.com/mr-q2-2025-minutes.pdf",    notes: "External audit preparation reviewed. 1 CPAR closed. MOC-2025-002 progress confirmed." },
  { id: "mr-2025-03", title: "Q3 2025 Management Review Meeting",    meetingDate: ts("2025-09-26"), status: "COMPLETED", yearCycleId: "yc-2025", agendaUrl: "https://example.com/mr-q3-2025-agenda.pdf",    minutesUrl: "https://example.com/mr-q3-2025-minutes.pdf",    notes: "Mid-year KPI performance discussed. All Q2 CPARs closed. IT security MOC approved." },
  { id: "mr-2025-04", title: "Annual Management Review 2025",         meetingDate: ts("2025-12-10"), status: "COMPLETED", yearCycleId: "yc-2025", agendaUrl: "https://example.com/mr-annual-2025-agenda.pdf", minutesUrl: "https://example.com/mr-annual-2025-minutes.pdf", notes: "Year-end review. All KPIs reviewed. 5 CPARs all closed. ISO recertification confirmed for 2026. Year officially closed." },
];

async function seed2025() {
  console.log("\n🌱 Seeding 2025 full data → cmg-iso-system/root/...\n");

  console.log("→ Audit Plans 2025 (10 records)");
  for (const a of AUDIT_PLANS_2025) await upsert("auditPlans", a.id, a);

  console.log("\n→ CPARs 2025 (5 records)");
  for (const c of CPARS_2025) await upsert("cpars", c.id, c);

  console.log("\n→ KPIs 2025 (10 records — all departments)");
  for (const k of KPIS_2025) await upsert("kpis", k.id, k);

  console.log("\n→ KPI Reports 2025 (54 records — full year)");
  for (const r of KPIR_2025) await upsert("kpiReports", r.id, r);

  console.log("\n→ MOCs 2025 (5 records)");
  for (const m of MOCS_2025) await upsert("mocs", m.id, m);

  console.log("\n→ Management Reviews 2025 (4 records — quarterly + annual)");
  for (const m of MR_2025) await upsert("managementReviews", m.id, m);

  console.log("\n✅ 2025 seed complete! All collections populated.\n");
  process.exit(0);
}

seed2025().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });
