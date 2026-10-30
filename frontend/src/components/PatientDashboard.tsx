import { useEffect, useState } from "react";
import {
  PatientProfile,
  MedicalTimelineEvent,
  Treatment,
  Attachment,
  MedicalCondition,
  PatientAllergy,
  PrescriptionItem,
  PatientConsent,
  MedicalAccessLog,
} from "../types";
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
  Eye,
  Download,
  Clock,
  ShieldCheck,
  AlertTriangle,
  File,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";

export function PatientDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "treatments" | "attachments" | "prescriptions" | "consents" | "invoices"
  >("overview");

  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [timeline, setTimeline] = useState<MedicalTimelineEvent[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [accessLogs, setAccessLogs] = useState<MedicalAccessLog[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Modals
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  // Filters
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [attachmentCategoryFilter, setAttachmentCategoryFilter] = useState("all");

  const grn = profile?.grn || user?.grn || "XM-GRN-000001";

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch patient profile
        const profRes = await apiFetch("/api/v1/patient/profile");
        let activeGrn = grn;
        if (profRes.ok) {
          const profData: PatientProfile = await profRes.json();
          setProfile(profData);
          if (profData.grn) activeGrn = profData.grn;
        }

        // Fetch parallel medical history data
        const [medHistRes, timeRes, trtRes, attRes, prRes, conRes, logRes, invRes] = await Promise.all([
          apiFetch(`/api/v1/patients/${activeGrn}/medical-history`),
          apiFetch(`/api/v1/patients/${activeGrn}/medical-history/timeline`),
          apiFetch("/api/v1/treatments"),
          apiFetch(`/api/v1/patients/${activeGrn}/attachments`),
          apiFetch("/api/v1/prescriptions"),
          apiFetch(`/api/v1/patients/${activeGrn}/consents`),
          apiFetch(`/api/v1/patients/${activeGrn}/access-logs`),
          apiFetch("/api/v1/invoices"),
        ]);

        if (medHistRes.ok) {
          const medData = await medHistRes.json();
          setConditions(medData.conditions || []);
          setAllergies(medData.allergies || []);
        }

        if (timeRes.ok) setTimeline(await timeRes.json());
        if (trtRes.ok) setTreatments(await trtRes.json());
        if (attRes.ok) setAttachments(await attRes.json());
        if (prRes.ok) setPrescriptions(await prRes.json());
        if (conRes.ok) setConsents(await conRes.json());
        if (logRes.ok) setAccessLogs(await logRes.json());
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
    if (grn) {
      navigator.clipboard.writeText(grn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === "all") return true;
    return item.event_type === timelineFilter;
  });

  const filteredAttachments = attachments.filter((att) => {
    if (attachmentCategoryFilter === "all") return true;
    return att.file_category.toLowerCase() === attachmentCategoryFilter.toLowerCase();
  });

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

        <div className="nav-label">MY HEALTHCARE PASSPORT</div>

        <button
          className={`nav-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <HeartPulse size={18} /> Health Overview
        </button>

        <button
          className={`nav-button ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          <Clock size={18} /> Medical Timeline
        </button>

        <button
          className={`nav-button ${activeTab === "treatments" ? "active" : ""}`}
          onClick={() => setActiveTab("treatments")}
        >
          <ClipboardList size={18} /> Treatments ({treatments.length})
        </button>

        <button
          className={`nav-button ${activeTab === "attachments" ? "active" : ""}`}
          onClick={() => setActiveTab("attachments")}
        >
          <Layers size={18} /> Reports & Scans ({attachments.length})
        </button>

        <button
          className={`nav-button ${activeTab === "prescriptions" ? "active" : ""}`}
          onClick={() => setActiveTab("prescriptions")}
        >
          <Pill size={18} /> Prescriptions
        </button>

        <button
          className={`nav-button ${activeTab === "consents" ? "active" : ""}`}
          onClick={() => setActiveTab("consents")}
        >
          <ShieldCheck size={18} /> Network & Consents
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
            <span className="eyebrow">X7 MEDICORE / GLOBAL PATIENT IDENTITY</span>
            <h1>Centralized Health Record</h1>
          </div>

          {/* Prominent GRN Identity Badge */}
          <div className="grn-header-badge">
            <div className="grn-label">GLOBAL REGISTRATION NUMBER</div>
            <div className="grn-value-row">
              <IdCard size={18} />
              <code>{grn}</code>
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
                <span className="eyebrow">PERMANENT UNIFIED RECORD</span>
                <h2>Welcome back, {profile?.full_name || user?.full_name}</h2>
                <p>
                  Your medical history, diagnoses, prescriptions, and radiology scans are consolidated under permanent GRN{" "}
                  <strong>{grn}</strong> across all authorized X7 MediCore network hospitals.
                </p>
              </div>
              <HeartPulse size={54} className="banner-art" />
            </section>

            {/* Quick Metrics */}
            <section className="stats-row">
              <article className="stat-card">
                <div>
                  <span>Active Treatments</span>
                  <ClipboardList size={20} />
                </div>
                <strong>{treatments.filter((t) => t.status === "In Progress" || t.status === "Scheduled").length}</strong>
                <small>Ongoing clinical care</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Medical Timeline</span>
                  <Clock size={20} />
                </div>
                <strong>{timeline.length}</strong>
                <small>Historical events recorded</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Diagnostic Scans</span>
                  <Activity size={20} />
                </div>
                <strong>{attachments.length}</strong>
                <small>X-rays, MRIs & Reports</small>
              </article>

              <article className="stat-card">
                <div>
                  <span>Network Hospitals</span>
                  <Building2 size={20} />
                </div>
                <strong>{profile?.registered_hospitals?.length || 2}</strong>
                <small>Connected healthcare centers</small>
              </article>
            </section>

            {/* Patient Demographics & Bio Grid */}
            <section className="panel-box patient-id-card">
              <div className="panel-header">
                <div>
                  <h2>Patient Identification Profile</h2>
                  <p>Permanent identity linked to clinical history and diagnostic results.</p>
                </div>
                <div className="verified-pill">● Verified Central GRN</div>
              </div>

              <div className="patient-bio-grid">
                <div className="bio-field">
                  <span>Full Legal Name</span>
                  <strong>{profile?.full_name || user?.full_name}</strong>
                </div>
                <div className="bio-field">
                  <span>Permanent GRN</span>
                  <strong className="grn-code">{grn}</strong>
                </div>
                <div className="bio-field">
                  <span>Date of Birth</span>
                  <strong>{profile?.date_of_birth ? String(profile.date_of_birth) : "1994-06-12"}</strong>
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
                  <span>Contact Phone</span>
                  <strong>{profile?.phone || "+91 98765 43210"}</strong>
                </div>
                <div className="bio-field">
                  <span>Emergency Contact</span>
                  <strong>{profile?.emergency_contact || "+91 98401 23456"}</strong>
                </div>
                <div className="bio-field">
                  <span>Primary Facility</span>
                  <strong>
                    <Building2 size={14} /> {profile?.primary_hospital_name || "X7 City Central Hospital (Chennai)"}
                  </strong>
                </div>
              </div>
            </section>

            {/* Medical Conditions and Allergies Side-by-Side */}
            <div className="two-column-grid">
              {/* Chronic Conditions */}
              <section className="panel-box">
                <div className="panel-header">
                  <div>
                    <h2>Diagnosed Medical Conditions</h2>
                    <p>Documented chronic or active diagnoses.</p>
                  </div>
                  <HeartPulse size={20} className="text-primary" />
                </div>

                {conditions.length === 0 ? (
                  <p className="empty-message">No chronic conditions recorded.</p>
                ) : (
                  <div className="conditions-list">
                    {conditions.map((cond) => (
                      <div className="condition-item" key={cond.id}>
                        <div className="condition-header">
                          <strong>{cond.condition_name}</strong>
                          <span className={`status-pill ${cond.status === "active" ? "danger" : "neutral"}`}>
                            {cond.status.toUpperCase()}
                          </span>
                        </div>
                        {cond.icd_code && <small className="icd-tag">ICD: {cond.icd_code}</small>}
                        {cond.notes && <p className="condition-notes">{cond.notes}</p>}
                        <span className="condition-date">Diagnosed: {cond.diagnosed_date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Patient Allergies */}
              <section className="panel-box">
                <div className="panel-header">
                  <div>
                    <h2>Known Allergies & Reactions</h2>
                    <p>Alerts referenced by attending clinicians.</p>
                  </div>
                  <AlertTriangle size={20} className="text-warning" />
                </div>

                {allergies.length === 0 ? (
                  <p className="empty-message">No known drug or environmental allergies.</p>
                ) : (
                  <div className="allergies-list">
                    {allergies.map((al) => (
                      <div className="allergy-item" key={al.id}>
                        <div className="allergy-header">
                          <strong>{al.allergen}</strong>
                          <span className={`status-pill ${al.severity === "severe" ? "danger" : "warning"}`}>
                            {al.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="allergy-reaction">Reaction: {al.reaction}</p>
                        {al.notes && <p className="condition-notes">{al.notes}</p>}
                        <span className="condition-date">Identified: {al.identified_date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Registered Facilities Section */}
            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Connected Multi-Hospital Network</h2>
                  <p>Hospitals where your central GRN record has been visited or authorized.</p>
                </div>
                <Building2 size={20} />
              </div>
              <div className="connected-hospitals-grid">
                {(profile?.registered_hospitals || ["HOSP-001", "HOSP-002"]).map((hCode) => (
                  <div className="connected-hospital-card" key={hCode}>
                    <div className="hospital-code-badge">{hCode}</div>
                    <h4>
                      {hCode === "HOSP-001"
                        ? "X7 City Central Hospital (Chennai)"
                        : hCode === "HOSP-002"
                        ? "X7 Metro Specialty Hospital (Bengaluru)"
                        : hCode === "HOSP-003"
                        ? "X7 Apex Super Care (Mumbai)"
                        : `Network Facility ${hCode}`}
                    </h4>
                    <span className="consent-badge">
                      <ShieldCheck size={14} /> Full Cross-Hospital Access Granted
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Chronological Timeline */}
        {activeTab === "timeline" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Comprehensive Medical Timeline</h2>
                <p>Chronological history of treatments, diagnoses, surgeries, and prescriptions across all hospitals.</p>
              </div>

              <div className="timeline-filter-pills">
                {["all", "treatment", "diagnosis", "surgery", "observation", "prescription"].map((f) => (
                  <button
                    key={f}
                    className={`filter-pill ${timelineFilter === f ? "active" : ""}`}
                    onClick={() => setTimelineFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <p className="empty-message">Loading medical history timeline…</p>
            ) : filteredTimeline.length === 0 ? (
              <p className="empty-message">No medical timeline events found for this filter.</p>
            ) : (
              <div className="medical-timeline">
                {filteredTimeline.map((item, idx) => (
                  <div className="timeline-item" key={item.id || idx}>
                    <div className="timeline-marker">
                      <div className={`timeline-dot dot-${item.event_type}`}></div>
                      {idx < filteredTimeline.length - 1 && <div className="timeline-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-top">
                        <span className="timeline-date">{new Date(item.date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}</span>
                        <span className={`event-type-badge badge-${item.event_type}`}>
                          {item.event_type.toUpperCase()}
                        </span>
                        <span className="timeline-hospital">
                          <Building2 size={13} /> {item.hospital_name || item.hospital_id}
                        </span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      {item.doctor_name && (
                        <div className="timeline-doctor">
                          <span>Attending Doctor: <strong>{item.doctor_name}</strong></span>
                          {item.doctor_specialization && <small>({item.doctor_specialization})</small>}
                        </div>
                      )}
                      {item.status && (
                        <span className="timeline-status-tag">Status: {item.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Treatments */}
        {activeTab === "treatments" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Treatments & Clinical Encounters</h2>
                <p>Complete record of outpatient visits, treatments, and hospital consultations.</p>
              </div>
            </div>

            {treatments.length === 0 ? (
              <p className="empty-message">No treatments recorded under GRN {grn}.</p>
            ) : (
              <div className="treatments-grid">
                {treatments.map((t) => (
                  <div className="treatment-card" key={t.id}>
                    <div className="treatment-card-top">
                      <div>
                        <span className="treatment-code-pill">{t.treatment_code}</span>
                        <h3>{t.diagnosis}</h3>
                      </div>
                      <span className={`status-pill ${
                        t.status === "In Progress" || t.status === "active"
                          ? "active"
                          : t.status === "Completed"
                          ? "success"
                          : "warning"
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="treatment-facility-row">
                      <span><Building2 size={14} /> {t.hospital_name || t.hospital_id}</span>
                      <span><Calendar size={14} /> {new Date(t.visit_date).toLocaleDateString()}</span>
                    </div>

                    <p className="treatment-complaint">
                      <strong>Chief Complaint:</strong> {t.chief_complaint}
                    </p>

                    <div className="treatment-meta-preview">
                      <div>Doctor: <b>{t.doctor_name}</b> ({t.doctor_specialization})</div>
                      <div>Prescriptions: <b>{t.prescriptions?.length || 0} items</b></div>
                      <div>Attachments: <b>{t.attachments?.length || 0} files</b></div>
                    </div>

                    <button
                      className="btn-view-details"
                      onClick={() => setSelectedTreatment(t)}
                    >
                      <Eye size={15} /> View Full Clinical Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Diagnostic Reports & Images Gallery */}
        {activeTab === "attachments" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Diagnostic Reports & Medical Scans</h2>
                <p>Private cloud storage for X-rays, MRI, CT scans, and laboratory reports linked to GRN {grn}.</p>
              </div>

              <div className="category-filter-select">
                <select
                  value={attachmentCategoryFilter}
                  onChange={(e) => setAttachmentCategoryFilter(e.target.value)}
                >
                  <option value="all">All File Categories</option>
                  <option value="x-ray">X-Ray</option>
                  <option value="mri">MRI Scan</option>
                  <option value="ct scan">CT Scan</option>
                  <option value="blood test report">Blood Test Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="discharge summary">Discharge Summary</option>
                  <option value="other medical documents">Other Documents</option>
                </select>
              </div>
            </div>

            {attachments.length === 0 ? (
              <p className="empty-message">No diagnostic attachments uploaded for this patient.</p>
            ) : filteredAttachments.length === 0 ? (
              <p className="empty-message">No attachments match the selected category filter.</p>
            ) : (
              <div className="attachments-gallery-grid">
                {filteredAttachments.map((att) => {
                  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(att.file_type) ||
                    att.original_filename.match(/\.(jpg|jpeg|png|webp)$/i);
                  const isPdf = att.file_type === "application/pdf" || att.original_filename.endsWith(".pdf");

                  return (
                    <div className="attachment-card" key={att.id}>
                      <div className="attachment-preview-box">
                        {isImage ? (
                          <img
                            src={att.download_url}
                            alt={att.description || att.original_filename}
                            className="gallery-thumbnail"
                            onClick={() => setSelectedAttachment(att)}
                          />
                        ) : isPdf ? (
                          <div
                            className="pdf-thumbnail-placeholder"
                            onClick={() => setSelectedAttachment(att)}
                          >
                            <FileText size={40} className="pdf-icon" />
                            <span>PDF Document</span>
                          </div>
                        ) : (
                          <div
                            className="generic-file-placeholder"
                            onClick={() => setSelectedAttachment(att)}
                          >
                            <File size={40} />
                            <span>{att.file_type || "Medical File"}</span>
                          </div>
                        )}
                        <span className="file-category-badge">{att.file_category}</span>
                      </div>

                      <div className="attachment-details">
                        <h4>{att.description || att.original_filename}</h4>
                        <div className="attachment-subinfo">
                          <span>Facility: {att.hospital_id}</span>
                          <span>Size: {(att.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                        <small className="attachment-date">
                          Uploaded: {new Date(att.upload_date).toLocaleDateString()}
                        </small>

                        <div className="attachment-actions">
                          <button
                            className="btn-sm-outline"
                            onClick={() => setSelectedAttachment(att)}
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <a
                            href={att.download_url}
                            download={att.original_filename}
                            className="btn-sm-primary"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tab 5: Prescriptions */}
        {activeTab === "prescriptions" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Prescribed Medications</h2>
                <p>Complete medicine list with dosage, frequency, and instructions.</p>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <p className="empty-message">No active prescriptions found.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Medication Name</th>
                      <th>Dosage & Frequency</th>
                      <th>Instructions</th>
                      <th>Facility</th>
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
                        <td>{pr.instructions || "Standard dose"}</td>
                        <td>{pr.hospital_id || "Network Hospital"}</td>
                        <td>{pr.prescribed_date ? String(pr.prescribed_date) : "—"}</td>
                        <td>
                          <span className="status-pill active">{pr.status || "active"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 6: Network Consents & Access Logs */}
        {activeTab === "consents" && (
          <div className="consents-container">
            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Cross-Hospital Access & Consent Management</h2>
                  <p>Hospitals authorized to view your centralized medical record under GRN {grn}.</p>
                </div>
                <ShieldCheck size={22} className="text-success" />
              </div>

              {consents.length === 0 ? (
                <p className="empty-message">Standard cross-hospital sharing active across network.</p>
              ) : (
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Requesting Facility</th>
                        <th>Consent Scope</th>
                        <th>Status</th>
                        <th>Granted Date</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consents.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.requesting_hospital_name || c.requesting_hospital_id}</strong>
                          </td>
                          <td>{c.consent_type.replaceAll("_", " ").toUpperCase()}</td>
                          <td>
                            <span className={`status-pill ${c.status === "granted" ? "active" : "neutral"}`}>
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(c.granted_at).toLocaleDateString()}</td>
                          <td>{c.notes || "Authorized patient consent"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Medical Record Access Audit Trail</h2>
                  <p>Security audit log recording every clinician who viewed or updated your healthcare records.</p>
                </div>
              </div>

              {accessLogs.length === 0 ? (
                <p className="empty-message">No access logs recorded yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Access Timestamp</th>
                        <th>Clinician / User</th>
                        <th>Facility</th>
                        <th>Resource</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.accessed_at).toLocaleString()}</td>
                          <td><strong>{log.user_name || `User #${log.user_id}`}</strong></td>
                          <td>{log.hospital_id || "Network"}</td>
                          <td>{log.resource_type} ({log.resource_id || "all"})</td>
                          <td>
                            <span className="code-badge">{log.action}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 7: Invoices */}
        {activeTab === "invoices" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Invoices & Billing History</h2>
                <p>Consolidated consultation and medical charges across all visits.</p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <p className="empty-message">No invoices on file.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Invoice Date</th>
                      <th>Facility</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{String(inv.invoice_date)}</td>
                        <td>{inv.hospital_id || "Network Facility"}</td>
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

      {/* Modal: Full Treatment Details */}
      {selectedTreatment && (
        <div className="modal-backdrop" onClick={() => setSelectedTreatment(null)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">CLINICAL ENCOUNTER DETAILS</span>
                <h2>{selectedTreatment.treatment_code} &bull; {selectedTreatment.diagnosis}</h2>
              </div>
              <button className="close-btn" onClick={() => setSelectedTreatment(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="treatment-modal-top-grid">
                <div>
                  <label>Facility:</label>
                  <strong>{selectedTreatment.hospital_name || selectedTreatment.hospital_id}</strong>
                </div>
                <div>
                  <label>Attending Doctor:</label>
                  <strong>{selectedTreatment.doctor_name} ({selectedTreatment.doctor_specialization})</strong>
                </div>
                <div>
                  <label>Visit Date:</label>
                  <strong>{new Date(selectedTreatment.visit_date).toLocaleString()}</strong>
                </div>
                <div>
                  <label>Status:</label>
                  <span className="status-pill active">{selectedTreatment.status}</span>
                </div>
              </div>

              <div className="clinical-section">
                <h4>Chief Complaint & Symptoms</h4>
                <p><strong>Chief Complaint:</strong> {selectedTreatment.chief_complaint}</p>
                {selectedTreatment.symptoms && (
                  <p><strong>Symptoms Reported:</strong> {selectedTreatment.symptoms}</p>
                )}
                {selectedTreatment.clinical_observations && (
                  <p><strong>Clinical Observations:</strong> {selectedTreatment.clinical_observations}</p>
                )}
              </div>

              <div className="clinical-section">
                <h4>Treatment Description & Procedures Performed</h4>
                <p>{selectedTreatment.description || "None specified."}</p>
                {selectedTreatment.procedures_performed && (
                  <p><strong>Procedures:</strong> {selectedTreatment.procedures_performed}</p>
                )}
              </div>

              {selectedTreatment.follow_up_instructions && (
                <div className="clinical-section">
                  <h4>Follow-up Instructions</h4>
                  <p>{selectedTreatment.follow_up_instructions}</p>
                  {selectedTreatment.next_appointment_date && (
                    <small>Next Visit: {new Date(selectedTreatment.next_appointment_date).toLocaleString()}</small>
                  )}
                </div>
              )}

              {/* Prescriptions in Treatment */}
              <div className="clinical-section">
                <h4>Prescribed Medications ({selectedTreatment.prescriptions?.length || 0})</h4>
                {(!selectedTreatment.prescriptions || selectedTreatment.prescriptions.length === 0) ? (
                  <p className="empty-message-sm">No prescriptions recorded for this encounter.</p>
                ) : (
                  <table className="enterprise-table compact-table">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTreatment.prescriptions.map((p, i) => (
                        <tr key={p.id || i}>
                          <td><strong>{p.medication}</strong></td>
                          <td>{p.dosage}</td>
                          <td>{p.instructions || "Standard"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Attachments in Treatment */}
              <div className="clinical-section">
                <h4>Attached Diagnostics & Scans ({selectedTreatment.attachments?.length || 0})</h4>
                {(!selectedTreatment.attachments || selectedTreatment.attachments.length === 0) ? (
                  <p className="empty-message-sm">No attachments linked to this treatment.</p>
                ) : (
                  <div className="treatment-attachments-list">
                    {selectedTreatment.attachments.map((att) => (
                      <div className="treatment-att-item" key={att.id}>
                        <div>
                          <strong>{att.description || att.original_filename}</strong>
                          <span className="file-category-badge">{att.file_category}</span>
                        </div>
                        <a
                          href={att.download_url}
                          download={att.original_filename}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-sm-primary"
                        >
                          <Download size={13} /> View / Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedTreatment(null)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Attachment Preview */}
      {selectedAttachment && (
        <div className="modal-backdrop" onClick={() => setSelectedAttachment(null)}>
          <div className="modal-content media-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{selectedAttachment.file_category.toUpperCase()} PREVIEW</span>
                <h2>{selectedAttachment.description || selectedAttachment.original_filename}</h2>
              </div>
              <button className="close-btn" onClick={() => setSelectedAttachment(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body media-modal-body">
              {selectedAttachment.file_type.startsWith("image/") ||
              selectedAttachment.original_filename.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <div className="image-viewer-box">
                  <img
                    src={selectedAttachment.download_url}
                    alt={selectedAttachment.original_filename}
                    className="modal-full-image"
                  />
                </div>
              ) : selectedAttachment.file_type === "application/pdf" ||
                selectedAttachment.original_filename.endsWith(".pdf") ? (
                <div className="pdf-viewer-box">
                  <iframe
                    src={selectedAttachment.download_url}
                    title={selectedAttachment.original_filename}
                    className="pdf-iframe"
                  />
                </div>
              ) : (
                <div className="generic-preview-box">
                  <FileText size={64} />
                  <p>Direct preview not supported for this file format.</p>
                </div>
              )}

              <div className="attachment-metadata-card">
                <div><strong>File Name:</strong> {selectedAttachment.original_filename}</div>
                <div><strong>Category:</strong> {selectedAttachment.file_category}</div>
                <div><strong>Patient GRN:</strong> {selectedAttachment.patient_grn}</div>
                <div><strong>Facility:</strong> {selectedAttachment.hospital_id}</div>
                <div><strong>File Size:</strong> {(selectedAttachment.file_size / 1024).toFixed(1)} KB</div>
                <div><strong>Upload Date:</strong> {new Date(selectedAttachment.upload_date).toLocaleString()}</div>
              </div>
            </div>

            <div className="modal-footer">
              <a
                href={selectedAttachment.download_url}
                download={selectedAttachment.original_filename}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <Download size={16} /> Download File
              </a>
              <button className="btn-secondary" onClick={() => setSelectedAttachment(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
