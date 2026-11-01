import { Link, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LoginForm } from "./components/LoginForm";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { PatientDashboard } from "./components/PatientDashboard";
import { StaffDashboard } from "./components/StaffDashboard";
import { AccountActivation } from "./components/AccountActivation";
import { ShieldCheck } from "lucide-react";

function PublicHome() {
  const [params] = useSearchParams();
  const tabParam = params.get("tab");
  const defaultTab =
    tabParam === "patient"
      ? "patient"
      : tabParam === "hospital_admin"
      ? "hospital_admin"
      : "staff";

  return (
    <div className="auth-page-wrapper">
      <AuthHeader />
      <main className="auth-form-center">
        <LoginForm portal="general" defaultTab={defaultTab} />
      </main>
    </div>
  );
}

function AuthHeader() {
  return (
    <header className="auth-page-header">
      <Link to="/" className="logo brand-logo">
        <img
          src="/xora_logo.png"
          alt="XORA Technologies"
          className="brand-xora-mark"
        />
      </Link>
      <div className="auth-header-right">
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span>Network Online</span>
        </div>
        <Link to="/super-admin/login" className="super-admin-direct-link" title="Super Admin Portal">
          <ShieldCheck size={16} /> Platform Admin
        </Link>
      </div>
    </header>
  );
}

// Hospital Admin Login Page
function HospitalAdminLoginPage() {
  return (
    <div className="auth-page-wrapper">
      <AuthHeader />
      <main className="auth-form-center">
        <LoginForm portal="hospital_admin" />
      </main>
    </div>
  );
}

// Doctors, Staff & Patient Login Page
function GeneralLoginPage() {
  const [params] = useSearchParams();
  const defaultTab = params.get("tab") === "patient" ? "patient" : "staff";

  return (
    <div className="auth-page-wrapper">
      <AuthHeader />
      <main className="auth-form-center">
        <LoginForm portal="general" defaultTab={defaultTab} />
      </main>
    </div>
  );
}

// Dedicated Super Admin Login Page (No hospital selection needed)
function SuperAdminLoginPage() {
  return (
    <div className="auth-page-wrapper super-admin-theme">
      <AuthHeader />
      <main className="auth-form-center">
        <LoginForm portal="super_admin" />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/hospital-admin/login" element={<HospitalAdminLoginPage />} />
        <Route path="/login" element={<GeneralLoginPage />} />
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/activate" element={<AccountActivation />} />

        {/* Protected Role-Based Dashboards */}
        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital-admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["hospital_admin", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["doctor", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient", "super_admin"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={["nurse", "receptionist", "other_staff", "billing_staff", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab/dashboard"
          element={
            <ProtectedRoute allowedRoles={["lab_technician", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pharmacy/dashboard"
          element={
            <ProtectedRoute allowedRoles={["pharmacist", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/dashboard"
          element={
            <ProtectedRoute allowedRoles={["billing_staff", "super_admin"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
