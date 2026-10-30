import React, { FormEvent, useEffect, useState } from "react";
import {
  Summary,
  Treatment,
  PatientSearchResult,
  Attachment,
  MedicalTimelineEvent,
  MedicalCondition,
  PatientAllergy,
} from "../types";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  ClipboardList,
  Eye,
  FileText,
  HeartPulse,
  IdCard,
  LogOut,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
  Users,
  X,
  Download,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";

export function StaffDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const role = user?.role || "doctor";
  const hospitalCode = user?.hospital_id || "HOSP-001";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [module, setModule] = useState("Overview");
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Global Patient Search
  const [searchGrnQuery, setSearchGrnQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientForView, setSelectedPatientForView] = useState<PatientSearchResult | null>(null);
  const [patientHistoryModal, setPatientHistoryModal] = useState<{
    timeline: MedicalTimelineEvent[];
    conditions: MedicalCondition[];
    allergies: PatientAllergy[];
    treatments: Treatment[];
    attachments: Attachment[];
  } | null>(null);

  // Register New Patient Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    full_name: "",
    gender: "Male",
    date_of_birth: "1995-05-10",
    phone: "",
    email: "",
    blood_group: "O+",
    address: "",
    emergency_contact: "",
  });

  // Link Patient Modal
  const [linkModalPatient, setLinkModalPatient] = useState<PatientSearchResult | null>(null);
  const [linkNotes, setLinkNotes] = useState("");

  // New Treatment Modal
  const [showNewTreatmentModal, setShowNewTreatmentModal] = useState(false);
  const [newTreatmentForm, setNewTreatmentForm] = useState({
    patient_grn: "",
    chief_complaint: "",
    symptoms: "",
    clinical_observations: "",
    diagnosis: "",
    description: "",
    procedures_performed: "",
    follow_up_instructions: "",
    next_appointment_date: "",
    status: "In Progress",
  });
  const [newPrescriptions, setNewPrescriptions] = useState<
    { medication: string; dosage: string; instructions: string }[]
  >([{ medication: "", dosage: "", instructions: "" }]);

  // Treatment Details Modal
  const [activeTreatmentDetail, setActiveTreatmentDetail] = useState<Treatment | null>(null);

  // Upload Attachment Modal
  const [uploadTreatmentId, setUploadTreatmentId] = useState<number | null>(null);
  const [uploadPatientGrn, setUploadPatientGrn] = useState("");
  const [uploadCategory, setUploadCategory] = useState("X-ray");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Add Treatment Note Modal
  const [noteTreatmentId, setNoteTreatmentId] = useState<number | null>(null);
  const [noteType, setNoteType] = useState("observation");
  const [noteText, setNoteText] = useState("");

  const roleTitle = role.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Allowed modules
  const modules =
    role === "hospital_admin"
      ? ["Overview", "Patients", "Doctors", "Appointments", "Treatments", "Lab Reports", "Prescriptions", "Invoices"]
      : role === "doctor"
      ? ["Overview", "Patients", "Appointments", "Treatments", "Lab Reports", "Prescriptions"]
      : role === "nurse"
      ? ["Overview", "Patients", "Appointments"]
      : role === "lab_technician"
      ? ["Overview", "Patients", "Lab Reports"]
      : role === "pharmacist"
      ? ["Overview", "Prescriptions"]
      : role === "billing_staff"
      ? ["Overview", "Invoices"]
      : ["Overview", "Patients", "Appointments"];

  const endpoints: Record<string, string> = {
    Patients: "patients",
    Doctors: "doctors",
    Appointments: "appointments",
    Treatments: "treatments",
    "Lab Reports": "lab-reports",
    Prescriptions: "prescriptions",
    Invoices: "invoices",
  };

  const loadSummary = () => {
    apiFetch("/api/v1/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  };

  const loadModuleItems = () => {
    if (!endpoints[module]) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    apiFetch(`/api/v1/${endpoints[module]}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Failed to load data.");
        return d;
      })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadModuleItems();
  }, [module]);

  // Global Patient Search Handler
  const handlePatientSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchGrnQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingPatients(true);
    setError("");
    try {
      const res = await apiFetch(`/api/v1/patients/search?query=${encodeURIComponent(searchGrnQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed.");
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Patient search error.");
    } finally {
      setSearchingPatients(false);
    }
  };

  // Inspect Patient Full Unified History
  const inspectPatientMedicalHistory = async (patient: PatientSearchResult) => {
    setSelectedPatientForView(patient);
    setError("");
    try {
      const [histRes, timeRes, trtRes, attRes] = await Promise.all([
        apiFetch(`/api/v1/patients/${patient.grn}/medical-history`),
        apiFetch(`/api/v1/patients/${patient.grn}/medical-history/timeline`),
        apiFetch(`/api/v1/treatments`),
        apiFetch(`/api/v1/patients/${patient.grn}/attachments`),
      ]);

      const histData = histRes.ok ? await histRes.json() : {};
      const timeData = timeRes.ok ? await timeRes.json() : [];
      const trtData: Treatment[] = trtRes.ok ? await trtRes.json() : [];
      const attData = attRes.ok ? await attRes.json() : [];

      const filteredTreatments = trtData.filter((t) => t.patient_grn === patient.grn);

      setPatientHistoryModal({
        conditions: histData.conditions || [],
        allergies: histData.allergies || [],
        timeline: timeData,
        treatments: filteredTreatments,
        attachments: attData,
      });
    } catch (err) {
      setError("Failed to fetch full patient medical history.");
    }
  };

  // Register New Patient Handler
  const handleRegisterPatient = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiFetch("/api/v1/patients/register", {
        method: "POST",
        body: JSON.stringify({
          ...regForm,
          hospital_code: hospitalCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to register patient.");

      setNotice(`New patient registered successfully with permanent GRN: ${data.grn}`);
      setShowRegisterModal(false);
      setSearchGrnQuery(data.grn);
      loadModuleItems();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration error.");
    }
  };

  // Link Patient to Current Hospital Handler
  const handleLinkPatient = async (e: FormEvent) => {
    e.preventDefault();
    if (!linkModalPatient) return;
    setError("");
    try {
      const res = await apiFetch(`/api/v1/patients/${linkModalPatient.grn}/link-hospital`, {
        method: "POST",
        body: JSON.stringify({
          hospital_code: hospitalCode,
          consent_status: "granted",
          notes: linkNotes || "Patient consented to cross-hospital record sharing upon registration.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Linking failed.");

      setNotice(`Patient ${linkModalPatient.full_name} (${linkModalPatient.grn}) successfully linked to ${hospitalCode}!`);
      setLinkModalPatient(null);
      handlePatientSearch();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hospital linking error.");
    }
  };

  // Submit New Treatment
  const handleCreateTreatment = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const validPrescriptions = newPrescriptions.filter((p) => p.medication.trim().length > 0);
      const payload = {
        patient_grn: newTreatmentForm.patient_grn.trim(),
        chief_complaint: newTreatmentForm.chief_complaint,
        symptoms: newTreatmentForm.symptoms,
        clinical_observations: newTreatmentForm.clinical_observations,
        diagnosis: newTreatmentForm.diagnosis,
        description: newTreatmentForm.description,
        procedures_performed: newTreatmentForm.procedures_performed,
        follow_up_instructions: newTreatmentForm.follow_up_instructions,
        next_appointment_date: newTreatmentForm.next_appointment_date ? new Date(newTreatmentForm.next_appointment_date).toISOString() : null,
        status: newTreatmentForm.status,
        prescriptions: validPrescriptions,
      };

      const res = await apiFetch("/api/v1/treatments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create treatment.");

      setNotice(`Treatment created successfully! ID: ${data.treatment_code}`);
      setShowNewTreatmentModal(false);
      // Reset form
      setNewTreatmentForm({
        patient_grn: "",
        chief_complaint: "",
        symptoms: "",
        clinical_observations: "",
        diagnosis: "",
        description: "",
        procedures_performed: "",
        follow_up_instructions: "",
        next_appointment_date: "",
        status: "In Progress",
      });
      setNewPrescriptions([{ medication: "", dosage: "", instructions: "" }]);
      loadModuleItems();
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Treatment recording error.");
    }
  };

  // Handle Attachment Upload
  const handleUploadAttachment = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadTreatmentId || !selectedFile) {
      setError("Please select a file to upload.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_grn", uploadPatientGrn);
      formData.append("file_category", uploadCategory);
      formData.append("description", uploadDescription || selectedFile.name);

      const token = localStorage.getItem("x7_access_token");
      const res = await fetch(`/api/v1/treatments/${uploadTreatmentId}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed.");

      setNotice(`Medical file "${selectedFile.name}" uploaded successfully!`);
      setUploadTreatmentId(null);
      setSelectedFile(null);
      setUploadDescription("");
      loadModuleItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload error.");
    } finally {
      setUploading(false);
    }
  };

  // Add Treatment Note
  const handleAddTreatmentNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteTreatmentId || !noteText.trim()) return;
    try {
      const res = await apiFetch(`/api/v1/treatments/${noteTreatmentId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          note_type: noteType,
          note_text: noteText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add clinical note.");

      setNotice("Clinical observation note appended with audit trail.");
      setNoteTreatmentId(null);
      setNoteText("");
      loadModuleItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Note addition error.");
    }
  };

  const cards = [
    ["Patients", summary?.patients ?? "—", Users],
    ["Doctors", summary?.doctors ?? "—", Stethoscope],
    ["Appointments", summary?.appointments ?? "—", Activity],
    ["Active Treatments", summary?.active_treatments ?? "—", ClipboardList],
  ];

  const filtered = items.filter((it) =>
    JSON.stringify(it).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo side-logo">
          <span>X7</span>
          <div>
            <b>MEDICORE</b>
            <small>HEALTHCARE OS</small>
          </div>
        </div>

        <div className="hospital-tag-side">
          <Building2 size={14} />
          <span>Facility: {hospitalCode}</span>
        </div>

        <div className="nav-label">WORKSPACE MODULES</div>

        {modules.map((m) => (
          <button
            className={`nav-button ${module === m ? "active" : ""}`}
            onClick={() => {
              setModule(m);
              setError("");
              setNotice("");
            }}
            key={m}
          >
            {m === "Patients" ? (
              <Users size={17} />
            ) : m === "Doctors" ? (
              <Stethoscope size={17} />
            ) : m === "Appointments" ? (
              <Activity size={17} />
            ) : m === "Treatments" ? (
              <ClipboardList size={17} />
            ) : m === "Prescriptions" ? (
              <Pill size={17} />
            ) : m === "Invoices" ? (
              <FileText size={17} />
            ) : (
              <HeartPulse size={17} />
            )}{" "}
            {m}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="avatar-chip">
              {user?.full_name ? user.full_name[0] : "U"}
            </div>
            <div>
              <strong>{user?.full_name}</strong>
              <small>{roleTitle}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              X7 MEDICORE / {hospitalCode} &bull; {roleTitle.toUpperCase()}
            </span>
            <h1>{module === "Overview" ? `${roleTitle} Workspace` : module}</h1>
          </div>

          <div className="top-user-pill">
            <Building2 size={16} />
            <div className="user-info-text">
              <b>{user?.full_name}</b>
              <small>{hospitalCode}</small>
            </div>
          </div>
        </header>

        {notice && <div className="alert-message success top-space">{notice}</div>}
        {error && <div className="alert-message error top-space">{error}</div>}

        {/* OVERVIEW MODULE */}
        {module === "Overview" ? (
          <div className="overview-container">
            <section className="welcome-card staff-welcome">
              <div>
                <span className="eyebrow">AUTHORIZED CLINICAL CONSOLE</span>
                <h2>Welcome back, {user?.full_name}</h2>
                <p>
                  You are signed into facility <strong>{hospitalCode}</strong>. Manage multi-hospital patient identity,
                  review unified medical histories across facilities, and record clinical treatments.
                </p>
              </div>
              <HeartPulse size={48} className="banner-art" />
            </section>

            {/* Quick Action Toolbar */}
            <div className="staff-quick-actions-bar">
              <button
                className="btn-action-primary"
                onClick={() => {
                  setModule("Patients");
                }}
              >
                <Search size={16} /> Global Patient Search (GRN)
              </button>
              {(role === "doctor" || role === "hospital_admin") && (
                <button
                  className="btn-action-secondary"
                  onClick={() => setShowNewTreatmentModal(true)}
                >
                  <Plus size={16} /> Record New Treatment
                </button>
              )}
              {(role === "hospital_admin" || role === "nurse" || role === "doctor") && (
                <button
                  className="btn-action-outline"
                  onClick={() => setShowRegisterModal(true)}
                >
                  <IdCard size={16} /> Register Patient (New GRN)
                </button>
              )}
            </div>

            <section className="stats-row">
              {cards.map(([label, value, Icon]: any) => (
                <article className="stat-card" key={label}>
                  <div>
                    <span>{label}</span>
                    <Icon size={20} />
                  </div>
                  <strong>{value}</strong>
                  <small>Facility database</small>
                </article>
              ))}
              <article className="stat-card">
                <div>
                  <span>Total Invoiced</span>
                  <FileText size={20} />
                </div>
                <strong>₹{Number(summary?.invoices_total || 0).toLocaleString("en-IN")}</strong>
                <small>Facility billing</small>
              </article>
            </section>

            {/* Global Patient Quick Search Card */}
            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Central Patient Identity Lookup</h2>
                  <p>Search any patient across the multi-hospital network by GRN, Name, or Phone.</p>
                </div>
                <IdCard size={20} />
              </div>

              <form className="quick-search-form" onSubmit={handlePatientSearch}>
                <div className="search-input-group">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Enter GRN (e.g. XM-GRN-000001), patient name, or phone..."
                    value={searchGrnQuery}
                    onChange={(e) => setSearchGrnQuery(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={searchingPatients}>
                    {searchingPatients ? "Searching..." : "Lookup Central Record"}
                  </button>
                </div>
              </form>

              {searchResults.length > 0 && (
                <div className="search-results-table-container">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>GRN</th>
                        <th>Patient Name</th>
                        <th>Contact / Phone</th>
                        <th>Blood Group</th>
                        <th>Home Facility</th>
                        <th>Current Facility Link</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((p) => (
                        <tr key={p.grn}>
                          <td><strong className="grn-code">{p.grn}</strong></td>
                          <td><b>{p.full_name}</b></td>
                          <td>{p.phone || "—"}</td>
                          <td><span className="blood-tag">{p.blood_group || "—"}</span></td>
                          <td>{p.primary_hospital_name || p.primary_hospital_code}</td>
                          <td>
                            {p.is_linked_to_current_hospital ? (
                              <span className="status-pill active">Linked ({hospitalCode})</span>
                            ) : (
                              <span className="status-pill warning">Not Linked</span>
                            )}
                          </td>
                          <td>
                            <div className="actions-cell-btns">
                              <button
                                className="btn-sm-outline"
                                onClick={() => inspectPatientMedicalHistory(p)}
                              >
                                <Eye size={13} /> View Full History
                              </button>
                              {!p.is_linked_to_current_hospital && (
                                <button
                                  className="btn-sm-primary"
                                  onClick={() => setLinkModalPatient(p)}
                                >
                                  <ShieldCheck size={13} /> Link to {hospitalCode}
                                </button>
                              )}
                              {(role === "doctor" || role === "hospital_admin") && (
                                <button
                                  className="btn-sm-secondary"
                                  onClick={() => {
                                    setNewTreatmentForm((prev) => ({ ...prev, patient_grn: p.grn }));
                                    setShowNewTreatmentModal(true);
                                  }}
                                >
                                  <Plus size={13} /> Treat
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : module === "Treatments" ? (
          /* TREATMENTS MODULE */
          <section className="panel-box data-panel">
            <div className="panel-header">
              <div>
                <h2>Treatments & Clinical Encounters</h2>
                <p>Authorized clinical treatments and medical history entries.</p>
              </div>

              <div className="header-actions">
                <div className="table-search-box">
                  <Search size={16} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search treatments..."
                  />
                </div>

                {(role === "doctor" || role === "hospital_admin") && (
                  <button
                    className="btn-primary"
                    onClick={() => setShowNewTreatmentModal(true)}
                  >
                    <Plus size={16} /> New Clinical Treatment
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <p className="empty-message">Loading treatment records...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-message">No treatments found. Record a new treatment above.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Treatment ID</th>
                      <th>Patient GRN & Name</th>
                      <th>Facility</th>
                      <th>Doctor</th>
                      <th>Diagnosis</th>
                      <th>Visit Date</th>
                      <th>Status</th>
                      <th>Attachments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t: Treatment) => (
                      <tr key={t.id}>
                        <td><span className="code-badge">{t.treatment_code}</span></td>
                        <td>
                          <div>
                            <strong>{t.patient_name}</strong>
                            <div className="grn-sub">{t.patient_grn}</div>
                          </div>
                        </td>
                        <td>{t.hospital_name || t.hospital_id}</td>
                        <td>{t.doctor_name}</td>
                        <td><b>{t.diagnosis}</b></td>
                        <td>{new Date(t.visit_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-pill ${
                            t.status === "In Progress" ? "active" : t.status === "Completed" ? "success" : "warning"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <span className="badge-attachments-count">
                            <Layers size={13} /> {t.attachments?.length || 0}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell-btns">
                            <button
                              className="btn-sm-outline"
                              onClick={() => setActiveTreatmentDetail(t)}
                              title="View Full Details"
                            >
                              <Eye size={13} /> Details
                            </button>
                            {(role === "doctor" || role === "hospital_admin" || role === "lab_technician") && (
                              <button
                                className="btn-sm-secondary"
                                onClick={() => {
                                  setUploadTreatmentId(t.id);
                                  setUploadPatientGrn(t.patient_grn);
                                }}
                                title="Upload Medical Document / Scan"
                              >
                                <Upload size={13} /> Upload
                              </button>
                            )}
                            {role === "doctor" && (
                              <button
                                className="btn-sm-outline"
                                onClick={() => setNoteTreatmentId(t.id)}
                                title="Add Clinical Observation Note"
                              >
                                Note
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : module === "Patients" ? (
          /* PATIENTS MODULE */
          <section className="panel-box data-panel">
            <div className="panel-header">
              <div>
                <h2>Global Patient Registry & Management</h2>
                <p>Central identity management across affiliated hospital network.</p>
              </div>

              <div className="header-actions">
                <button
                  className="btn-primary"
                  onClick={() => setShowRegisterModal(true)}
                >
                  <Plus size={16} /> Register New Patient (Generate GRN)
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <form className="quick-search-form" onSubmit={handlePatientSearch}>
              <div className="search-input-group">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Lookup GRN (e.g. XM-GRN-000001), name, or phone..."
                  value={searchGrnQuery}
                  onChange={(e) => setSearchGrnQuery(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={searchingPatients}>
                  {searchingPatients ? "Searching..." : "Search Central Registry"}
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results-table-container">
                <h3>Search Results ({searchResults.length})</h3>
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>GRN</th>
                      <th>Full Name</th>
                      <th>Phone</th>
                      <th>Blood Group</th>
                      <th>Home Hospital</th>
                      <th>Facility Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p) => (
                      <tr key={p.grn}>
                        <td><strong className="grn-code">{p.grn}</strong></td>
                        <td><b>{p.full_name}</b></td>
                        <td>{p.phone || "—"}</td>
                        <td><span className="blood-tag">{p.blood_group || "—"}</span></td>
                        <td>{p.primary_hospital_name || p.primary_hospital_code}</td>
                        <td>
                          {p.is_linked_to_current_hospital ? (
                            <span className="status-pill active">Linked ({hospitalCode})</span>
                          ) : (
                            <span className="status-pill warning">External Hospital</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell-btns">
                            <button
                              className="btn-sm-outline"
                              onClick={() => inspectPatientMedicalHistory(p)}
                            >
                              <Eye size={13} /> Full Medical History
                            </button>
                            {!p.is_linked_to_current_hospital && (
                              <button
                                className="btn-sm-primary"
                                onClick={() => setLinkModalPatient(p)}
                              >
                                <ShieldCheck size={13} /> Link Hospital
                              </button>
                            )}
                            {(role === "doctor" || role === "hospital_admin") && (
                              <button
                                className="btn-sm-secondary"
                                onClick={() => {
                                  setNewTreatmentForm((prev) => ({ ...prev, patient_grn: p.grn }));
                                  setShowNewTreatmentModal(true);
                                }}
                              >
                                <Plus size={13} /> New Treatment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Local Patients Table */}
            <div className="local-patients-list-wrapper">
              <h3>Local Hospital Patients ({hospitalCode})</h3>
              {loading ? (
                <p className="empty-message">Loading patients...</p>
              ) : items.length === 0 ? (
                <p className="empty-message">No patients registered at this facility yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Local Code</th>
                        <th>Full Name</th>
                        <th>Gender</th>
                        <th>Contact</th>
                        <th>Blood Group</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((pt) => (
                        <tr key={pt.id}>
                          <td><span className="code-badge">{pt.patient_code}</span></td>
                          <td><strong>{pt.full_name}</strong></td>
                          <td>{pt.gender}</td>
                          <td>{pt.phone || "—"}</td>
                          <td><span className="blood-tag">{pt.blood_group || "—"}</span></td>
                          <td>
                            <button
                              className="btn-sm-outline"
                              onClick={() => {
                                setSearchGrnQuery(pt.full_name);
                                handlePatientSearch();
                              }}
                            >
                              <Search size={13} /> Find Central GRN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : (
          /* DEFAULT MODULE (Doctors, Appointments, Invoices, Lab Reports, Prescriptions) */
          <section className="panel-box data-panel">
            <div className="panel-header">
              <div>
                <h2>{module} Records</h2>
                <p>Authorized entries belonging to {hospitalCode}.</p>
              </div>

              <div className="header-actions">
                <div className="table-search-box">
                  <Search size={16} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search records…"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <p className="empty-message">Loading records from {hospitalCode}…</p>
            ) : filtered.length === 0 ? (
              <p className="empty-message">No records found for this module.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      {Object.keys(filtered[0])
                        .filter((k) => !["hospital_id"].includes(k))
                        .map((k) => (
                          <th key={k}>{k.replaceAll("_", " ")}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={item.id || i}>
                        {Object.keys(item)
                          .filter((k) => k !== "hospital_id")
                          .map((k) => (
                            <td key={k}>{String(item[k] ?? "—")}</td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL: Register New Patient (Generates Central GRN) */}
      {showRegisterModal && (
        <div className="modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">GLOBAL PATIENT IDENTITY</span>
                <h2>Register New Central Patient</h2>
                <p>Generates a permanent Global Registration Number (GRN) automatically.</p>
              </div>
              <button className="close-btn" onClick={() => setShowRegisterModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient}>
              <div className="modal-body form-grid-2">
                <div className="form-field full-width">
                  <label>Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="form-field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={regForm.date_of_birth}
                    onChange={(e) => setRegForm({ ...regForm, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Gender</label>
                  <select
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="form-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="patient@example.com"
                  />
                </div>

                <div className="form-field">
                  <label>Blood Group</label>
                  <select
                    value={regForm.blood_group}
                    onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Emergency Contact</label>
                  <input
                    type="tel"
                    value={regForm.emergency_contact}
                    onChange={(e) => setRegForm({ ...regForm, emergency_contact: e.target.value })}
                    placeholder="Emergency phone"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Residential Address</label>
                  <input
                    type="text"
                    value={regForm.address}
                    onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                    placeholder="Street, City, Pincode"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Generate GRN & Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Link Patient to Current Hospital */}
      {linkModalPatient && (
        <div className="modal-backdrop" onClick={() => setLinkModalPatient(null)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">CROSS-HOSPITAL RECORD LINKING</span>
                <h2>Link Patient to {hospitalCode}</h2>
                <p>Confirm consent to share centralized clinical history with this facility.</p>
              </div>
              <button className="close-btn" onClick={() => setLinkModalPatient(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLinkPatient}>
              <div className="modal-body">
                <div className="patient-link-preview-box">
                  <div><strong>Patient:</strong> {linkModalPatient.full_name}</div>
                  <div><strong>Permanent GRN:</strong> {linkModalPatient.grn}</div>
                  <div><strong>Origin Facility:</strong> {linkModalPatient.primary_hospital_name || linkModalPatient.primary_hospital_code}</div>
                  <div><strong>Target Facility:</strong> {hospitalCode}</div>
                </div>

                <div className="form-field top-space">
                  <label>Patient Consent & Authorization Notes</label>
                  <textarea
                    rows={3}
                    value={linkNotes}
                    onChange={(e) => setLinkNotes(e.target.value)}
                    placeholder="Patient verbally / physically consented to cross-hospital medical history sharing..."
                  />
                </div>

                <div className="consent-alert-box">
                  <ShieldCheck size={20} className="text-success" />
                  <span>
                    Linking this patient allows attending doctors at {hospitalCode} to view the unified medical history,
                    allergies, past treatments, and diagnostic scans under GRN {linkModalPatient.grn}.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setLinkModalPatient(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm & Link Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Full Patient Medical History */}
      {selectedPatientForView && patientHistoryModal && (
        <div className="modal-backdrop" onClick={() => { setSelectedPatientForView(null); setPatientHistoryModal(null); }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">UNIFIED CROSS-HOSPITAL MEDICAL RECORD</span>
                <h2>{selectedPatientForView.full_name} &bull; {selectedPatientForView.grn}</h2>
              </div>
              <button className="close-btn" onClick={() => { setSelectedPatientForView(null); setPatientHistoryModal(null); }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Demographics & Alerts Banner */}
              <div className="patient-modal-bio-bar">
                <div><span>GRN:</span> <strong>{selectedPatientForView.grn}</strong></div>
                <div><span>Blood Group:</span> <strong>{selectedPatientForView.blood_group || "—"}</strong></div>
                <div><span>Phone:</span> <strong>{selectedPatientForView.phone || "—"}</strong></div>
                <div><span>Primary Facility:</span> <strong>{selectedPatientForView.primary_hospital_name || selectedPatientForView.primary_hospital_code}</strong></div>
              </div>

              {/* Conditions & Allergies */}
              <div className="two-column-grid top-space">
                <div className="panel-box-sub">
                  <h4><HeartPulse size={16} /> Diagnosed Conditions ({patientHistoryModal.conditions.length})</h4>
                  {patientHistoryModal.conditions.length === 0 ? (
                    <small>No chronic conditions recorded.</small>
                  ) : (
                    <ul>
                      {patientHistoryModal.conditions.map((c) => (
                        <li key={c.id}>
                          <b>{c.condition_name}</b> ({c.status}) — {c.diagnosed_date}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="panel-box-sub">
                  <h4><AlertTriangle size={16} /> Known Allergies ({patientHistoryModal.allergies.length})</h4>
                  {patientHistoryModal.allergies.length === 0 ? (
                    <small>No allergies documented.</small>
                  ) : (
                    <ul>
                      {patientHistoryModal.allergies.map((a) => (
                        <li key={a.id}>
                          <span className="text-warning"><b>{a.allergen}</b></span>: {a.reaction} ({a.severity})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="clinical-section top-space">
                <h4><Clock size={16} /> Complete Chronological Timeline Across All Network Facilities</h4>
                <div className="modal-timeline-container">
                  {patientHistoryModal.timeline.length === 0 ? (
                    <p className="empty-message-sm">No historical events recorded.</p>
                  ) : (
                    patientHistoryModal.timeline.map((evt, i) => (
                      <div className="timeline-item-sm" key={evt.id || i}>
                        <div className="timeline-sm-badge">
                          <span>{new Date(evt.date).toLocaleDateString()}</span>
                          <span className="facility-tag">{evt.hospital_name || evt.hospital_id}</span>
                        </div>
                        <div className="timeline-sm-body">
                          <strong>{evt.title}</strong>
                          <p>{evt.description}</p>
                          {evt.doctor_name && <small>Attending: {evt.doctor_name}</small>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Scans & Attachments Gallery */}
              <div className="clinical-section">
                <h4><Layers size={16} /> Diagnostic Scans & Attached Documents ({patientHistoryModal.attachments.length})</h4>
                {patientHistoryModal.attachments.length === 0 ? (
                  <p className="empty-message-sm">No scans or documents attached.</p>
                ) : (
                  <div className="modal-attachments-grid">
                    {patientHistoryModal.attachments.map((att) => (
                      <div className="attachment-chip" key={att.id}>
                        <div>
                          <strong>{att.description || att.original_filename}</strong>
                          <small>{att.file_category} &bull; {att.hospital_id}</small>
                        </div>
                        <a
                          href={att.download_url}
                          download={att.original_filename}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-sm-primary"
                        >
                          <Download size={13} /> View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  setNewTreatmentForm((prev) => ({ ...prev, patient_grn: selectedPatientForView.grn }));
                  setSelectedPatientForView(null);
                  setPatientHistoryModal(null);
                  setShowNewTreatmentModal(true);
                }}
              >
                <Plus size={16} /> Record New Treatment for this Patient
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setSelectedPatientForView(null); setPatientHistoryModal(null); }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Clinical Treatment Form */}
      {showNewTreatmentModal && (
        <div className="modal-backdrop" onClick={() => setShowNewTreatmentModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">CLINICAL ENCOUNTER</span>
                <h2>Record New Medical Treatment</h2>
                <p>Encounters automatically save to the patient's centralized medical history under GRN.</p>
              </div>
              <button className="close-btn" onClick={() => setShowNewTreatmentModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment}>
              <div className="modal-body form-grid-2">
                <div className="form-field full-width">
                  <label>Patient Global Registration Number (GRN) *</label>
                  <input
                    type="text"
                    required
                    value={newTreatmentForm.patient_grn}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, patient_grn: e.target.value })}
                    placeholder="e.g. XM-GRN-000001"
                  />
                  <small>The patient will be automatically verified against the central database.</small>
                </div>

                <div className="form-field full-width">
                  <label>Diagnosis / Clinical Condition *</label>
                  <input
                    type="text"
                    required
                    value={newTreatmentForm.diagnosis}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, diagnosis: e.target.value })}
                    placeholder="e.g. Acute Bronchitis, Type 2 Diabetes, Knee Arthroscopy..."
                  />
                </div>

                <div className="form-field">
                  <label>Chief Complaint *</label>
                  <textarea
                    rows={2}
                    required
                    value={newTreatmentForm.chief_complaint}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, chief_complaint: e.target.value })}
                    placeholder="Patient reports persistent dry cough and low-grade fever..."
                  />
                </div>

                <div className="form-field">
                  <label>Reported Symptoms</label>
                  <textarea
                    rows={2}
                    value={newTreatmentForm.symptoms}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, symptoms: e.target.value })}
                    placeholder="Fever (38°C), sore throat, chest tightness..."
                  />
                </div>

                <div className="form-field">
                  <label>Clinical Observations / Physical Exam</label>
                  <textarea
                    rows={2}
                    value={newTreatmentForm.clinical_observations}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, clinical_observations: e.target.value })}
                    placeholder="Bilateral vesicular breath sounds, no rales. BP 120/80..."
                  />
                </div>

                <div className="form-field">
                  <label>Treatment Description</label>
                  <textarea
                    rows={2}
                    value={newTreatmentForm.description}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, description: e.target.value })}
                    placeholder="Prescribed bronchodilator inhaler and symptomatic antipyretics..."
                  />
                </div>

                <div className="form-field full-width">
                  <label>Procedures Performed</label>
                  <input
                    type="text"
                    value={newTreatmentForm.procedures_performed}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, procedures_performed: e.target.value })}
                    placeholder="e.g. Chest X-ray, Nebulization therapy, Suturing..."
                  />
                </div>

                <div className="form-field">
                  <label>Follow-up Instructions</label>
                  <input
                    type="text"
                    value={newTreatmentForm.follow_up_instructions}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, follow_up_instructions: e.target.value })}
                    placeholder="Hydration, return in 5 days if cough persists."
                  />
                </div>

                <div className="form-field">
                  <label>Next Appointment Date</label>
                  <input
                    type="datetime-local"
                    value={newTreatmentForm.next_appointment_date}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, next_appointment_date: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>Treatment Status</label>
                  <select
                    value={newTreatmentForm.status}
                    onChange={(e) => setNewTreatmentForm({ ...newTreatmentForm, status: e.target.value })}
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Follow-up Required">Follow-up Required</option>
                    <option value="Referred">Referred</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Dynamic Prescriptions Rows */}
                <div className="form-field full-width top-space">
                  <div className="section-head-row">
                    <label><b>Prescribed Medications</b></label>
                    <button
                      type="button"
                      className="btn-sm-outline"
                      onClick={() =>
                        setNewPrescriptions([
                          ...newPrescriptions,
                          { medication: "", dosage: "", instructions: "" },
                        ])
                      }
                    >
                      <Plus size={13} /> Add Medicine
                    </button>
                  </div>

                  {newPrescriptions.map((p, idx) => (
                    <div className="prescription-row-inputs" key={idx}>
                      <input
                        type="text"
                        placeholder="Medication (e.g. Amoxicillin 500mg)"
                        value={p.medication}
                        onChange={(e) => {
                          const updated = [...newPrescriptions];
                          updated[idx].medication = e.target.value;
                          setNewPrescriptions(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1 tab TDS after food)"
                        value={p.dosage}
                        onChange={(e) => {
                          const updated = [...newPrescriptions];
                          updated[idx].dosage = e.target.value;
                          setNewPrescriptions(updated);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Instructions (e.g. 5 days)"
                        value={p.instructions}
                        onChange={(e) => {
                          const updated = [...newPrescriptions];
                          updated[idx].instructions = e.target.value;
                          setNewPrescriptions(updated);
                        }}
                      />
                      {newPrescriptions.length > 1 && (
                        <button
                          type="button"
                          className="btn-row-del"
                          onClick={() => {
                            setNewPrescriptions(newPrescriptions.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowNewTreatmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Treatment & Medical History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Full Treatment Details View */}
      {activeTreatmentDetail && (
        <div className="modal-backdrop" onClick={() => setActiveTreatmentDetail(null)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">CLINICAL TREATMENT AUDIT RECORD</span>
                <h2>{activeTreatmentDetail.treatment_code} &bull; {activeTreatmentDetail.diagnosis}</h2>
              </div>
              <button className="close-btn" onClick={() => setActiveTreatmentDetail(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="treatment-modal-top-grid">
                <div>
                  <label>Patient:</label>
                  <strong>{activeTreatmentDetail.patient_name} ({activeTreatmentDetail.patient_grn})</strong>
                </div>
                <div>
                  <label>Facility:</label>
                  <strong>{activeTreatmentDetail.hospital_name || activeTreatmentDetail.hospital_id}</strong>
                </div>
                <div>
                  <label>Attending Doctor:</label>
                  <strong>{activeTreatmentDetail.doctor_name} ({activeTreatmentDetail.doctor_specialization})</strong>
                </div>
                <div>
                  <label>Visit Date:</label>
                  <strong>{new Date(activeTreatmentDetail.visit_date).toLocaleString()}</strong>
                </div>
              </div>

              <div className="clinical-section">
                <h4>Chief Complaint & Symptoms</h4>
                <p><strong>Chief Complaint:</strong> {activeTreatmentDetail.chief_complaint}</p>
                {activeTreatmentDetail.symptoms && (
                  <p><strong>Symptoms:</strong> {activeTreatmentDetail.symptoms}</p>
                )}
                {activeTreatmentDetail.clinical_observations && (
                  <p><strong>Clinical Observations:</strong> {activeTreatmentDetail.clinical_observations}</p>
                )}
              </div>

              <div className="clinical-section">
                <h4>Treatment Description & Procedures</h4>
                <p>{activeTreatmentDetail.description || "None recorded."}</p>
                {activeTreatmentDetail.procedures_performed && (
                  <p><strong>Procedures Performed:</strong> {activeTreatmentDetail.procedures_performed}</p>
                )}
                {activeTreatmentDetail.follow_up_instructions && (
                  <p><strong>Follow-up:</strong> {activeTreatmentDetail.follow_up_instructions}</p>
                )}
              </div>

              {/* Prescriptions */}
              <div className="clinical-section">
                <h4>Prescriptions ({activeTreatmentDetail.prescriptions?.length || 0})</h4>
                {(!activeTreatmentDetail.prescriptions || activeTreatmentDetail.prescriptions.length === 0) ? (
                  <p className="empty-message-sm">No prescriptions recorded.</p>
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
                      {activeTreatmentDetail.prescriptions.map((pr, idx) => (
                        <tr key={pr.id || idx}>
                          <td><strong>{pr.medication}</strong></td>
                          <td>{pr.dosage}</td>
                          <td>{pr.instructions || "Standard"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Attachments */}
              <div className="clinical-section">
                <div className="section-head-row">
                  <h4>Attached Diagnostic Scans & Reports ({activeTreatmentDetail.attachments?.length || 0})</h4>
                  <button
                    className="btn-sm-primary"
                    onClick={() => {
                      setUploadTreatmentId(activeTreatmentDetail.id);
                      setUploadPatientGrn(activeTreatmentDetail.patient_grn);
                    }}
                  >
                    <Upload size={13} /> Add Attachment
                  </button>
                </div>
                {(!activeTreatmentDetail.attachments || activeTreatmentDetail.attachments.length === 0) ? (
                  <p className="empty-message-sm">No files uploaded.</p>
                ) : (
                  <div className="treatment-attachments-list">
                    {activeTreatmentDetail.attachments.map((att) => (
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

              {/* Clinical Notes & Audit Corrections */}
              <div className="clinical-section">
                <h4>Clinical Notes & Audit Corrections ({activeTreatmentDetail.notes?.length || 0})</h4>
                {(!activeTreatmentDetail.notes || activeTreatmentDetail.notes.length === 0) ? (
                  <p className="empty-message-sm">No additional clinical notes recorded.</p>
                ) : (
                  <div className="notes-list">
                    {activeTreatmentDetail.notes.map((n) => (
                      <div className="note-item" key={n.id}>
                        <div className="note-top">
                          <span className="code-badge">{n.note_type}</span>
                          <small>{new Date(n.created_at).toLocaleString()}</small>
                        </div>
                        <p>{n.note_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveTreatmentDetail(null)}>
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload Medical Document / Scan */}
      {uploadTreatmentId && (
        <div className="modal-backdrop" onClick={() => setUploadTreatmentId(null)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">FILE STORAGE ATTACHMENT</span>
                <h2>Upload Medical Scan / Report</h2>
                <p>Treatment #{uploadTreatmentId} &bull; Patient GRN: {uploadPatientGrn}</p>
              </div>
              <button className="close-btn" onClick={() => setUploadTreatmentId(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadAttachment}>
              <div className="modal-body form-grid-2">
                <div className="form-field full-width">
                  <label>Document Category *</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                  >
                    <option value="X-ray">X-ray</option>
                    <option value="MRI">MRI Scan</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="Blood Test Report">Blood Test Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Medical Certificate">Medical Certificate</option>
                    <option value="Clinical Photograph">Clinical Photograph</option>
                    <option value="Other Medical Documents">Other Medical Documents</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>File Description / Diagnostic Findings</label>
                  <input
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="e.g. Chest AP view showing mild bronchial thickening"
                  />
                </div>

                <div className="form-field full-width">
                  <label>Select File (JPG, PNG, PDF, DICOM max 20MB) *</label>
                  <input
                    type="file"
                    required
                    accept=".jpg,.jpeg,.png,.pdf,.webp,.dcm"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setUploadTreatmentId(null)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? "Uploading & Storing..." : "Upload Attachment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Clinical Note */}
      {noteTreatmentId && (
        <div className="modal-backdrop" onClick={() => setNoteTreatmentId(null)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">AUDITABLE CLINICAL NOTE</span>
                <h2>Add Clinical Observation / Correction</h2>
                <p>Treatment #{noteTreatmentId}</p>
              </div>
              <button className="close-btn" onClick={() => setNoteTreatmentId(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTreatmentNote}>
              <div className="modal-body form-grid-2">
                <div className="form-field full-width">
                  <label>Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                  >
                    <option value="observation">Clinical Observation</option>
                    <option value="consultation">Specialist Consultation</option>
                    <option value="follow_up">Follow-up Note</option>
                    <option value="correction">Audit Correction</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label>Clinical Note Text *</label>
                  <textarea
                    rows={4}
                    required
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter observation, symptom change, or clinical correction reason..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setNoteTreatmentId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Note to Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
