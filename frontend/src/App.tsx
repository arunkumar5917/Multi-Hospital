import { useState } from "react";
import { Link, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HospitalSelector } from "./components/HospitalSelector";
import { PortalSelector } from "./components/PortalSelector";
import { LoginForm } from "./components/LoginForm";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { PatientDashboard } from "./components/PatientDashboard";
import { StaffDashboard } from "./components/StaffDashboard";
import { Hospital } from "./types";
import { ShieldCheck, Lock, Activity, HeartPulse } from "lucide-react";

function PublicHome() {
  const { selectedHospital, setSelectedHospital, isAuthenticated } = useAuth();
  const [step, setStep] = useState<"select_hospital" | "select_portal">(() =>
    selectedHospital ? "select_portal" : "select_hospital"
  );

  const handleHospitalChosen = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setStep("select_portal");
  };

  const handleChangeHospital = () => {
    setSelectedHospital(null);
    setStep("select_hospital");
  };

  return (
    <div className="public-home-page">
      {/* Navigation Header */}
      <header className="public-nav-header">
        <div className="logo brand-logo">
          <img
            src="/xora_logo.png"
            alt="XORA Technologies"
            className="brand-xora-mark"
          />
        </div>

        <div className="header-right-actions">
          <div className="status-indicator">
            <span className="pulse-dot"></span>
            <span>Network Online</span>
          </div>
          <Link to="/super-admin/login" className="super-admin-direct-link" title="Super Admin Portal">
            <ShieldCheck size={16} /> Platform Admin
          </Link>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="public-content-container">
        {step === "select_hospital" || !selectedHospital ? (
          <HospitalSelector onHospitalSelected={handleHospitalChosen} />
        ) : (
          <PortalSelector hospital={selectedHospital} onChangeHospital={handleChangeHospital} />
        )}
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-content">
          <p>
            <strong>XORA Technologies</strong> &bull; Enterprise Multi-Hospital Healthcare Information System.
          </p>
          <div className="footer-links">
            <span><Lock size={13} /> 256-bit AES / TLS 1.3 Encryption</span>
            <span><Activity size={13} /> Global Patient Identity (GRN)</span>
            <span><HeartPulse size={13} /> Strict HIPAA / Scoped RBAC</span>
          </div>
        </div>
      </footer>
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
            <ProtectedRoute allowedRoles={["nurse", "super_admin"]}>
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
