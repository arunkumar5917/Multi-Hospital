import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hospital, LoginResponse } from "../types";
import { API_URL, useAuth } from "../context/AuthContext";
import { PasswordInput } from "./PasswordInput";
import { ForgotPassword } from "./ForgotPassword";
import { BrandShowcasePanel } from "./BrandShowcasePanel";
import {
  Building2,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lock,
  IdCard,
} from "lucide-react";

export type PortalType = "super_admin" | "hospital_admin" | "general";

interface LoginFormProps {
  portal: PortalType;
  defaultTab?: "staff" | "patient";
}

export function LoginForm({ portal, defaultTab = "staff" }: LoginFormProps) {
  const navigate = useNavigate();
  const { selectedHospital, setSelectedHospital, login } = useAuth();

  const [activeTab, setActiveTab] = useState<"staff" | "patient">(defaultTab);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Portal configuration
  const portalMeta = {
    super_admin: {
      title: "Super Admin Platform Access",
      subtitle: "System administrator authentication for network-wide infrastructure oversight.",
      badge: "PLATFORM GOVERNANCE",
      icon: ShieldCheck,
      tone: "super-admin-tone",
      requiresHospital: false,
      identifierLabel: "Super Admin Email",
      identifierPlaceholder: "superadmin@x7medicore.local",
    },
    hospital_admin: {
      title: "Hospital Administrator Portal",
      subtitle: "Management authentication for authorized facility operations.",
      badge: "EXECUTIVE MANAGEMENT",
      icon: Building2,
      tone: "admin-tone",
      requiresHospital: true,
      identifierLabel: "Administrator Email",
      identifierPlaceholder: "hospitaladmin@x7medicore.local",
    },
    general: {
      title: activeTab === "patient" ? "Patient Portal Login" : "Doctors & Clinical Staff Login",
      subtitle:
        activeTab === "patient"
          ? "Access your personal medical records and treatments via Email or GRN."
          : "Secure clinical workspace for doctors, nurses, lab technicians, and staff.",
      badge: activeTab === "patient" ? "PATIENT CARE" : "CLINICAL WORKSPACE",
      icon: activeTab === "patient" ? HeartPulse : Stethoscope,
      tone: activeTab === "patient" ? "patient-tone" : "staff-tone",
      requiresHospital: true,
      identifierLabel: activeTab === "patient" ? "Registered Email or GRN" : "Staff Email Address",
      identifierPlaceholder:
        activeTab === "patient"
          ? "patient@x7medicore.local or XM-GRN-000001"
          : "doctor@x7medicore.local",
    },
  }[portal];

  const IconComponent = portalMeta.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (portalMeta.requiresHospital && !selectedHospital) {
      setError("Please select a hospital facility before signing in.");
      return;
    }

    setLoading(true);

    try {
      const payload: {
        identifier: string;
        password: string;
        portal: string;
        hospital_code?: string;
        remember_me: boolean;
      } = {
        identifier: identifier.trim(),
        password,
        portal,
        remember_me: rememberMe,
      };

      if (portalMeta.requiresHospital && selectedHospital) {
        payload.hospital_code = selectedHospital.code;
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Please verify credentials.");
      }

      const loginData: LoginResponse = data;
      login(loginData, rememberMe);

      // Redirect directly to the authorized role dashboard
      navigate(loginData.dashboard_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="auth-split-wrapper">
        <ForgotPassword
          initialIdentifier={identifier}
          onBackToLogin={() => setShowForgotPassword(false)}
        />
        <BrandShowcasePanel />
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      <div className={`login-box-card ${portalMeta.tone}`}>
      {/* Top Banner for Hospital-bound logins */}
      {portalMeta.requiresHospital && (
        <div className="login-facility-banner">
          <div className="facility-meta">
            <Building2 size={18} />
            {selectedHospital ? (
              <span>
                Facility: <strong>{selectedHospital.name}</strong> ({selectedHospital.code})
              </span>
            ) : (
              <span className="unselected-warning">No hospital facility selected</span>
            )}
          </div>
          <button
            type="button"
            className="change-facility-link"
            onClick={() => navigate("/")}
            title="Return to hospital selection"
          >
            <RefreshCw size={13} /> Change
          </button>
        </div>
      )}

      {/* Header & Icon */}
      <div className="login-card-head">
        <div className="portal-icon-wrapper">
          <IconComponent size={28} />
        </div>
        <div className="badge-pill role-pill">{portalMeta.badge}</div>
        <h2>{portalMeta.title}</h2>
        <p className="login-desc">{portalMeta.subtitle}</p>
      </div>

      {/* Tabs for General Portal (Doctors/Staff vs Patient) */}
      {portal === "general" && (
        <div className="login-tabs-container">
          <button
            type="button"
            className={`tab-btn ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("staff");
              setError("");
            }}
          >
            <Stethoscope size={16} /> Doctors & Staff
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "patient" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("patient");
              setError("");
            }}
          >
            <HeartPulse size={16} /> Patient Portal
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert-message error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="auth-form-body">
        <div className="form-field">
          <label htmlFor="auth-identifier">
            {portalMeta.identifierLabel}
            {activeTab === "patient" && (
              <span className="label-hint"> (Use Email or e.g. XM-GRN-000001)</span>
            )}
          </label>
          <div className="input-icon-wrapper">
            {activeTab === "patient" && identifier.toUpperCase().startsWith("XM-GRN-") ? (
              <IdCard className="input-icon" size={18} />
            ) : (
              <Mail className="input-icon" size={18} />
            )}
            <input
              id="auth-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={portalMeta.identifierPlaceholder}
              required
              autoComplete="username"
              disabled={loading}
              className="form-input with-left-icon"
            />
          </div>
        </div>

        <div className="form-field">
          <div className="label-with-action">
            <label htmlFor="auth-password">Password</label>
            <button
              type="button"
              className="forgot-link-btn"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-row-remember">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            <span>Remember this device (30 days)</span>
          </label>
        </div>

        <button type="submit" className="btn-primary submit-auth-btn" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="spinner" size={18} /> Verifying Credentials…
            </>
          ) : (
            <>
              Sign In to Workspace <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="login-card-foot">
        {portalMeta.requiresHospital ? (
          <Link to="/" className="foot-link">
            ← Back to Hospital Selection
          </Link>
        ) : (
          <Link to="/" className="foot-link">
            ← Return to Public Home
          </Link>
        )}

        <div className="portal-switch-links">
          {portal !== "super_admin" && (
            <Link to="/hospital-admin/login" className="switch-link">
              Admin
            </Link>
          )}
          {portal !== "general" && (
            <Link to="/login" className="switch-link">
              Staff / Patient
            </Link>
          )}
        </div>
      </div>
    </div>
    <BrandShowcasePanel />
  </div>
  );
}

