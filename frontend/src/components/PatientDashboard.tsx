import { useEffect, useState } from "react";
import { PatientProfile } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  HeartPulse,
  IdCard,
  Calendar,
  ClipboardList,
  FileText,
  Pill,
  Activity,
  LogOut,
  Building2,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

export function PatientDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "appointments" | "treatments" | "prescriptions" | "reports" | "invoices"
  >("overview");

  const [appointments, setAppointments] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch patient profile with GRN
        const profRes = await apiFetch("/api/v1/patient/profile");
        if (profRes.ok) {
          setProfile(await profRes.json());
        }

        // Fetch patient clinical records
        const [appRes, trtRes, prRes, lrRes, invRes] = await Promise.all([
          apiFetch("/api/v1/appointments"),
          apiFetch("/api/v1/treatments"),
          apiFetch("/api/v1/prescriptions"),
          apiFetch("/api/v1/lab-reports"),
          apiFetch("/api/v1/invoices"),
        ]);

        if (appRes.ok) setAppointments(await appRes.json());
        if (trtRes.ok) setTreatments(await trtRes.json());
        if (prRes.ok) setPrescriptions(await prRes.json());
        if (lrRes.ok) setLabReports(await lrRes.json());
        if (invRes.ok) setInvoices(await invRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load medical records.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, []);

  const copyGrn = () => {
    if (profile?.grn) {
      navigator.clipboard.writeText(profile.grn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar patient-sidebar">
        <div className="logo side-logo">
          <span>X7</span>
          <div>
            <b>MEDICORE</b>
            <small>PATIENT CARE PORTAL</small>
          </div>
        </div>

        <div className="nav-label">MY HEALTH PROFILE</div>

        <button
          className={`nav-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <HeartPulse size={18} /> Health Overview
        </button>

        <button
          className={`nav-button ${activeTab === "appointments" ? "active" : ""}`}
          onClick={() => setActiveTab("appointments")}
        >
          <Calendar size={18} /> My Appointments
        </button>

        <button
          className={`nav-button ${activeTab === "treatments" ? "active" : ""}`}
          onClick={() => setActiveTab("treatments")}
        >
          <ClipboardList size={18} /> Treatments & Care
        </button>

        <button
          className={`nav-button ${activeTab === "prescriptions" ? "active" : ""}`}
          onClick={() => setActiveTab("prescriptions")}
        >
          <Pill size={18} /> Prescriptions
        </button>

        <button
          className={`nav-button ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <Activity size={18} /> Diagnostic Lab Reports
        </button>

        <button
          className={`nav-button ${activeTab === "invoices" ? "active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          <FileText size={18} /> Invoices & Billing
        </button>

        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="avatar-chip patient-chip">
              {user?.full_name ? user.full_name[0] : "P"}
            </div>
            <div>
              <strong>{user?.full_name}</strong>
              <small>Verified Patient</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">X7 MEDICORE / PATIENT HEALTH RECORD</span>
            <h1>Patient Workspace</h1>
          </div>

          {/* Prominent GRN Identity Badge */}
          <div className="grn-header-badge">
            <div className="grn-label">GLOBAL REGISTRATION NUMBER</div>
            <div className="grn-value-row">
              <IdCard size={18} />
              <code>{profile?.grn || user?.grn || "XM-GRN-000001"}</code>
              <button
                className="copy-grn-btn"
                onClick={copyGrn}
                title="Copy permanent GRN to clipboard"
                type="button"
              >
                {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert-message error top-space">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="patient-overview">
            <section className="welcome-card patient-welcome">
              <div>
                <span className="eyebrow">YOUR HEALTH PASSPORT</span>
                <h2>Welcome back, {profile?.full_name || user?.full_name}</h2>
                <p>
                  Your healthcare record is permanently secured under Global Registration Number{" "}
                  <strong>{profile?.grn || user?.grn || "XM-GRN-000001"}</strong> across affiliated network facilities.
                </p>
              </div>
              <HeartPulse size={54} className="banner-art" />
            </section>

            {/* Patient Identity & Medical Bio Card */}
            <section className="panel-box patient-id-card">
              <div className="panel-header">
                <div>
                  <h2>Patient Identification Profile</h2>
                  <p>Permanent identity linked to clinical history and diagnostic results.</p>
                </div>
                <div className="verified-pill">● Verified Patient</div>
              </div>

              <div className="patient-bio-grid">
                <div className="bio-field">
                  <span>Full Legal Name</span>
                  <strong>{profile?.full_name || user?.full_name}</strong>
                </div>
                <div className="bio-field">
                  <span>Permanent GRN</span>
                  <strong className="grn-code">{profile?.grn || user?.grn || "XM-GRN-000001"}</strong>
                </div>
                <div className="bio-field">
                  <span>Date of Birth</span>
                  <strong>{profile?.date_of_birth ? String(profile.date_of_birth) : "1996-08-15"}</strong>
                </div>
                <div className="bio-field">
                  <span>Blood Group</span>
                  <strong className="blood-tag">{profile?.blood_group || "O+"}</strong>
                </div>
                <div className="bio-field">
                  <span>Gender</span>
                  <strong>{profile?.gender || "Male"}</strong>
                </div>
                <div className="bio-field">
                  <span>Registered Contact</span>
                  <strong>{profile?.phone || "+91 98765 43210"}</strong>
                </div>
                <div className="bio-field">
                  <span>Registered Email</span>
                  <strong>{profile?.email || user?.email}</strong>
                </div>
                <div className="bio-field">
                  <span>Primary Healthcare Facility</span>
                  <strong>
                    <Building2 size={14} /> {profile?.primary_hospital_name || "X7 City Central Hospital"}
                  </strong>
                </div>
              </div>
            </section>

            {/* Quick Metrics */}
            <section className="stats-row">
              <article className="stat-card">
                <div>
                  <span>Appointments</span>
                  <Calendar size={20} />
                </div>
                <strong>{appointments.length}</strong>
                <small>Upcoming & Completed</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Active Treatments</span>
                  <ClipboardList size={20} />
                </div>
                <strong>{treatments.filter((t) => t.status === "active").length}</strong>
                <small>Under medical care</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Prescriptions</span>
                  <Pill size={20} />
                </div>
                <strong>{prescriptions.length}</strong>
                <small>Medicines prescribed</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Lab Diagnostics</span>
                  <Activity size={20} />
                </div>
                <strong>{labReports.length}</strong>
                <small>Available reports</small>
              </article>
            </section>
          </div>
        )}

        {/* Tab 2: Appointments */}
        {activeTab === "appointments" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>My Medical Appointments</h2>
                <p>Scheduled and previous doctor consultations.</p>
              </div>
            </div>
            {appointments.length === 0 ? (
              <p className="empty-message">No appointments scheduled.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Consultation Date & Time</th>
                      <th>Reason / Department</th>
                      <th>Status</th>
                      <th>Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.scheduled_at).toLocaleString()}</td>
                        <td>
                          <strong>{a.reason}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${a.status === "scheduled" ? "active" : "neutral"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>{a.hospital_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Treatments */}
        {activeTab === "treatments" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Treatments & Diagnoses</h2>
                <p>Clinical diagnoses and treatment care pathways prescribed by physicians.</p>
              </div>
            </div>
            {treatments.length === 0 ? (
              <p className="empty-message">No treatments recorded.</p>
            ) : (
              <div className="cards-list">
                {treatments.map((t) => (
                  <div className="treatment-card-item" key={t.id}>
                    <div className="treatment-top">
                      <span className="code-badge">{t.treatment_code}</span>
                      <span className={`status-pill ${t.status === "active" ? "active" : "neutral"}`}>
                        {t.status}
                      </span>
                    </div>
                    <h3>{t.diagnosis}</h3>
                    <p>{t.description}</p>
                    <div className="treatment-foot">
                      <span>Started: {String(t.start_date)}</span>
                      <span>Facility: {t.hospital_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Prescriptions */}
        {activeTab === "prescriptions" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Prescribed Medications</h2>
                <p>Dosage instructions and medicines prescribed by attending doctors.</p>
              </div>
            </div>
            {prescriptions.length === 0 ? (
              <p className="empty-message">No active prescriptions found.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Dosage & Frequency</th>
                      <th>Special Instructions</th>
                      <th>Prescribed Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((pr) => (
                      <tr key={pr.id}>
                        <td>
                          <strong>{pr.medication}</strong>
                        </td>
                        <td>{pr.dosage}</td>
                        <td>{pr.instructions || "Standard intake"}</td>
                        <td>{String(pr.prescribed_date)}</td>
                        <td>
                          <span className="status-pill active">{pr.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 5: Lab Reports */}
        {activeTab === "reports" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Diagnostic Laboratory Reports</h2>
                <p>Pathology, hematology, and test results from authorized hospital laboratories.</p>
              </div>
            </div>
            {labReports.length === 0 ? (
              <p className="empty-message">No laboratory reports available.</p>
            ) : (
              <div className="lab-reports-list">
                {labReports.map((lr) => (
                  <div className="report-card" key={lr.id}>
                    <div className="report-card-head">
                      <div>
                        <h3>{lr.test_name}</h3>
                        <span className="report-date">Date: {String(lr.report_date)}</span>
                      </div>
                      <span className="status-pill active">{lr.status}</span>
                    </div>
                    <div className="report-result-box">
                      <strong>Result Findings:</strong>
                      <p>{lr.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 6: Invoices */}
        {activeTab === "invoices" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Patient Invoices & Billing</h2>
                <p>Diagnostic services and consultation fees.</p>
              </div>
            </div>
            {invoices.length === 0 ? (
              <p className="empty-message">No invoices recorded.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Invoice Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Billing Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{String(inv.invoice_date)}</td>
                        <td>{inv.description}</td>
                        <td>
                          <strong>₹{Number(inv.amount).toFixed(2)}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${inv.status === "paid" ? "active" : "danger"}`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
