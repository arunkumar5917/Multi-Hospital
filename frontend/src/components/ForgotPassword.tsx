import React, { useState } from "react";
import { API_URL } from "../context/AuthContext";
import { PasswordInput } from "./PasswordInput";
import { AlertCircle, CheckCircle2, KeyRound, Mail, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  initialIdentifier?: string;
}

export function ForgotPassword({ onBackToLogin, initialIdentifier = "" }: ForgotPasswordProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatedDevToken, setGeneratedDevToken] = useState<string | null>(null);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to process password reset request.");
      }

      setSuccess("Reset instructions issued. If your account is registered, use the token below to update your password.");
      if (data.reset_token) {
        setGeneratedDevToken(data.reset_token);
        setToken(data.reset_token);
      }
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed.");
      }

      setSuccess("Your password has been successfully updated! You can now sign in.");
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset token is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-card">
      <div className="form-brand-header">
        <div className="portal-icon-wrapper reset-tone">
          <KeyRound size={26} />
        </div>
        <h2>Account Recovery</h2>
        <p className="form-subtext">
          {step === "request"
            ? "Enter your registered email address or Global Registration Number (GRN) to receive a secure reset token."
            : "Enter your secure reset token and create a new password."}
        </p>
      </div>

      {error && (
        <div className="alert-message error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-message success">
          <CheckCircle2 size={17} />
          <span>{success}</span>
        </div>
      )}

      {generatedDevToken && step === "reset" && (
        <div className="token-preview-banner">
          <ShieldCheck size={16} />
          <div>
            <strong>Single-Use Security Token (Pre-filled):</strong>
            <code className="token-code">{generatedDevToken}</code>
          </div>
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequestToken} className="auth-form-body">
          <div className="form-field">
            <label htmlFor="recovery-id">Registered Email or GRN</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="recovery-id"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. doctor@x7medicore.local or XM-GRN-000001"
                required
                className="form-input with-left-icon"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary submit-auth-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} /> Issuing Token…
              </>
            ) : (
              "Generate Recovery Token"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="auth-form-body">
          <div className="form-field">
            <label htmlFor="reset-token">Security Token</label>
            <input
              id="reset-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste security reset token"
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="new-password">New Password</label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter at least 6 characters"
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <button type="submit" className="btn-primary submit-auth-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} /> Updating Password…
              </>
            ) : (
              "Confirm & Update Password"
            )}
          </button>
        </form>
      )}

      <div className="form-bottom-links">
        <button type="button" className="text-link-btn" onClick={onBackToLogin}>
          <ArrowLeft size={16} /> Back to Sign In
        </button>
      </div>
    </div>
  );
}

