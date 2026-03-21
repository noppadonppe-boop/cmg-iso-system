import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage            from '@/pages/LoginPage'
import RegisterPage         from '@/pages/RegisterPage'
import PendingApprovalPage  from '@/pages/PendingApprovalPage'
import UserManagementPage   from '@/pages/UserManagementPage'
import DashboardPage        from '@/pages/DashboardPage'
import MasterPlanPage       from '@/pages/MasterPlanPage'
import KpiPage              from '@/pages/KpiPage'
import KpiReportsPage       from '@/pages/KpiReportsPage'
import AuditsPage           from '@/pages/AuditsPage'
import CparPage             from '@/pages/CparPage'
import ManagementReviewPage from '@/pages/ManagementReviewPage'
import MocPage              from '@/pages/MocPage'
import DocumentsPage        from '@/pages/DocumentsPage'
import AuditorsPage         from '@/pages/AuditorsPage'
import DepartmentsPage      from '@/pages/DepartmentsPage'
import YearRolloverPage     from '@/pages/YearRolloverPage'
import ManualPage           from '@/pages/ManualPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending"  element={<PendingApprovalPage />} />

      {/* Protected routes — require approved login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/master-plan"       element={<ProtectedRoute><MasterPlanPage /></ProtectedRoute>} />
      <Route path="/kpi"               element={<ProtectedRoute><KpiPage /></ProtectedRoute>} />
      <Route path="/kpi/reports"       element={<ProtectedRoute><KpiReportsPage /></ProtectedRoute>} />
      <Route path="/audits"            element={<ProtectedRoute><AuditsPage /></ProtectedRoute>} />
      <Route path="/cpar"              element={<ProtectedRoute><CparPage /></ProtectedRoute>} />
      <Route path="/management-review" element={<ProtectedRoute><ManagementReviewPage /></ProtectedRoute>} />
      <Route path="/moc"               element={<ProtectedRoute><MocPage /></ProtectedRoute>} />
      <Route path="/documents"         element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
      <Route path="/auditors"          element={<ProtectedRoute><AuditorsPage /></ProtectedRoute>} />
      <Route path="/departments"       element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/year-rollover"     element={<ProtectedRoute><YearRolloverPage /></ProtectedRoute>} />
      <Route path="/manual"            element={<ProtectedRoute><ManualPage /></ProtectedRoute>} />
      <Route path="/user-management"   element={<ProtectedRoute requireRoles={["MasterAdmin"]}><UserManagementPage /></ProtectedRoute>} />
    </Routes>
  )
}
