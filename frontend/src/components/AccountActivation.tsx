import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Lock, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";

export function AccountActivation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    valid: boolean;
    email: string;
    full_name: string;
    role: string;
    hospital_code: string;
    hospital_name: string;
    department?: string | null;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No activation token provided. Please check the link sent to your email.");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/v1/invitations/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Invalid or expired invitation token.");
        }
        setInvitation(data);
      } catch (err: any) {
        setError(err.message || "Failed to verify invitation link.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/invitations/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to activate account.");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Activation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <header className="auth-page-header">
        <Link to="/" className="logo brand-logo">
          <img src="/xora_logo.png" alt="XORA Technologies" className="brand-xora-mark" />
        </Link>
        <div className="auth-header-right">
          <div className="status-indicator">
            <span className="pulse-dot"></span>
            <span>Network Online</span>
          </div>
        </div>
      </header>

      <main className="auth-form-center">
        <div className="login-card enterprise-card" style={{ maxWidth: 520, margin: "2rem auto" }}>
          <div className="login-header" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                marginBottom: "1rem",
                boxShadow: "0 8px 16px rgba(14, 165, 233, 0.25)",
              }}
            >
              <UserCheck size={28} />
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Staff Account Activation
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.35rem" }}>
              X7 MediCore Centralized Hospital Network
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#64748b" }}>
              Verifying your invitation link...
            </div>
          ) : error && !invitation ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.75rem 1rem",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: "1.5rem",
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <div>
                <Link to="/" className="btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
                  Return to Portal Login
                </Link>
              </div>
            </div>
          ) : success ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                Account Successfully Activated!
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                Your password has been securely configured. You can now access your staff portal and clinical dashboard.
              </p>
              <Link
                to={`/login`}
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textDecoration: "none",
                  padding: "0.75rem 1.5rem",
                  width: "100%",
                }}
              >
                <span>Sign In to Healthcare Facility</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div>
              {invitation && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                      Assigned Facility
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background: "#e0f2fe",
                        color: "#0369a1",
                        padding: "2px 8px",
                        borderRadius: 9999,
                      }}
                    >
                      {invitation.hospital_code}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "1rem", marginBottom: 8 }}>
                    {invitation.hospital_name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div>
                      <strong>Staff Name:</strong> {invitation.full_name}
                    </div>
                    <div>
                      <strong>Role:</strong> {invitation.role.replace("_", " ").toUpperCase()}
                    </div>
                    {invitation.department && (
                      <div style={{ gridColumn: "span 2" }}>
                        <strong>Department:</strong> {invitation.department}
                      </div>
                    )}
                    <div style={{ gridColumn: "span 2" }}>
                      <strong>Login Email:</strong> {invitation.email}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.75rem",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    marginBottom: "1rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Create Secure Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.9rem",
                      }}
                    />
                    <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.9rem",
                      }}
                    />
                    <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    padding: "0.75rem",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    marginTop: "0.5rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Activating Account..." : "Activate Account & Save Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
