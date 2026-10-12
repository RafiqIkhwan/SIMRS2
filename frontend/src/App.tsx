import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PatientsPage } from './pages/patients/PatientsPage';
import { PatientDetailPage } from './pages/patients/PatientDetailPage';
import { RegistrationPage } from './pages/registration/RegistrationPage';
import { AppointmentsPage } from './pages/appointments/AppointmentsPage';
import { MedicalRecordsPage } from './pages/medical-records/MedicalRecordsPage';
import { InpatientPage } from './pages/inpatient/InpatientPage';
import { PharmacyPage } from './pages/pharmacy/PharmacyPage';
import { LaboratoryPage } from './pages/laboratory/LaboratoryPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { DoctorsPage } from './pages/master/DoctorsPage';
import { SchedulesPage } from './pages/master/SchedulesPage';
import { MasterDataPage } from './pages/master/MasterDataPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Protected routes wrapped by AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/medical-records" element={<MedicalRecordsPage />} />
          <Route path="/inpatient" element={<InpatientPage />} />
          <Route path="/pharmacy" element={<PharmacyPage />} />
          <Route path="/laboratory" element={<LaboratoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/master-data" element={<MasterDataPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}