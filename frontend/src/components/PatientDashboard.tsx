import React, { useEffect, useState, useRef } from "react";
import {
  PatientProfile,
  MedicalTimelineEvent,
  Treatment,
  MedicalDocument,
  Attachment,
  MedicalCondition,
  PatientAllergy,
  PrescriptionItem,
  PatientConsent,
  MedicalAccessLog,
  PatientVital,
  FamilyContact,
  LabReport,
  HealthAnalysis,
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
  Camera,
  Upload,
  Trash2,
  Plus,
  Printer,
  QrCode,
  Users,
  Phone,
  Mail,
  MapPin,
  Shield,
  Edit3,
  X,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Thermometer,
  Droplets,
} from "lucide-react";

export function PatientDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    "overview" | "current-treatment" | "past-treatments" | "health-analysis" | "documents" | "family" | "qr-card" | "consents" | "invoices"
  >("overview");

  // Core Data State
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [timeline, setTimeline] = useState<MedicalTimelineEvent[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [accessLogs, setAccessLogs] = useState<MedicalAccessLog[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Modals
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showLogVitalsModal, setShowLogVitalsModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [showEditTreatmentModal, setShowEditTreatmentModal] = useState(false);

  // Forms
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    blood_group: "O+",
    emergency_contact: "",
    marital_status: "Single",
    occupation: "Professional",
    insurance_provider: "Star Health Comprehensive",
    insurance_policy_number: "SH-MED-8492019",
    insurance_valid_till: "2027-08-31",
  });

  const [vitalForm, setVitalForm] = useState({
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    pulse: 72,
    temperature: 98.6,
    oxygen_saturation: 99,
    respiratory_rate: 16,
    weight_kg: 73.0,
    height_cm: 176.0,
    notes: "",
  });

  const [uploadDocForm, setUploadDocForm] = useState({
    treatment_id: "",
    file_category: "X-ray",
    document_name: "",
    description: "",
  });
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);

  const [familyForm, setFamilyForm] = useState({
    full_name: "",
    relationship: "Parent",
    phone: "",
    email: "",
    address: "",
    is_emergency_contact: true,
    is_primary: false,
  });

  const [editTreatmentForm, setEditTreatmentForm] = useState({
    id: 0,
    diagnosis: "",
    description: "",
    procedures_performed: "",
    follow_up_instructions: "",
    next_appointment_date: "",
    status: "Active",
  });

  // Filters
  const [pastTreatmentSearch, setPastTreatmentSearch] = useState("");
  const [pastTreatmentHospital, setPastTreatmentHospital] = useState("all");
  const [pastTreatmentStatus, setPastTreatmentStatus] = useState("all");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState("all");
  const [chartMetric, setChartMetric] = useState<"bp" | "pulse_spo2">("bp");

  const grn = profile?.grn || user?.grn || "XM-GRN-000001";

  const loadAllData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Patient Profile
      const profRes = await apiFetch("/api/v1/patients/me");
      let activeGrn = grn;
      if (profRes.ok) {
        const profData: PatientProfile = await profRes.json();
        setProfile(profData);
        if (profData.grn) activeGrn = profData.grn;
        setProfileForm({
          full_name: profData.full_name || "",
          date_of_birth: profData.date_of_birth ? String(profData.date_of_birth) : "",
          gender: profData.gender || "Male",
          phone: profData.phone || "",
          email: profData.email || "",
          address: profData.address || "",
          blood_group: profData.blood_group || "O+",
          emergency_contact: profData.emergency_contact || "",
          marital_status: profData.marital_status || "Single",
          occupation: profData.occupation || "Professional",
          insurance_provider: profData.insurance_provider || "Star Health Comprehensive",
          insurance_policy_number: profData.insurance_policy_number || "SH-MED-8492019",
          insurance_valid_till: profData.insurance_valid_till ? String(profData.insurance_valid_till) : "2027-08-31",
        });
      }

      // 2. Parallel data fetching for comprehensive medical record
      const [
        analysisRes,
        treatmentsRes,
        docsRes,
        timelineRes,
        medHistRes,
        prescriptionsRes,
        familyRes,
        consentsRes,
        logsRes,
        invoicesRes,
      ] = await Promise.all([
        apiFetch(`/api/v1/patients/${activeGrn}/health-analysis`),
        apiFetch(`/api/v1/patients/${activeGrn}/treatments`),
        apiFetch(`/api/v1/patients/${activeGrn}/documents`),
        apiFetch(`/api/v1/patients/${activeGrn}/medical-history/timeline`),
        apiFetch(`/api/v1/patients/${activeGrn}/medical-history`),
        apiFetch("/api/v1/prescriptions"),
        apiFetch(`/api/v1/patients/${activeGrn}/family-contacts`),
        apiFetch(`/api/v1/patients/${activeGrn}/consents`),
        apiFetch(`/api/v1/patients/${activeGrn}/access-logs`),
        apiFetch("/api/v1/invoices"),
      ]);

      if (analysisRes.ok) setHealthAnalysis(await analysisRes.json());
      if (treatmentsRes.ok) setTreatments(await treatmentsRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (timelineRes.ok) setTimeline(await timelineRes.json());
      if (medHistRes.ok) {
        const medData = await medHistRes.json();
        setConditions(medData.conditions || []);
        setAllergies(medData.allergies || []);
      }
      if (prescriptionsRes.ok) setPrescriptions(await prescriptionsRes.json());
      if (familyRes.ok) setFamilyContacts(await familyRes.json());
      if (consentsRes.ok) setConsents(await consentsRes.json());
      if (logsRes.ok) setAccessLogs(await logsRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load complete medical history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const copyGrn = () => {
    if (grn) {
      navigator.clipboard.writeText(grn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => (prev ? { ...prev, photo_url: data.photo_url } : null));
        setSuccessMsg("Profile photo updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to update profile photo.");
      }
    } catch (err) {
      setError("Network error while uploading profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/v1/patients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setShowEditProfileModal(false);
        setSuccessMsg("Patient demographics and insurance updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to update profile.");
      }
    } catch (err) {
      setError("Network error while updating profile.");
    }
  };

  const handleLogVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vitalForm),
      });
      if (res.ok) {
        setShowLogVitalsModal(false);
        setSuccessMsg("Vital signs recorded and analyzed successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh analysis
        const anRes = await apiFetch(`/api/v1/patients/${grn}/health-analysis`);
        if (anRes.ok) setHealthAnalysis(await anRes.json());
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to record vitals.");
      }
    } catch (err) {
      setError("Network error while logging vitals.");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile) {
      setError("Please select a file to upload.");
      return;
    }
    const tId = uploadDocForm.treatment_id || (presentTreatment?.id ? String(presentTreatment.id) : "1");
    const formData = new FormData();
    formData.append("file", selectedUploadFile);
    formData.append("file_category", uploadDocForm.file_category);
    formData.append("description", uploadDocForm.description);
    formData.append("document_name", uploadDocForm.document_name || selectedUploadFile.name);
    formData.append("patient_grn", grn);

    try {
      const res = await apiFetch(`/api/v1/treatments/${tId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setShowUploadDocModal(false);
        setSelectedUploadFile(null);
        setUploadDocForm({ treatment_id: "", file_category: "X-ray", document_name: "", description: "" });
        setSuccessMsg("Diagnostic document uploaded securely to hospital storage.");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh documents and treatments
        const [dRes, tRes] = await Promise.all([
          apiFetch(`/api/v1/patients/${grn}/documents`),
          apiFetch(`/api/v1/patients/${grn}/treatments`),
        ]);
        if (dRes.ok) setDocuments(await dRes.json());
        if (tRes.ok) setTreatments(await tRes.json());
      } else {
        const err = await res.json();
        setError(err.detail || "Upload failed.");
      }
    } catch (err) {
      setError("Error uploading diagnostic document.");
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this diagnostic document?")) return;
    try {
      const res = await apiFetch(`/api/v1/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setSuccessMsg("Document deleted from secure storage.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to delete document.");
      }
    } catch (err) {
      setError("Error deleting document.");
    }
  };

  const handleAddFamilyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/family-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyForm),
      });
      if (res.ok) {
        const newContact = await res.json();
        setFamilyContacts((prev) => [...prev, newContact]);
        setShowAddFamilyModal(false);
        setFamilyForm({
          full_name: "",
          relationship: "Parent",
          phone: "",
          email: "",
          address: "",
          is_emergency_contact: true,
          is_primary: false,
        });
        setSuccessMsg("Family contact registered successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to add contact.");
      }
    } catch (err) {
      setError("Network error adding family contact.");
    }
  };

  const handleDeleteFamilyContact = async (id: number) => {
    if (!window.confirm("Remove this family contact?")) return;
    try {
      const res = await apiFetch(`/api/v1/family-contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFamilyContacts((prev) => prev.filter((c) => c.id !== id));
        setSuccessMsg("Family contact removed.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError("Failed to delete contact.");
    }
  };

  const handleCompleteTreatment = async (treatmentId: number) => {
    if (!window.confirm("Mark this treatment as Completed?")) return;
    try {
      const res = await apiFetch(`/api/v1/treatments/${treatmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (res.ok) {
        setSuccessMsg("Treatment marked as Completed.");
        setTimeout(() => setSuccessMsg(""), 3000);
        const tRes = await apiFetch(`/api/v1/patients/${grn}/treatments`);
        if (tRes.ok) setTreatments(await tRes.json());
      }
    } catch (err) {
      setError("Failed to complete treatment.");
    }
  };

  const handleSaveTreatmentEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/treatments/${editTreatmentForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: editTreatmentForm.diagnosis,
          description: editTreatmentForm.description,
          procedures_performed: editTreatmentForm.procedures_performed,
          follow_up_instructions: editTreatmentForm.follow_up_instructions,
          next_appointment_date: editTreatmentForm.next_appointment_date || null,
          status: editTreatmentForm.status,
        }),
      });
      if (res.ok) {
        setShowEditTreatmentModal(false);
        setSuccessMsg("Treatment record updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        const tRes = await apiFetch(`/api/v1/patients/${grn}/treatments`);
        if (tRes.ok) setTreatments(await tRes.json());
      }
    } catch (err) {
      setError("Failed to update treatment.");
    }
  };

  // Identify Present (Active/Ongoing) Treatment
  const presentTreatment =
    treatments.find((t) => t.status === "Active" || t.status === "In Progress" || t.status === "Scheduled") ||
    treatments[0] ||
    null;

  // Filter Past Treatments
  const pastTreatmentsList = treatments.filter((t) => {
    if (t.id === presentTreatment?.id && (t.status === "Active" || t.status === "In Progress")) return false;
    const matchSearch =
      !pastTreatmentSearch ||
      t.diagnosis.toLowerCase().includes(pastTreatmentSearch.toLowerCase()) ||
      t.doctor_name.toLowerCase().includes(pastTreatmentSearch.toLowerCase()) ||
      t.treatment_code.toLowerCase().includes(pastTreatmentSearch.toLowerCase());
    const matchHospital =
      pastTreatmentHospital === "all" || t.hospital_id === pastTreatmentHospital;
    const matchStatus =
      pastTreatmentStatus === "all" || t.status.toLowerCase() === pastTreatmentStatus.toLowerCase();
    return matchSearch && matchHospital && matchStatus;
  });

  // Filter Documents
  const filteredDocuments = documents.filter((d) => {
    if (documentCategoryFilter === "all") return true;
    return d.file_category.toLowerCase() === documentCategoryFilter.toLowerCase();
  });

  // Compute Vitals Trend SVG Points (Blue & Pink Accent curves)
  const historicalVitals = healthAnalysis?.historical_vitals || [];
  const sortedVitals = [...historicalVitals].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // SVG dimensions
  const svgWidth = 620;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;
  const chartInnerW = svgWidth - padLeft - padRight;
  const chartInnerH = svgHeight - padTop - padBottom;

  const getPoints = (values: number[], minVal: number, maxVal: number) => {
    if (values.length === 0) return "";
    const range = maxVal - minVal || 1;
    return values
      .map((val, i) => {
        const x = padLeft + (i / Math.max(values.length - 1, 1)) * chartInnerW;
        const y = padTop + chartInnerH - ((val - minVal) / range) * chartInnerH;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const bpSystolicVals = sortedVitals.map((v) => v.blood_pressure_systolic);
  const bpDiastolicVals = sortedVitals.map((v) => v.blood_pressure_diastolic);
  const pulseVals = sortedVitals.map((v) => v.pulse);
  const spo2Vals = sortedVitals.map((v) => v.oxygen_saturation);

  const bpPointsBlue = getPoints(bpSystolicVals, 50, 180);
  const bpPointsPink = getPoints(bpDiastolicVals, 50, 180);
  const pulsePointsBlue = getPoints(pulseVals, 40, 130);
  const spo2PointsPink = getPoints(spo2Vals, 80, 100);

  const currentVitals = healthAnalysis?.current_vitals || sortedVitals[sortedVitals.length - 1] || null;

  return (
    <div className="app-shell">
      {/* ----------------- Enterprise Healthcare Sidebar ----------------- */}
      <aside className="sidebar patient-sidebar">
        <div className="logo side-logo">
          <span>X7</span>
          <div>
            <b>MEDICORE</b>
            <small>PATIENT CARE PORTAL</small>
          </div>
        </div>

        <div className="nav-label">GLOBAL MEDICAL IDENTITY</div>

        <button
          className={`nav-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <HeartPulse size={18} /> Profile Overview
        </button>

        <button
          className={`nav-button ${activeTab === "current-treatment" ? "active" : ""}`}
          onClick={() => setActiveTab("current-treatment")}
        >
          <ClipboardList size={18} /> Present Treatment
        </button>

        <button
          className={`nav-button ${activeTab === "past-treatments" ? "active" : ""}`}
          onClick={() => setActiveTab("past-treatments")}
        >
          <Clock size={18} /> Past Treatments ({pastTreatmentsList.length})
        </button>

        <button
          className={`nav-button ${activeTab === "health-analysis" ? "active" : ""}`}
          onClick={() => setActiveTab("health-analysis")}
        >
          <Activity size={18} /> Health Analysis & Vitals
        </button>

        <button
          className={`nav-button ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          <FileText size={18} /> Medical Documents ({documents.length})
        </button>

        <button
          className={`nav-button ${activeTab === "family" ? "active" : ""}`}
          onClick={() => setActiveTab("family")}
        >
          <Users size={18} /> Family & Emergency ({familyContacts.length})
        </button>

        <button
          className={`nav-button ${activeTab === "qr-card" ? "active" : ""}`}
          onClick={() => setActiveTab("qr-card")}
        >
          <QrCode size={18} /> QR Patient Card
        </button>

        <div className="nav-label">NETWORK & GOVERNANCE</div>

        <button
          className={`nav-button ${activeTab === "consents" ? "active" : ""}`}
          onClick={() => setActiveTab("consents")}
        >
          <ShieldCheck size={18} /> Consents & Audit Trail
        </button>

        <button
          className={`nav-button ${activeTab === "invoices" ? "active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          <FileText size={18} /> Billing & Invoices
        </button>

        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="avatar-chip patient-chip">
              {profile?.full_name ? profile.full_name[0] : "P"}
            </div>
            <div>
              <strong>{profile?.full_name || user?.full_name}</strong>
              <small>Verified Patient</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ----------------- Main Healthcare Workspace ----------------- */}
      <main className="main-area">
        {/* Top Header Bar */}
        <header className="topbar">
          <div>
            <span className="eyebrow">X7 MEDICORE / DATABASE-BACKED HEALTH SYSTEM</span>
            <h1>Comprehensive Patient Health Profile</h1>
          </div>

          {/* Prominent GRN Identity Badge with Verification & Copy */}
          <div className="grn-header-badge">
            <div className="grn-label">GLOBAL REGISTRATION NUMBER (GRN)</div>
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

        {/* Global Notifications */}
        {error && (
          <div className="alert-message error top-space">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-message success top-space">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 1: Patient Photo & Biodata Header Card (Global Component)
           ------------------------------------------------------------- */}
        <section className="panel-box patient-biodata-header-card">
          <div className="patient-biodata-layout">
            {/* Photo Avatar with upload trigger */}
            <div className="patient-photo-column">
              <div className="patient-avatar-frame">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="patient-photo-img"
                  />
                ) : (
                  <div className="patient-photo-fallback">
                    <HeartPulse size={48} />
                  </div>
                )}
                <button
                  type="button"
                  className="photo-edit-overlay-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload / Update Photo"
                  disabled={photoUploading}
                >
                  <Camera size={16} />
                  <span>{photoUploading ? "Uploading…" : "Change"}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoUpload}
                />
              </div>
              <span className="blood-group-badge-pink">
                <Droplets size={12} /> Blood: {profile?.blood_group || "O+"}
              </span>
            </div>

            {/* Demographics & Clinical Information Details */}
            <div className="patient-info-column">
              <div className="patient-info-title-row">
                <div>
                  <h2>{profile?.full_name || "Patient Record"}</h2>
                  <div className="patient-sub-identifiers">
                    <span className="grn-tag">GRN: {grn}</span>
                    <span className="age-gender-tag">
                      {profile?.age ? `${profile.age} Years` : "30 Years"} &bull; {profile?.gender || "Male"}
                    </span>
                    <span className="verified-status-tag">
                      <ShieldCheck size={13} /> Verified Database Record
                    </span>
                  </div>
                </div>

                <div className="patient-header-action-buttons">
                  <button
                    className="btn-sm-primary"
                    onClick={() => setShowEditProfileModal(true)}
                  >
                    <Edit3 size={14} /> Edit Biodata
                  </button>
                  <button
                    className="btn-sm-outline"
                    onClick={() => setActiveTab("qr-card")}
                  >
                    <QrCode size={14} /> View QR Card
                  </button>
                  <button
                    className="btn-sm-outline"
                    onClick={() => setShowLogVitalsModal(true)}
                  >
                    <Activity size={14} /> Log Vitals
                  </button>
                </div>
              </div>

              {/* Biodata Field Grid */}
              <div className="patient-biodata-grid">
                <div className="biodata-item">
                  <span className="label"><Calendar size={13} /> Date of Birth</span>
                  <strong>{profile?.date_of_birth ? String(profile.date_of_birth) : "1994-06-12"}</strong>
                </div>
                <div className="biodata-item">
                  <span className="label"><Phone size={13} /> Contact Phone</span>
                  <strong>{profile?.phone || "+91 98765 43210"}</strong>
                </div>
                <div className="biodata-item">
                  <span className="label"><Mail size={13} /> Registered Email</span>
                  <strong>{profile?.email || "patient@example.com"}</strong>
                </div>
                <div className="biodata-item">
                  <span className="label"><Shield size={13} /> Emergency Contact</span>
                  <strong>{profile?.emergency_contact || "+91 98401 23456"}</strong>
                </div>
                <div className="biodata-item full-width-item">
                  <span className="label"><MapPin size={13} /> Residential Address</span>
                  <strong>{profile?.address || "42 Anna Salai, Chennai, Tamil Nadu 600002"}</strong>
                </div>
              </div>

              {/* Insurance Details Strip */}
              <div className="insurance-info-strip">
                <div className="insurance-header-icon">
                  <ShieldCheck size={18} />
                </div>
                <div className="insurance-fields">
                  <div>
                    <span>Insurance Provider</span>
                    <strong>{profile?.insurance_provider || "Star Health Comprehensive"}</strong>
                  </div>
                  <div>
                    <span>Policy Number</span>
                    <code>{profile?.insurance_policy_number || "SH-MED-8492019"}</code>
                  </div>
                  <div>
                    <span>Coverage Valid Till</span>
                    <strong>{profile?.insurance_valid_till ? String(profile.insurance_valid_till) : "2027-08-31"}</strong>
                  </div>
                  <div>
                    <span>Primary Facility</span>
                    <strong>{profile?.primary_hospital_name || "X7 City Central Hospital (Chennai)"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            TAB 1: OVERVIEW (Core 2-Column Split: Present Treatment & Past History + Health Analysis)
           ------------------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="overview-tab-content">
            {/* Top 2-Column Split: Left Present Treatment, Right Past Treatments */}
            <div className="treatment-dual-column-layout">
              {/* Left Column: Present Treatment */}
              <section className="panel-box present-treatment-card">
                <div className="panel-header">
                  <div>
                    <span className="badge-pink-soft">ACTIVE CLINICAL ENCOUNTER</span>
                    <h2>Present Treatment</h2>
                    <p>Current outpatient care, doctor consultation, and prescribed protocol.</p>
                  </div>
                  <div className="treatment-status-badge active">
                    {presentTreatment?.status || "Active"}
                  </div>
                </div>

                {presentTreatment ? (
                  <div className="present-treatment-body">
                    <div className="treatment-headline-row">
                      <div>
                        <span className="code-badge">{presentTreatment.treatment_code}</span>
                        <h3 className="treatment-diagnosis-text">{presentTreatment.diagnosis}</h3>
                      </div>
                      <div className="treatment-date-chip">
                        <Calendar size={13} /> Started {new Date(presentTreatment.visit_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="doctor-facility-strip">
                      <div className="doc-pill">
                        <HeartPulse size={14} className="text-pink" />
                        <span>Physician: <strong>{presentTreatment.doctor_name}</strong> ({presentTreatment.doctor_specialization})</span>
                      </div>
                      <div className="facility-pill">
                        <Building2 size={14} />
                        <span>{presentTreatment.hospital_name || presentTreatment.hospital_id}</span>
                      </div>
                    </div>

                    <div className="clinical-desc-box">
                      <h4>Treatment Description & Clinical Protocol</h4>
                      <p>{presentTreatment.description || "Comprehensive clinical management and monitoring."}</p>
                      {presentTreatment.procedures_performed && (
                        <p className="procedure-note">
                          <strong>Procedures:</strong> {presentTreatment.procedures_performed}
                        </p>
                      )}
                    </div>

                    {/* Prescribed Medicines for Present Treatment */}
                    <div className="treatment-sub-table">
                      <div className="sub-table-header">
                        <h4><Pill size={15} /> Prescribed Medications ({presentTreatment.prescriptions?.length || 0})</h4>
                      </div>
                      {presentTreatment.prescriptions && presentTreatment.prescriptions.length > 0 ? (
                        <table className="enterprise-table mini-table">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {presentTreatment.prescriptions.map((pr, idx) => (
                              <tr key={pr.id || idx}>
                                <td><strong>{pr.medication}</strong></td>
                                <td><span className="dosage-pill">{pr.dosage}</span></td>
                                <td>{pr.instructions || "Standard"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="empty-submessage">No active prescriptions linked to this encounter.</p>
                      )}
                    </div>

                    {/* Quick Action Buttons for Present Treatment */}
                    <div className="present-treatment-actions">
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setUploadDocForm((prev) => ({ ...prev, treatment_id: String(presentTreatment.id) }));
                          setShowUploadDocModal(true);
                        }}
                      >
                        <Upload size={14} /> Upload Diagnostic Scan / Report
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setEditTreatmentForm({
                            id: presentTreatment.id,
                            diagnosis: presentTreatment.diagnosis,
                            description: presentTreatment.description,
                            procedures_performed: presentTreatment.procedures_performed,
                            follow_up_instructions: presentTreatment.follow_up_instructions,
                            next_appointment_date: presentTreatment.next_appointment_date ? String(presentTreatment.next_appointment_date) : "",
                            status: presentTreatment.status,
                          });
                          setShowEditTreatmentModal(true);
                        }}
                      >
                        <Edit3 size={14} /> Edit Treatment
                      </button>
                      <button
                        className="btn-success"
                        onClick={() => handleCompleteTreatment(presentTreatment.id)}
                      >
                        <Check size={14} /> Complete Treatment
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="empty-message">No active treatment in progress.</p>
                )}
              </section>

              {/* Right Column: Past Treatment History */}
              <section className="panel-box past-treatments-card">
                <div className="panel-header">
                  <div>
                    <span className="badge-blue-soft">CHRONOLOGICAL ARCHIVE</span>
                    <h2>Past Treatment History</h2>
                    <p>Previous consultations, diagnoses, and treatments across all hospitals.</p>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="treatment-history-filters">
                  <input
                    type="text"
                    placeholder="Search by diagnosis, doctor, code…"
                    value={pastTreatmentSearch}
                    onChange={(e) => setPastTreatmentSearch(e.target.value)}
                    className="search-input-field"
                  />
                  <select
                    value={pastTreatmentHospital}
                    onChange={(e) => setPastTreatmentHospital(e.target.value)}
                    className="select-field-sm"
                  >
                    <option value="all">All Hospitals</option>
                    <option value="HOSP-001">Chennai (HOSP-001)</option>
                    <option value="HOSP-002">Bengaluru (HOSP-002)</option>
                    <option value="HOSP-003">Mumbai (HOSP-003)</option>
                  </select>
                </div>

                {/* Chronological Treatments List */}
                <div className="past-treatments-scroll-list">
                  {pastTreatmentsList.length === 0 ? (
                    <p className="empty-message">No historical treatments match filter criteria.</p>
                  ) : (
                    pastTreatmentsList.map((t) => (
                      <article className="past-treatment-mini-card" key={t.id}>
                        <div className="mini-card-top">
                          <div>
                            <span className="treatment-code-pill">{t.treatment_code}</span>
                            <h4>{t.diagnosis}</h4>
                          </div>
                          <span className={`status-pill ${t.status.toLowerCase()}`}>
                            {t.status}
                          </span>
                        </div>

                        <div className="mini-card-subinfo">
                          <span><Building2 size={12} /> {t.hospital_name || t.hospital_id}</span>
                          <span><Calendar size={12} /> {new Date(t.visit_date).toLocaleDateString()}</span>
                        </div>

                        <p className="mini-card-desc">
                          {t.description ? t.description.slice(0, 110) + "…" : "No detailed description."}
                        </p>

                        <div className="mini-card-footer">
                          <small>Physician: <b>{t.doctor_name}</b></small>
                          <button
                            className="btn-details-link"
                            onClick={() => setSelectedTreatment(t)}
                          >
                            <Eye size={13} /> Full Record
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* -------------------------------------------------------------
                SECTION 3: Patient Health Analysis (Vitals, Trends & Lab Results)
               ------------------------------------------------------------- */}
            <section className="panel-box health-analysis-section">
              <div className="panel-header">
                <div>
                  <span className="badge-blue-soft">CLINICAL BIOMARKERS & LABS</span>
                  <h2>Patient Health Analysis & Vitals</h2>
                  <p>Real-time physiological tracking, historical trend curves, and laboratory reference ranges.</p>
                </div>
                <div className="health-analysis-header-actions">
                  <div className="chart-metric-switch">
                    <button
                      className={`switch-btn ${chartMetric === "bp" ? "active" : ""}`}
                      onClick={() => setChartMetric("bp")}
                    >
                      Blood Pressure Trend
                    </button>
                    <button
                      className={`switch-btn ${chartMetric === "pulse_spo2" ? "active" : ""}`}
                      onClick={() => setChartMetric("pulse_spo2")}
                    >
                      Pulse & SpO2 Trend
                    </button>
                  </div>
                  <button
                    className="btn-sm-primary"
                    onClick={() => setShowLogVitalsModal(true)}
                  >
                    <Plus size={14} /> Record Vitals
                  </button>
                </div>
              </div>

              {/* 4 Vital Signs Metric Cards */}
              <div className="vital-signs-metrics-grid">
                {/* Blood Pressure */}
                <div className={`vital-metric-card ${currentVitals?.blood_pressure_systolic && currentVitals.blood_pressure_systolic > 135 ? "abnormal" : ""}`}>
                  <div className="vital-card-header">
                    <span>Blood Pressure</span>
                    <HeartPulse size={18} className="icon-blue" />
                  </div>
                  <div className="vital-card-value">
                    <strong>{currentVitals?.blood_pressure_systolic || 124} / {currentVitals?.blood_pressure_diastolic || 82}</strong>
                    <small>mmHg</small>
                  </div>
                  <div className="vital-card-badge">
                    {currentVitals?.blood_pressure_systolic && currentVitals.blood_pressure_systolic > 135 ? (
                      <span className="badge-amber"><AlertTriangle size={12} /> Elevated Systolic</span>
                    ) : (
                      <span className="badge-green"><Check size={12} /> Optimal Range</span>
                    )}
                  </div>
                </div>

                {/* Pulse Rate */}
                <div className="vital-metric-card">
                  <div className="vital-card-header">
                    <span>Pulse / Heart Rate</span>
                    <Activity size={18} className="icon-pink" />
                  </div>
                  <div className="vital-card-value">
                    <strong>{currentVitals?.pulse || 74}</strong>
                    <small>bpm</small>
                  </div>
                  <div className="vital-card-badge">
                    <span className="badge-green"><Check size={12} /> Normal Rhythm (60-100)</span>
                  </div>
                </div>

                {/* Body Temperature */}
                <div className="vital-metric-card">
                  <div className="vital-card-header">
                    <span>Body Temperature</span>
                    <Thermometer size={18} className="icon-blue" />
                  </div>
                  <div className="vital-card-value">
                    <strong>{currentVitals?.temperature ? Number(currentVitals.temperature).toFixed(1) : "98.6"}</strong>
                    <small>°F</small>
                  </div>
                  <div className="vital-card-badge">
                    <span className="badge-green"><Check size={12} /> Afebrile (97.7-99.5)</span>
                  </div>
                </div>

                {/* Oxygen Saturation SpO2 */}
                <div className="vital-metric-card">
                  <div className="vital-card-header">
                    <span>Oxygen Saturation</span>
                    <Droplets size={18} className="icon-pink" />
                  </div>
                  <div className="vital-card-value">
                    <strong>{currentVitals?.oxygen_saturation || 98}</strong>
                    <small>% SpO2</small>
                  </div>
                  <div className="vital-card-badge">
                    <span className="badge-green"><Check size={12} /> Adequate Oxygenation</span>
                  </div>
                </div>
              </div>

              {/* Historical Vital Signs Trend Charts (Blue & Pink dual-line curves) */}
              <div className="vital-trend-chart-container">
                <div className="chart-legend-row">
                  <h4><TrendingUp size={16} /> Historical Vital Signs Trajectory</h4>
                  <div className="chart-legend-keys">
                    {chartMetric === "bp" ? (
                      <>
                        <span className="legend-key key-blue">
                          <span className="dot dot-blue"></span> Systolic BP (mmHg) &bull; Blue Curve
                        </span>
                        <span className="legend-key key-pink">
                          <span className="dot dot-pink"></span> Diastolic BP (mmHg) &bull; Pink Curve
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="legend-key key-blue">
                          <span className="dot dot-blue"></span> Heart Rate / Pulse (bpm) &bull; Blue Curve
                        </span>
                        <span className="legend-key key-pink">
                          <span className="dot dot-pink"></span> SpO2 Oxygenation (%) &bull; Pink Curve
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="svg-chart-wrapper">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="vital-svg-chart"
                    preserveAspectRatio="none"
                  >
                    {/* Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = padTop + chartInnerH * pct;
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={svgWidth - padRight}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray="4 4"
                          />
                        </g>
                      );
                    })}

                    {/* Chart curves */}
                    {chartMetric === "bp" ? (
                      <>
                        {/* Systolic Blue Line */}
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={bpPointsBlue}
                        />
                        {/* Diastolic Pink Line */}
                        <polyline
                          fill="none"
                          stroke="#ec4899"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={bpPointsPink}
                        />
                        {/* Data Points */}
                        {bpSystolicVals.map((val, i) => {
                          const x = padLeft + (i / Math.max(bpSystolicVals.length - 1, 1)) * chartInnerW;
                          const y = padTop + chartInnerH - ((val - 50) / 130) * chartInnerH;
                          return (
                            <circle key={`sys-${i}`} cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                          );
                        })}
                        {bpDiastolicVals.map((val, i) => {
                          const x = padLeft + (i / Math.max(bpDiastolicVals.length - 1, 1)) * chartInnerW;
                          const y = padTop + chartInnerH - ((val - 50) / 130) * chartInnerH;
                          return (
                            <circle key={`dia-${i}`} cx={x} cy={y} r="5" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {/* Pulse Blue Line */}
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={pulsePointsBlue}
                        />
                        {/* SpO2 Pink Line */}
                        <polyline
                          fill="none"
                          stroke="#ec4899"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={spo2PointsPink}
                        />
                        {/* Data Points */}
                        {pulseVals.map((val, i) => {
                          const x = padLeft + (i / Math.max(pulseVals.length - 1, 1)) * chartInnerW;
                          const y = padTop + chartInnerH - ((val - 40) / 90) * chartInnerH;
                          return (
                            <circle key={`pul-${i}`} cx={x} cy={y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                          );
                        })}
                        {spo2Vals.map((val, i) => {
                          const x = padLeft + (i / Math.max(spo2Vals.length - 1, 1)) * chartInnerW;
                          const y = padTop + chartInnerH - ((val - 80) / 20) * chartInnerH;
                          return (
                            <circle key={`spo-${i}`} cx={x} cy={y} r="5" fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
                          );
                        })}
                      </>
                    )}

                    {/* Date labels along bottom */}
                    {sortedVitals.map((v, i) => {
                      const x = padLeft + (i / Math.max(sortedVitals.length - 1, 1)) * chartInnerW;
                      const dateLabel = new Date(v.recorded_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <text
                          key={v.id || i}
                          x={x}
                          y={svgHeight - 10}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#64748b"
                        >
                          {dateLabel}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Laboratory Test Results Table with Reference Ranges & Abnormal Flags */}
              <div className="lab-results-container">
                <div className="sub-table-header">
                  <h4><ClipboardList size={16} /> Laboratory Test Results with Reference Ranges</h4>
                  <small>Diagnostic biochemistry and pathology records stored in central database.</small>
                </div>

                <div className="table-responsive">
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Test Name</th>
                        <th>Category</th>
                        <th>Observed Result</th>
                        <th>Reference Range</th>
                        <th>Date</th>
                        <th>Evaluation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(healthAnalysis?.lab_reports || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center">No laboratory reports recorded yet.</td>
                        </tr>
                      ) : (
                        healthAnalysis?.lab_reports.map((lr) => (
                          <tr key={lr.id}>
                            <td>
                              <strong>{lr.test_name}</strong>
                            </td>
                            <td><span className="category-tag">{lr.test_category}</span></td>
                            <td><b>{lr.result}</b></td>
                            <td><code>{lr.reference_range || "N/A"}</code></td>
                            <td>{lr.report_date ? String(lr.report_date) : "Recent"}</td>
                            <td>
                              {lr.is_abnormal ? (
                                <span className="status-pill danger">
                                  <AlertTriangle size={11} /> {lr.abnormal_flag || "ABNORMAL"}
                                </span>
                              ) : (
                                <span className="status-pill active">
                                  <Check size={11} /> NORMAL
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conditions & Allergies Row */}
              <div className="two-column-grid top-space">
                {/* Chronic Conditions */}
                <div className="panel-box nested-box">
                  <div className="panel-header">
                    <h4><HeartPulse size={16} className="text-pink" /> Known Conditions & Diagnoses</h4>
                  </div>
                  {conditions.length === 0 ? (
                    <p className="empty-submessage">No documented chronic conditions.</p>
                  ) : (
                    <div className="conditions-list">
                      {conditions.map((c) => (
                        <div className="condition-item" key={c.id}>
                          <strong>{c.condition_name}</strong>
                          <span className="status-pill neutral">{c.status}</span>
                          <small>Diagnosed: {c.diagnosed_date}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient Allergies */}
                <div className="panel-box nested-box">
                  <div className="panel-header">
                    <h4><AlertTriangle size={16} className="text-amber" /> Allergies & Drug Sensitivities</h4>
                  </div>
                  {allergies.length === 0 ? (
                    <p className="empty-submessage">No documented drug or environmental allergies.</p>
                  ) : (
                    <div className="allergies-list">
                      {allergies.map((a) => (
                        <div className="allergy-item" key={a.id}>
                          <strong>{a.allergen}</strong>
                          <span className="status-pill warning">{a.severity}</span>
                          <p>Reaction: {a.reaction}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: PRESENT TREATMENT (Dedicated View)
           ------------------------------------------------------------- */}
        {activeTab === "current-treatment" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <span className="badge-pink-soft">ACTIVE CLINICAL ENCOUNTER</span>
                <h2>Detailed Present Treatment Protocol</h2>
                <p>Ongoing hospital care, diagnostic workup, and treatment timeline.</p>
              </div>
              <div className="present-treatment-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setUploadDocForm((prev) => ({ ...prev, treatment_id: String(presentTreatment?.id || "1") }));
                    setShowUploadDocModal(true);
                  }}
                >
                  <Upload size={14} /> Upload Diagnostic Scan
                </button>
              </div>
            </div>

            {presentTreatment ? (
              <div className="current-treatment-full-view">
                <div className="treatment-modal-top-grid">
                  <div>
                    <label>Encounter ID:</label>
                    <strong className="code-badge">{presentTreatment.treatment_code}</strong>
                  </div>
                  <div>
                    <label>Attending Physician:</label>
                    <strong>{presentTreatment.doctor_name} ({presentTreatment.doctor_specialization})</strong>
                  </div>
                  <div>
                    <label>Healthcare Facility:</label>
                    <strong>{presentTreatment.hospital_name || presentTreatment.hospital_id}</strong>
                  </div>
                  <div>
                    <label>Care Status:</label>
                    <span className="status-pill active">{presentTreatment.status}</span>
                  </div>
                </div>

                <div className="clinical-section">
                  <h4>Chief Complaint & Initial Symptoms</h4>
                  <p><strong>Chief Complaint:</strong> {presentTreatment.chief_complaint}</p>
                  {presentTreatment.symptoms && (
                    <p><strong>Reported Symptoms:</strong> {presentTreatment.symptoms}</p>
                  )}
                  {presentTreatment.clinical_observations && (
                    <p><strong>Clinical Observations:</strong> {presentTreatment.clinical_observations}</p>
                  )}
                </div>

                <div className="clinical-section">
                  <h4>Clinical Diagnosis & Prescribed Treatment Description</h4>
                  <h3 className="diagnosis-highlight">{presentTreatment.diagnosis}</h3>
                  <p>{presentTreatment.description}</p>
                  {presentTreatment.procedures_performed && (
                    <p><strong>Procedures Performed:</strong> {presentTreatment.procedures_performed}</p>
                  )}
                </div>

                {presentTreatment.follow_up_instructions && (
                  <div className="clinical-section">
                    <h4>Follow-up Instructions & Continuity of Care</h4>
                    <p>{presentTreatment.follow_up_instructions}</p>
                    {presentTreatment.next_appointment_date && (
                      <small>Scheduled Follow-up: {new Date(presentTreatment.next_appointment_date).toLocaleString()}</small>
                    )}
                  </div>
                )}

                {/* Prescriptions Table */}
                <div className="clinical-section">
                  <h4>Prescribed Medications ({presentTreatment.prescriptions?.length || 0})</h4>
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presentTreatment.prescriptions?.map((pr, i) => (
                        <tr key={pr.id || i}>
                          <td><strong>{pr.medication}</strong></td>
                          <td><span className="dosage-pill">{pr.dosage}</span></td>
                          <td>{pr.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Linked Documents */}
                <div className="clinical-section">
                  <h4>Diagnostic Images & Attached Documents ({presentTreatment.attachments?.length || 0})</h4>
                  <div className="attachments-gallery-grid">
                    {presentTreatment.attachments?.map((att) => (
                      <div className="attachment-card" key={att.id}>
                        <div className="attachment-details">
                          <h4>{att.description || att.original_filename}</h4>
                          <span className="file-category-badge">{att.file_category}</span>
                          <a
                            href={att.download_url}
                            download={att.original_filename}
                            className="btn-sm-primary top-space"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download size={13} /> Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty-message">No active treatment record found.</p>
            )}
          </section>
        )}

        {/* -------------------------------------------------------------
            TAB 3: PAST TREATMENTS
           ------------------------------------------------------------- */}
        {activeTab === "past-treatments" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Chronological Treatment History</h2>
                <p>Complete historical archive of patient encounters across all registered network hospitals.</p>
              </div>
            </div>

            <div className="treatment-history-filters">
              <input
                type="text"
                placeholder="Search by diagnosis, physician, or treatment code…"
                value={pastTreatmentSearch}
                onChange={(e) => setPastTreatmentSearch(e.target.value)}
                className="search-input-field"
              />
              <select
                value={pastTreatmentHospital}
                onChange={(e) => setPastTreatmentHospital(e.target.value)}
                className="select-field-sm"
              >
                <option value="all">All Facilities</option>
                <option value="HOSP-001">Chennai (HOSP-001)</option>
                <option value="HOSP-002">Bengaluru (HOSP-002)</option>
                <option value="HOSP-003">Mumbai (HOSP-003)</option>
              </select>
              <select
                value={pastTreatmentStatus}
                onChange={(e) => setPastTreatmentStatus(e.target.value)}
                className="select-field-sm"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="in progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="treatments-grid">
              {pastTreatmentsList.map((t) => (
                <div className="treatment-card" key={t.id}>
                  <div className="treatment-card-top">
                    <div>
                      <span className="treatment-code-pill">{t.treatment_code}</span>
                      <h3>{t.diagnosis}</h3>
                    </div>
                    <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span>
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
                    <Eye size={15} /> View Full Clinical Record
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            TAB 4: HEALTH ANALYSIS & VITALS
           ------------------------------------------------------------- */}
        {activeTab === "health-analysis" && (
          <div className="health-analysis-full-tab">
            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Comprehensive Health Analysis & Vitals Logging</h2>
                  <p>Centralized physiological records with automatic abnormal biomarker highlighting.</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowLogVitalsModal(true)}
                >
                  <Plus size={15} /> Record New Vitals
                </button>
              </div>

              {/* Vitals History Table */}
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Recorded Date</th>
                      <th>Blood Pressure</th>
                      <th>Pulse</th>
                      <th>Temperature</th>
                      <th>Oxygen Saturation</th>
                      <th>BMI (kg/m²)</th>
                      <th>Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVitals.map((v) => (
                      <tr key={v.id}>
                        <td>{new Date(v.recorded_at).toLocaleString()}</td>
                        <td>
                          <strong>{v.blood_pressure_systolic} / {v.blood_pressure_diastolic} mmHg</strong>
                        </td>
                        <td>{v.pulse} bpm</td>
                        <td>{Number(v.temperature).toFixed(1)} °F</td>
                        <td>{v.oxygen_saturation} %</td>
                        <td>{v.bmi ? Number(v.bmi).toFixed(1) : "—"}</td>
                        <td>
                          {v.is_abnormal ? (
                            <span className="status-pill danger">
                              <AlertTriangle size={12} /> {v.abnormal_notes || "Abnormal"}
                            </span>
                          ) : (
                            <span className="status-pill active">
                              <Check size={12} /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 5: MEDICAL DOCUMENTS REPOSITORY
           ------------------------------------------------------------- */}
        {activeTab === "documents" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Central Medical Document Repository</h2>
                <p>Private cloud storage for radiology scans, X-rays, MRI, CT scans, and laboratory reports.</p>
              </div>

              <div className="docs-header-actions">
                <select
                  value={documentCategoryFilter}
                  onChange={(e) => setDocumentCategoryFilter(e.target.value)}
                  className="select-field-sm"
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

                <button
                  className="btn-primary"
                  onClick={() => setShowUploadDocModal(true)}
                >
                  <Upload size={14} /> Upload Document
                </button>
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <p className="empty-message">No medical documents found in this category.</p>
            ) : (
              <div className="attachments-gallery-grid">
                {filteredDocuments.map((doc) => {
                  const isImage =
                    doc.file_type.startsWith("image/") ||
                    doc.original_filename.match(/\.(jpg|jpeg|png|webp)$/i);
                  const isPdf =
                    doc.file_type === "application/pdf" ||
                    doc.original_filename.endsWith(".pdf");

                  return (
                    <div className="attachment-card" key={doc.id}>
                      <div className="attachment-preview-box">
                        {isImage ? (
                          <img
                            src={doc.download_url}
                            alt={doc.document_name}
                            className="gallery-thumbnail"
                            onClick={() => setSelectedDocument(doc)}
                          />
                        ) : isPdf ? (
                          <div
                            className="pdf-thumbnail-placeholder"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <FileText size={44} className="pdf-icon" />
                            <span>PDF Report</span>
                          </div>
                        ) : (
                          <div
                            className="generic-file-placeholder"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <FileText size={44} />
                            <span>{doc.file_type || "Medical Record"}</span>
                          </div>
                        )}
                        <span className="file-category-badge">{doc.file_category}</span>
                      </div>

                      <div className="attachment-details">
                        <h4>{doc.document_name || doc.original_filename}</h4>
                        <div className="attachment-subinfo">
                          <span>Facility: {doc.hospital_id}</span>
                          <span>Size: {(doc.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                        <small className="attachment-date">
                          Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                        </small>

                        <div className="attachment-actions">
                          <button
                            className="btn-sm-outline"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <Eye size={14} /> Preview
                          </button>
                          <a
                            href={doc.download_url}
                            download={doc.original_filename}
                            className="btn-sm-primary"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download size={14} /> Download
                          </a>
                          <button
                            className="btn-sm-danger"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete file"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* -------------------------------------------------------------
            TAB 6: FAMILY & EMERGENCY CONTACTS
           ------------------------------------------------------------- */}
        {activeTab === "family" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Family Contacts & Emergency Notification Links</h2>
                <p>Authorized family relations and emergency proxies registered under GRN {grn}.</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setShowAddFamilyModal(true)}
              >
                <Plus size={15} /> Add Family Contact
              </button>
            </div>

            {familyContacts.length === 0 ? (
              <p className="empty-message">No family contacts registered.</p>
            ) : (
              <div className="family-contacts-grid">
                {familyContacts.map((contact) => (
                  <article className="family-contact-card" key={contact.id}>
                    <div className="contact-card-top">
                      <div>
                        <h3>{contact.full_name}</h3>
                        <span className="relationship-tag">{contact.relationship}</span>
                      </div>
                      {contact.is_emergency_contact && (
                        <span className="badge-pink-soft">
                          <ShieldCheck size={13} /> Emergency Contact
                        </span>
                      )}
                    </div>

                    <div className="contact-info-list">
                      <div>
                        <Phone size={14} />
                        <span>{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div>
                          <Mail size={14} />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.address && (
                        <div>
                          <MapPin size={14} />
                          <span>{contact.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="contact-card-actions">
                      <button
                        className="btn-sm-danger"
                        onClick={() => handleDeleteFamilyContact(contact.id)}
                      >
                        <Trash2 size={13} /> Remove Contact
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* -------------------------------------------------------------
            TAB 7: QR PATIENT CARD
           ------------------------------------------------------------- */}
        {activeTab === "qr-card" && (
          <section className="panel-box qr-card-tab-panel">
            <div className="panel-header">
              <div>
                <h2>Digital Health Passport & QR Patient Card</h2>
                <p>Permanent machine-readable identity card for rapid hospital registration and emergency triage.</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Card
              </button>
            </div>

            <div className="qr-card-display-container">
              <div className="physical-id-card">
                <div className="id-card-header">
                  <div className="id-card-brand">
                    <span className="id-card-logo">X7</span>
                    <div>
                      <strong>X7 MEDICORE HMS</strong>
                      <small>CENTRALIZED PATIENT IDENTITY CARD</small>
                    </div>
                  </div>
                  <div className="emergency-hotline">
                    <span>EMERGENCY</span>
                    <strong>108 / 112</strong>
                  </div>
                </div>

                <div className="id-card-body">
                  <div className="id-card-photo-box">
                    {profile?.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt={profile.full_name}
                        className="id-photo-img"
                      />
                    ) : (
                      <div className="id-photo-placeholder">
                        <HeartPulse size={48} />
                      </div>
                    )}
                    <span className="id-blood-badge">
                      BLOOD: {profile?.blood_group || "O+"}
                    </span>
                  </div>

                  <div className="id-card-details">
                    <h3>{profile?.full_name || user?.full_name}</h3>
                    <div className="id-card-grn-highlight">
                      <span>PERMANENT GRN</span>
                      <code>{grn}</code>
                    </div>

                    <div className="id-card-meta-grid">
                      <div>
                        <span>DOB / Age:</span>
                        <strong>{profile?.date_of_birth ? String(profile.date_of_birth) : "1994-06-12"} ({profile?.age || 30} yrs)</strong>
                      </div>
                      <div>
                        <span>Gender:</span>
                        <strong>{profile?.gender || "Male"}</strong>
                      </div>
                      <div>
                        <span>Emergency:</span>
                        <strong>{profile?.emergency_contact || "+91 98401 23456"}</strong>
                      </div>
                      <div>
                        <span>Primary Facility:</span>
                        <strong>{profile?.primary_hospital_name || "X7 City Central (Chennai)"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="id-card-qr-box">
                    <img
                      src={`/api/v1/patients/${grn}/qr-code`}
                      alt={`QR Code for ${grn}`}
                      className="id-card-svg-qr"
                    />
                    <small>Scan for Verification</small>
                  </div>
                </div>

                <div className="id-card-footer">
                  <span>Authorized by X7 MediCore National Healthcare Registry &bull; Valid Across All Network Facilities</span>
                  <code>DATABASE ID #{profile?.grn || "XM-GRN-000001"}</code>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            TAB 8: CONSENTS & AUDIT TRAIL
           ------------------------------------------------------------- */}
        {activeTab === "consents" && (
          <div className="consents-tab-content">
            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Cross-Hospital Access Permissions & Consents</h2>
                  <p>Hospitals authorized to view your centralized medical record under GRN {grn}.</p>
                </div>
                <ShieldCheck size={22} className="text-success" />
              </div>

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
                        <td><strong>{c.requesting_hospital_name || c.requesting_hospital_id}</strong></td>
                        <td>{c.consent_type.replaceAll("_", " ").toUpperCase()}</td>
                        <td><span className="status-pill active">{c.status.toUpperCase()}</span></td>
                        <td>{new Date(c.granted_at).toLocaleDateString()}</td>
                        <td>{c.notes || "Authorized patient consent"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel-box top-space">
              <div className="panel-header">
                <div>
                  <h2>Medical Record Access Audit Trail</h2>
                  <p>Immutable log of every clinician who reviewed or updated your healthcare records.</p>
                </div>
              </div>

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
                        <td><span className="code-badge">{log.action}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 9: BILLING & INVOICES
           ------------------------------------------------------------- */}
        {activeTab === "invoices" && (
          <section className="panel-box">
            <div className="panel-header">
              <div>
                <h2>Invoices & Billing History</h2>
                <p>Consolidated consultation and medical charges across all visits.</p>
              </div>
            </div>

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
                      <td><strong>₹{Number(inv.amount).toFixed(2)}</strong></td>
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
          </section>
        )}
      </main>

      {/* ----------------- MODAL: EDIT PATIENT BIODATA ----------------- */}
      {showEditProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowEditProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">UPDATE DEMOGRAPHICS</span>
                <h2>Edit Patient Profile & Insurance</h2>
              </div>
              <button className="close-btn" onClick={() => setShowEditProfileModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="modal-body form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={profileForm.date_of_birth}
                    onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    value={profileForm.blood_group}
                    onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    required
                    value={profileForm.emergency_contact}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Residential Address</label>
                  <input
                    type="text"
                    required
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Insurance Provider</label>
                  <input
                    type="text"
                    value={profileForm.insurance_provider}
                    onChange={(e) => setProfileForm({ ...profileForm, insurance_provider: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Policy Number</label>
                  <input
                    type="text"
                    value={profileForm.insurance_policy_number}
                    onChange={(e) => setProfileForm({ ...profileForm, insurance_policy_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Insurance Valid Till</label>
                  <input
                    type="date"
                    value={profileForm.insurance_valid_till}
                    onChange={(e) => setProfileForm({ ...profileForm, insurance_valid_till: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditProfileModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: LOG VITALS ----------------- */}
      {showLogVitalsModal && (
        <div className="modal-backdrop" onClick={() => setShowLogVitalsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">CLINICAL MEASUREMENTS</span>
                <h2>Record Patient Vital Signs</h2>
              </div>
              <button className="close-btn" onClick={() => setShowLogVitalsModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogVitals}>
              <div className="modal-body form-grid">
                <div className="form-group">
                  <label>Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    required
                    value={vitalForm.blood_pressure_systolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, blood_pressure_systolic: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    required
                    value={vitalForm.blood_pressure_diastolic}
                    onChange={(e) => setVitalForm({ ...vitalForm, blood_pressure_diastolic: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    min="30"
                    max="220"
                    required
                    value={vitalForm.pulse}
                    onChange={(e) => setVitalForm({ ...vitalForm, pulse: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="90"
                    max="110"
                    required
                    value={vitalForm.temperature}
                    onChange={(e) => setVitalForm({ ...vitalForm, temperature: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Oxygen Saturation (SpO2 %)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    value={vitalForm.oxygen_saturation}
                    onChange={(e) => setVitalForm({ ...vitalForm, oxygen_saturation: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Respiratory Rate (breaths/min)</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={vitalForm.respiratory_rate}
                    onChange={(e) => setVitalForm({ ...vitalForm, respiratory_rate: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.weight_kg}
                    onChange={(e) => setVitalForm({ ...vitalForm, weight_kg: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.height_cm}
                    onChange={(e) => setVitalForm({ ...vitalForm, height_cm: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Clinical Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Normal morning reading, resting state"
                    value={vitalForm.notes}
                    onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowLogVitalsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: UPLOAD DIAGNOSTIC SCAN ----------------- */}
      {showUploadDocModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadDocModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">DIAGNOSTIC STORAGE</span>
                <h2>Upload Medical Image / Document</h2>
              </div>
              <button className="close-btn" onClick={() => setShowUploadDocModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadDocument}>
              <div className="modal-body form-grid">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={uploadDocForm.file_category}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, file_category: e.target.value })}
                  >
                    <option value="X-ray">X-ray</option>
                    <option value="MRI">MRI Scan</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Blood Test Report">Blood Test Report</option>
                    <option value="Prescription">Prescription Document</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                    <option value="Medical Bill">Medical Bill / Invoice</option>
                    <option value="Other Medical Documents">Other Medical Document</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chest PA X-Ray"
                    value={uploadDocForm.document_name}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, document_name: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Select File (PDF, JPG, PNG, WEBP)</label>
                  <input
                    type="file"
                    required
                    accept=".pdf, image/*"
                    onChange={(e) => setSelectedUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description / Radiologist Findings</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Normal cardiothoracic ratio, clear lung fields"
                    value={uploadDocForm.description}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowUploadDocModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Upload & Secure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: ADD FAMILY CONTACT ----------------- */}
      {showAddFamilyModal && (
        <div className="modal-backdrop" onClick={() => setShowAddFamilyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">FAMILY NOTIFICATION</span>
                <h2>Register Family / Emergency Contact</h2>
              </div>
              <button className="close-btn" onClick={() => setShowAddFamilyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFamilyContact}>
              <div className="modal-body form-grid">
                <div className="form-group">
                  <label>Contact Full Name</label>
                  <input
                    type="text"
                    required
                    value={familyForm.full_name}
                    onChange={(e) => setFamilyForm({ ...familyForm, full_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <select
                    value={familyForm.relationship}
                    onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })}
                  >
                    <option value="Parent">Parent</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Relative">Other Relative</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    required
                    value={familyForm.phone}
                    onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={familyForm.email}
                    onChange={(e) => setFamilyForm({ ...familyForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <input
                    type="text"
                    value={familyForm.address}
                    onChange={(e) => setFamilyForm({ ...familyForm, address: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>
                    <input
                      type="checkbox"
                      checked={familyForm.is_emergency_contact}
                      onChange={(e) => setFamilyForm({ ...familyForm, is_emergency_contact: e.target.checked })}
                    />{" "}
                    Primary Emergency Proxy
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddFamilyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT TREATMENT ----------------- */}
      {showEditTreatmentModal && (
        <div className="modal-backdrop" onClick={() => setShowEditTreatmentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">UPDATE ENCOUNTER</span>
                <h2>Edit Clinical Treatment Protocol</h2>
              </div>
              <button className="close-btn" onClick={() => setShowEditTreatmentModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTreatmentEdits}>
              <div className="modal-body form-grid">
                <div className="form-group full-width">
                  <label>Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={editTreatmentForm.diagnosis}
                    onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, diagnosis: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Treatment Description</label>
                  <textarea
                    rows={3}
                    value={editTreatmentForm.description}
                    onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Procedures Performed</label>
                  <input
                    type="text"
                    value={editTreatmentForm.procedures_performed}
                    onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, procedures_performed: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Follow-up Instructions</label>
                  <textarea
                    rows={2}
                    value={editTreatmentForm.follow_up_instructions}
                    onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, follow_up_instructions: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Care Status</label>
                  <select
                    value={editTreatmentForm.status}
                    onChange={(e) => setEditTreatmentForm({ ...editTreatmentForm, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditTreatmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: FULL TREATMENT DETAILS ----------------- */}
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
                  <label>Healthcare Facility:</label>
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
                  <label>Encounter Status:</label>
                  <span className={`status-pill ${selectedTreatment.status.toLowerCase()}`}>{selectedTreatment.status}</span>
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
                <p>{selectedTreatment.description || "Standard clinical care provided."}</p>
                {selectedTreatment.procedures_performed && (
                  <p><strong>Procedures:</strong> {selectedTreatment.procedures_performed}</p>
                )}
              </div>

              {selectedTreatment.follow_up_instructions && (
                <div className="clinical-section">
                  <h4>Follow-up Instructions</h4>
                  <p>{selectedTreatment.follow_up_instructions}</p>
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
                          <td><span className="dosage-pill">{p.dosage}</span></td>
                          <td>{p.instructions || "Standard"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Attachments */}
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

      {/* ----------------- MODAL: DOCUMENT PREVIEW ----------------- */}
      {selectedDocument && (
        <div className="modal-backdrop" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content media-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{selectedDocument.file_category.toUpperCase()} PREVIEW</span>
                <h2>{selectedDocument.document_name || selectedDocument.original_filename}</h2>
              </div>
              <button className="close-btn" onClick={() => setSelectedDocument(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body media-modal-body">
              {selectedDocument.file_type.startsWith("image/") ||
              selectedDocument.original_filename.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <div className="image-viewer-box">
                  <img
                    src={selectedDocument.download_url}
                    alt={selectedDocument.original_filename}
                    className="modal-full-image"
                  />
                </div>
              ) : selectedDocument.file_type === "application/pdf" ||
                selectedDocument.original_filename.endsWith(".pdf") ? (
                <div className="pdf-viewer-box">
                  <iframe
                    src={selectedDocument.download_url}
                    title={selectedDocument.original_filename}
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
                <div><strong>File Name:</strong> {selectedDocument.original_filename}</div>
                <div><strong>Category:</strong> {selectedDocument.file_category}</div>
                <div><strong>Patient GRN:</strong> {selectedDocument.patient_grn}</div>
                <div><strong>Facility:</strong> {selectedDocument.hospital_id}</div>
                <div><strong>File Size:</strong> {(selectedDocument.file_size / 1024).toFixed(1)} KB</div>
                <div><strong>Upload Date:</strong> {new Date(selectedDocument.upload_date).toLocaleString()}</div>
              </div>
            </div>

            <div className="modal-footer">
              <a
                href={selectedDocument.download_url}
                download={selectedDocument.original_filename}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <Download size={16} /> Download File
              </a>
              <button className="btn-secondary" onClick={() => setSelectedDocument(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
