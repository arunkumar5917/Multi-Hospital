import React, { useEffect, useState } from "react";
import { Hospital, AuditLog, Summary } from "../types";
import { API_URL, useAuth } from "../context/AuthContext";
import {
  Building2,
  ShieldCheck,
  Plus,
  RefreshCw,
  LogOut,
  Users,
  Stethoscope,
  Activity,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  Eye,
  Sliders,
  FileText,
  Share2,
} from "lucide-react";

export function SuperAdminDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<"hospitals" | "audit" | "overview">("overview");

  // State
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New Hospital Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncingPatients, setSyncingPatients] = useState(false);

  // Hospital Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedHospitalForAdmin, setSelectedHospitalForAdmin] = useState<Hospital | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Search
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  const handleSyncNetworkPatients = async () => {
    setSyncingPatients(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch("/api/v1/network/sync-all-patients", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to synchronize patient profiles.");
      }
      setSuccess(data.message || "All patient profiles synchronized across active network facilities.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to synchronize patient profiles across facilities.");
    } finally {
      setSyncingPatients(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Load summary
      const sumRes = await apiFetch("/api/v1/dashboard/summary");
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      }

      // 2. Load all hospitals (including inactive)
      const hospRes = await apiFetch("/api/v1/hospitals?include_inactive=true");
      if (hospRes.ok) {
        setHospitals(await hospRes.json());
      }

      // 3. Load audit logs
      const auditRes = await apiFetch("/api/v1/admin/audit-logs?limit=100");
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load super admin datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleHospitalStatus = async (hospital: Hospital) => {
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/v1/hospitals/${hospital.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !hospital.is_active }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to update hospital status.");
      }
      const updated = await res.json();
      setHospitals((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setSuccess(`Hospital ${updated.name} status updated to ${updated.is_active ? "Active" : "Inactive"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  };

  const handleUpdateApprovalStatus = async (hospital: Hospital, newStatus: "approved" | "rejected") => {
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/v1/hospitals/${hospital.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          approval_status: newStatus,
          is_active: newStatus === "approved" ? true : hospital.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update hospital approval status.");
      }
      setHospitals((prev) => prev.map((h) => (h.id === data.id ? data : h)));
      setSuccess(`Hospital ${data.name} marked as ${newStatus.toUpperCase()}! Multi-hospital patient records synchronized.`);
    } catch (err: any) {
      setError(err.message || "Failed to update approval status.");
    }
  };

  const handleCreateHospitalAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalForAdmin) return;
    setAdminSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/v1/hospitals/${selectedHospitalForAdmin.id}/admin`, {
        method: "POST",
        body: JSON.stringify({
          email: adminEmail.trim().toLowerCase(),
          full_name: adminFullName.trim(),
          password: adminPassword.trim() || undefined,
          phone: adminPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create hospital admin account.");
      }
      setSuccess(`Hospital Admin account for ${data.full_name} (${data.email}) created for ${selectedHospitalForAdmin.name}!`);
      setShowAdminModal(false);
      setSelectedHospitalForAdmin(null);
      setAdminEmail("");
      setAdminFullName("");
      setAdminPassword("");
      setAdminPhone("");
    } catch (err: any) {
      setError(err.message || "Admin creation failed.");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/api/v1/hospitals", {
        method: "POST",
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          location: newLocation.trim(),
          address: newAddress.trim() || null,
          phone: newPhone.trim() || null,
          email: newEmail.trim() || null,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to register hospital.");
      }

      setHospitals((prev) => [...prev, data]);
      setSuccess(`Hospital ${data.name} (${data.code}) registered successfully and all patient profiles were shared across the network.`);
      setShowAddModal(false);
      setNewCode("");
      setNewName("");
      setNewLocation("");
      setNewAddress("");
      setNewPhone("");
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.location.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  const filteredAudit = auditLogs.filter(
    (log) =>
      log.event.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.hospital_code && log.hospital_code.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar super-admin-sidebar">
        <img
          src="/xora_logo.png"
          alt="XORA Technologies"
          className="side-logo brand-xora-side"
        />

        <div className="nav-label">NETWORK GOVERNANCE</div>

        <button
          className={`nav-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={18} /> Network Overview
        </button>

        <button
          className={`nav-button ${activeTab === "hospitals" ? "active" : ""}`}
          onClick={() => setActiveTab("hospitals")}
        >
          <Building2 size={18} /> Hospital Directory
        </button>

        <button
          className={`nav-button ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <ShieldCheck size={18} /> Authentication Audit Logs
        </button>

        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="avatar-chip">SA</div>
            <div>
              <strong>{user?.full_name}</strong>
              <small>Platform Super Admin</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> End Session
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">XORA TECHNOLOGIES / PLATFORM GOVERNANCE</span>
            <h1>Super Admin Operations</h1>
          </div>
          <div className="top-user-pill">
            <span className="role-chip super-admin">SUPER ADMIN ACCESS</span>
            <div className="user-info-text">
              <b>{user?.full_name}</b>
              <small>{user?.email}</small>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert-message error top-space">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-message success top-space">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="overview-container">
            <section className="welcome-card sa-welcome">
              <div>
                <span className="eyebrow">ENTERPRISE HMS FEDERATION</span>
                <h2>Multi-Hospital Healthcare Network</h2>
                <p>
                  You are governing the centralized database spanning all active healthcare facilities, patients, and role-based permissions.
                </p>
              </div>
              <ShieldCheck size={54} className="banner-art" />
            </section>

            <section className="stats-row">
              <article className="stat-card">
                <div>
                  <span>Total Facilities</span>
                  <Building2 size={20} />
                </div>
                <strong>{summary?.hospitals ?? hospitals.length}</strong>
                <small>{summary?.active_hospitals ?? hospitals.filter((h) => h.is_active).length} Active Facilities</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Global Patients</span>
                  <Users size={20} />
                </div>
                <strong>{summary?.patients ?? "—"}</strong>
                <small>Permanent GRN Identities</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Registered Doctors</span>
                  <Stethoscope size={20} />
                </div>
                <strong>{summary?.doctors ?? "—"}</strong>
                <small>Across all branches</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Total Invoiced</span>
                  <FileText size={20} />
                </div>
                <strong>₹{Number(summary?.invoices_total || 0).toLocaleString("en-IN")}</strong>
                <small>Consolidated billing</small>
              </article>
            </section>

            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Quick Platform Actions</h2>
                  <p>Common multi-tenant administration workflows.</p>
                </div>
              </div>
              <div className="quick-actions-grid">
                <button
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab("hospitals");
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={20} />
                  <div>
                    <b>Register New Hospital</b>
                    <small>Add code, location, and enable facility</small>
                  </div>
                </button>

                <button className="quick-action-btn" onClick={() => setActiveTab("audit")}>
                  <ShieldCheck size={20} />
                  <div>
                    <b>Inspect Auth Audit Logs</b>
                    <small>Review logins, lockouts, and security events</small>
                  </div>
                </button>

                <button className="quick-action-btn" onClick={loadData}>
                  <RefreshCw size={20} />
                  <div>
                    <b>Synchronize Federation</b>
                    <small>Refresh metrics and active facility statuses</small>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Hospitals Directory */}
        {activeTab === "hospitals" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Registered Healthcare Facilities</h2>
                <p>Manage all hospital nodes. Deactivating a hospital temporarily disables member logins.</p>
              </div>
              <div className="header-actions">
                <div className="table-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    value={hospitalSearch}
                    onChange={(e) => setHospitalSearch(e.target.value)}
                    placeholder="Search hospitals..."
                  />
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleSyncNetworkPatients}
                  disabled={syncingPatients}
                  title="Ensure all patient profiles and medical records are shared across all active network hospitals"
                >
                  <Share2 size={16} className={syncingPatients ? "spin-icon" : ""} />
                  {syncingPatients ? "Syncing Network Profiles…" : "Share All Profiles Across Network"}
                </button>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                  <Plus size={16} /> Register Hospital
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Facility Code</th>
                    <th>Hospital Name</th>
                    <th>Location</th>
                    <th>Approval Status</th>
                    <th>Network Status</th>
                    <th>Management Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map((h) => {
                    const approval = h.approval_status || "approved";
                    return (
                      <tr key={h.id}>
                        <td>
                          <span className="code-badge">{h.code}</span>
                        </td>
                        <td>
                          <strong>{h.name}</strong>
                          {h.email && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{h.email}</div>}
                        </td>
                        <td>
                          {h.location}
                          {h.phone && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{h.phone}</div>}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              background:
                                approval === "approved"
                                  ? "#dcfce7"
                                  : approval === "rejected"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color:
                                approval === "approved"
                                  ? "#166534"
                                  : approval === "rejected"
                                  ? "#991b1b"
                                  : "#92400e",
                            }}
                          >
                            {approval === "approved" && "✓ Approved"}
                            {approval === "rejected" && "✕ Rejected"}
                            {approval === "pending" && "⏳ Pending"}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${h.is_active ? "active" : "inactive"}`}>
                            {h.is_active ? "● Online" : "○ Offline"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            {approval !== "approved" && (
                              <button
                                style={{
                                  background: "#16a34a",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Approve Facility Registration & Share Network Patients"
                                onClick={() => handleUpdateApprovalStatus(h, "approved")}
                              >
                                Approve
                              </button>
                            )}
                            {approval !== "rejected" && (
                              <button
                                style={{
                                  background: "#ef4444",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Reject Facility Registration"
                                onClick={() => handleUpdateApprovalStatus(h, "rejected")}
                              >
                                Reject
                              </button>
                            )}
                            <button
                              style={{
                                background: "#0284c7",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                padding: "3px 8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Create Hospital Administrator Account"
                              onClick={() => {
                                setSelectedHospitalForAdmin(h);
                                setAdminEmail(`admin.${h.code.toLowerCase()}@x7medicore.local`);
                                setAdminFullName(`${h.name} Admin`);
                                setShowAdminModal(true);
                              }}
                            >
                              + Admin
                            </button>
                            <button
                              className={`btn-action-status ${h.is_active ? "deactivate" : "activate"}`}
                              style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                              onClick={() => handleToggleHospitalStatus(h)}
                            >
                              {h.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 3: Audit Logs */}
        {activeTab === "audit" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Authentication Audit Logs</h2>
                <p>Immutable security trail of authentication events, portal access, and lockout alerts.</p>
              </div>
              <div className="table-search-box">
                <Search size={16} />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter logs by event, hospital..."
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Event</th>
                    <th>Facility Code</th>
                    <th>User ID</th>
                    <th>Client IP</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((log) => (
                    <tr key={log.id}>
                      <td className="time-cell">{new Date(log.created_at).toLocaleString()}</td>
                      <td>
                        <span
                          className={`event-tag ${
                            log.event.includes("SUCCESS")
                              ? "success"
                              : log.event.includes("LOCKED") || log.event.includes("MISMATCH")
                              ? "danger"
                              : "neutral"
                          }`}
                        >
                          {log.event}
                        </span>
                      </td>
                      <td>{log.hospital_code || "—"}</td>
                      <td>{log.user_id ? `#${log.user_id}` : "Anonymous"}</td>
                      <td><code>{log.ip_address || "127.0.0.1"}</code></td>
                      <td>{log.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Register Hospital Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Hospital Facility</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHospital} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Hospital Code *</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. HOSP-005"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Facility Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Apollo Health Institute"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Location / City *</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Madurai, Tamil Nadu"
                  required
                />
              </div>

              <div className="form-field">
                <label>Detailed Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 15 Collectorate Road, Madurai"
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 452 250 0005"
                  />
                </div>
                <div className="form-field">
                  <label>Official Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="madurai@x7medicore.local"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Registering Facility…" : "Register Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Hospital Admin Modal */}
      {showAdminModal && selectedHospitalForAdmin && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Create Hospital Admin Account</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  {selectedHospitalForAdmin.name} ({selectedHospitalForAdmin.code})
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAdminModal(false);
                  setSelectedHospitalForAdmin(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHospitalAdminSubmit} className="modal-form">
              <div className="form-field">
                <label>Admin Full Name *</label>
                <input
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                />
              </div>

              <div className="form-field">
                <label>Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. admin.ganga@x7medicore.local"
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Initial Password (Min 8 chars)</label>
                  <input
                    type="password"
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Defaults to ChangeMe123!"
                  />
                </div>
                <div className="form-field">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+91 98400 12345"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAdminModal(false);
                    setSelectedHospitalForAdmin(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={adminSubmitting}>
                  {adminSubmitting ? "Creating Admin..." : "Create Hospital Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

