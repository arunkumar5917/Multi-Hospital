import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

export function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    const target = DASHBOARD_PATHS[user.role] || "/login";
    return <Navigate to={target} replace />;
  }

  return <Navigate to="/" replace />;
}

