import React, { useState, useEffect, useRef } from "react";
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
  Lock,
  IdCard,
  Search,
  MapPin,
  Check,
  X,
} from "lucide-react";

export type PortalType = "super_admin" | "hospital_admin" | "general";

interface LoginFormProps {
  portal: PortalType;
  defaultTab?: "staff" | "patient" | "hospital_admin";
}

export function LoginForm({ portal, defaultTab = "staff" }: LoginFormProps) {
  const navigate = useNavigate();
  const { selectedHospital, setSelectedHospital, login } = useAuth();

  const [activeTab, setActiveTab] = useState<"staff" | "patient" | "hospital_admin">(defaultTab);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Hospital directory search & selection states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [isHospitalDropdownOpen, setIsHospitalDropdownOpen] = useState(false);
  const hospitalDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch active hospitals on mount
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/api/v1/hospitals`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load hospitals");
        return res.json();
      })
      .then((data: Hospital[]) => {
        if (!isMounted) return;
        const active = (Array.isArray(data) ? data : []).filter((h) => h.is_active);
        setHospitals(active);

        // Pre-select default hospital if none currently active
        if (!selectedHospital && active.length > 0) {
          setSelectedHospital(active[0]);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hospitalDropdownRef.current && !hospitalDropdownRef.current.contains(e.target as Node)) {
        setIsHospitalDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered hospitals by code, name, or location
  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.location.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  const handleSelectHospital = (h: Hospital) => {
    setSelectedHospital(h);
    setHospitalSearch("");
    setIsHospitalDropdownOpen(false);
    setError("");
  };

  // Portal configuration metadata
  const getPortalMeta = () => {
    if (portal === "super_admin") {
      return {
        title: "Super Admin Platform Access",
        subtitle: "System administrator authentication for network-wide infrastructure oversight.",
        badge: "PLATFORM GOVERNANCE",
        icon: ShieldCheck,
        tone: "super-admin-tone",
        requiresHospital: false,
        identifierLabel: "Super Admin Email",
        identifierPlaceholder: "superadmin@x7medicore.local",
      };
    }

    if (portal === "hospital_admin" || activeTab === "hospital_admin") {
      return {
        title: "Hospital Administrator Portal",
        subtitle: "Executive management authentication for authorized facility operations.",
        badge: "EXECUTIVE MANAGEMENT",
        icon: Building2,
        tone: "admin-tone",
        requiresHospital: true,
        identifierLabel: "Administrator Email",
        identifierPlaceholder: "hospitaladmin@x7medicore.local",
      };
    }

    if (activeTab === "patient") {
      return {
        title: "Patient Portal Login",
        subtitle: "Access your centralized medical records, prescriptions, and health history via Email or GRN.",
        badge: "PATIENT CARE",
        icon: HeartPulse,
        tone: "patient-tone",
        requiresHospital: true,
        identifierLabel: "Registered Email or GRN",
        identifierPlaceholder: "patient@x7medicore.local or XM-GRN-000001",
      };
    }

    return {
      title: "Doctors & Healthcare Staff Login",
      subtitle: "Secure clinical workspace for doctors, nurses, lab technicians, and pharmacists.",
      badge: "CLINICAL WORKSPACE",
      icon: Stethoscope,
      tone: "staff-tone",
      requiresHospital: true,
      identifierLabel: "Staff Email Address",
      identifierPlaceholder: "doctor@x7medicore.local",
    };
  };

  const portalMeta = getPortalMeta();
  const IconComponent = portalMeta.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (portalMeta.requiresHospital && !selectedHospital) {
      setError("Please search and select your hospital facility (e.g. HOSP-001) before signing in.");
      setIsHospitalDropdownOpen(true);
      return;
    }

    setLoading(true);

    try {
      const effectivePortal =
        portal === "super_admin"
          ? "super_admin"
          : portal === "hospital_admin"
          ? "hospital_admin"
          : activeTab;

      const payload: {
        identifier: string;
        password: string;
        portal: string;
        hospital_code?: string;
        remember_me: boolean;
      } = {
        identifier: identifier.trim(),
        password,
        portal: effectivePortal,
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
        {/* Header & Icon */}
        <div className="login-card-head">
          <div className="portal-icon-wrapper">
            <IconComponent size={28} />
          </div>
          <div className="badge-pill role-pill">{portalMeta.badge}</div>
          <h2>{portalMeta.title}</h2>
          <p className="login-desc">{portalMeta.subtitle}</p>
        </div>

        {/* Tabs for Portal Selection (Doctors & Staff, Patient, Hospital Admin) */}
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
            <button
              type="button"
              className={`tab-btn ${activeTab === "hospital_admin" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("hospital_admin");
                setError("");
              }}
            >
              <Building2 size={16} /> Hospital Admin
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
          {/* Integrated Hospital Search & Code Selection */}
          {portalMeta.requiresHospital && (
            <div className="form-field hospital-search-form-group" ref={hospitalDropdownRef}>
              <div className="label-with-action">
                <label htmlFor="hospital-search-input">
                  Healthcare Facility / Hospital Code <span className="label-hint">(e.g. HOSP-001)</span>
                </label>
                {selectedHospital && (
                  <button
                    type="button"
                    className="clear-facility-btn"
                    onClick={() => {
                      setSelectedHospital(null);
                      setHospitalSearch("");
                      setIsHospitalDropdownOpen(true);
                    }}
                  >
                    Change Facility
                  </button>
                )}
              </div>

              {selectedHospital && !isHospitalDropdownOpen ? (
                <div
                  className="selected-hospital-card"
                  onClick={() => setIsHospitalDropdownOpen(true)}
                  title="Click to search or change hospital code"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsHospitalDropdownOpen(true)}
                >
                  <div className="selected-hospital-main">
                    <div className="hospital-code-badge">{selectedHospital.code}</div>
                    <div className="hospital-text">
                      <strong>{selectedHospital.name}</strong>
                      <span className="hospital-loc">
                        <MapPin size={12} /> {selectedHospital.location}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="search-switch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHospitalDropdownOpen(true);
                    }}
                  >
                    <Search size={13} /> Search / Switch
                  </button>
                </div>
              ) : (
                <div className="hospital-search-input-box">
                  <div className="input-icon-wrapper">
                    <Search className="input-icon" size={18} />
                    <input
                      id="hospital-search-input"
                      type="text"
                      value={hospitalSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHospitalSearch(val);
                        setIsHospitalDropdownOpen(true);
                        // If exact code matches (e.g. HOSP-001 or GANGA), auto-select it
                        const exact = hospitals.find(
                          (h) => h.code.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (exact) {
                          setSelectedHospital(exact);
                        }
                      }}
                      onFocus={() => setIsHospitalDropdownOpen(true)}
                      placeholder="Search hospital name, city, or code (e.g. HOSP-001, GANGA)..."
                      className="form-input with-left-icon with-right-icon"
                      autoComplete="off"
                    />
                    {hospitalSearch && (
                      <button
                        type="button"
                        className="clear-search-x-btn"
                        onClick={() => {
                          setHospitalSearch("");
                          setIsHospitalDropdownOpen(true);
                        }}
                        title="Clear search"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {isHospitalDropdownOpen && (
                    <div className="hospital-search-dropdown-menu">
                      <div className="dropdown-title-hint">
                        <Building2 size={13} /> Select facility or search code (e.g. HOSP-001):
                      </div>
                      {filteredHospitals.length === 0 ? (
                        <div className="dropdown-empty-state">
                          No active hospital matches &ldquo;{hospitalSearch}&rdquo;.
                          <small>Try hospital code e.g. HOSP-001, GANGA, or HOSP-002</small>
                        </div>
                      ) : (
                        <div className="dropdown-scroll-list">
                          {filteredHospitals.map((h) => {
                            const isSelected = selectedHospital?.code === h.code;
                            return (
                              <div
                                key={h.code}
                                className={`hospital-dropdown-item ${isSelected ? "active" : ""}`}
                                onClick={() => handleSelectHospital(h)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelectHospital(h)}
                              >
                                <div className="item-code-chip">{h.code}</div>
                                <div className="item-body">
                                  <div className="item-name">{h.name}</div>
                                  <div className="item-loc">
                                    <MapPin size={11} /> {h.location}
                                  </div>
                                </div>
                                {isSelected ? (
                                  <Check className="item-selected-check" size={16} />
                                ) : (
                                  <span className="item-select-hint">Select</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Identifier Field */}
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

          {/* Password Field */}
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
          <div className="portal-switch-links" style={{ width: "100%", justifyContent: "space-between" }}>
            {portal !== "super_admin" ? (
              <Link to="/super-admin/login" className="switch-link">
                <ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Platform Super Admin Access
              </Link>
            ) : (
              <Link to="/login" className="switch-link">
                ← Return to Healthcare Facility Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Right-Side Pure Clean XORA Technologies Logo */}
      <BrandShowcasePanel />
    </div>
  );
}
