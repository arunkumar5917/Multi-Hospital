import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const DASHBOARD_PATHS: Record<string, string> = {
  super_admin: "/super-admin/dashboard",
  hospital_admin: "/hospital-admin/dashboard",
  doctor: "/doctor/dashboard",
  patient: "/patient/dashboard",
  nurse: "/staff/dashboard",
  lab_technician: "/lab/dashboard",
  pharmacist: "/pharmacy/dashboard",
  billing_staff: "/billing/dashboard",
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <Loader2 className="spinner" size={36} />
        <p>Verifying secure session…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const userDashboard = DASHBOARD_PATHS[user.role] || "/login";
    return <Navigate to={userDashboard} replace />;
  }

  return <>{children}</>;
}

