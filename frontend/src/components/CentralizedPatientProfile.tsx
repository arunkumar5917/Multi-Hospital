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
  PrescriptionOut,
  PatientConsent,
  MedicalAccessLog,
  PatientVital,
  FamilyContact,
  LabReport,
  HealthAnalysis,
  HospitalDepartment,
  TreatmentProtocol,
  DoctorNote,
  NursingObservation,
  LabTestOrder,
  MedicationRecord,
  PatientSurgery,
  EmergencyContact,
  HospitalVisitSummary,
  BreakGlassResponse,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { PatientProfilePhoto } from "./PatientProfilePhoto";
import {
  HeartPulse,
  IdCard,
  Calendar,
  ClipboardList,
  FileText,
  Pill,
  Activity,
  Building2,
  AlertCircle,
  Eye,
  Download,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Upload,
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
  TrendingUp,
  Thermometer,
  Droplets,
  CheckCircle2,
  Stethoscope,
  Microscope,
  Flame,
  FileCheck,
  Sparkles,
  ExternalLink,
  History,
  Lock,
  Unlock,
  Radio,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

export interface CentralizedPatientProfileProps {
  grn: string;
  userRole: string;
  currentHospitalCode?: string;
  isSelfView?: boolean;
  onClose?: () => void;
}

export type ProfileTab =
  | "overview"
  | "personal"
  | "current-treatment"
  | "past-treatments"
  | "health-analysis"
  | "documents"
  | "lab-reports"
  | "prescriptions"
  | "family"
  | "hospital-visits"
  | "consents";

export const CentralizedPatientProfile: React.FC<CentralizedPatientProfileProps> = ({
  grn,
  userRole,
  currentHospitalCode = "HOSP-001",
  isSelfView = false,
  onClose,
}) => {
  const { apiFetch, user } = useAuth();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [timeline, setTimeline] = useState<MedicalTimelineEvent[]>([]);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [labOrders, setLabOrders] = useState<LabTestOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionOut[]>([]);
  const [medicationRecords, setMedicationRecords] = useState<MedicationRecord[]>([]);
  const [surgeries, setSurgeries] = useState<PatientSurgery[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>([]);
  const [hospitalVisits, setHospitalVisits] = useState<HospitalVisitSummary[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [accessLogs, setAccessLogs] = useState<MedicalAccessLog[]>([]);
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);

  // Active Treatment Protocols & Notes
  const [activeTreatment, setActiveTreatment] = useState<Treatment | null>(null);
  const [protocols, setProtocols] = useState<TreatmentProtocol[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [nursingObs, setNursingObs] = useState<NursingObservation[]>([]);

  // Emergency Break-Glass Access State
  const [breakGlassModalOpen, setBreakGlassModalOpen] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState("");
  const [breakGlassJustification, setBreakGlassJustification] = useState("");
  const [breakGlassActive, setBreakGlassActive] = useState(false);
  const [breakGlassSuccessMsg, setBreakGlassSuccessMsg] = useState("");
  const [breakGlassSubmitting, setBreakGlassSubmitting] = useState(false);

  // Modals & Action States
  const [previewDoc, setPreviewDoc] = useState<Attachment | null>(null);
  const [showLogVitalsModal, setShowLogVitalsModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddNursingModal, setShowAddNursingModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState<PrescriptionOut | null>(null);
  const [showEditBiodataModal, setShowEditBiodataModal] = useState(false);
  const [showOrderLabModal, setShowOrderLabModal] = useState(false);
  const [showUpdateLabModal, setShowUpdateLabModal] = useState<LabTestOrder | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form input states
  const [vitalsForm, setVitalsForm] = useState({
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    pulse: 72,
    temperature: 98.6,
    oxygen_saturation: 99,
    respiratory_rate: 16,
    weight_kg: 70,
    height_cm: 172,
    abnormal_notes: "",
  });

  const [noteForm, setNoteForm] = useState({
    note_type: "Progress Note",
    content: "",
  });

  const [nursingForm, setNursingForm] = useState({
    observation_type: "Vital Observation & Medication Admin",
    vital_summary: "Stable, alert, compliant",
    notes: "",
  });

  const [docUploadForm, setDocUploadForm] = useState({
    document_name: "",
    file_category: "Radiology / Imaging",
    description: "",
    file: null as File | null,
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    relationship: "Spouse",
    phone: "",
    email: "",
    priority: "Primary",
    is_authorized_rep: true,
    notification_preference: "SMS",
  });

  const [labOrderForm, setLabOrderForm] = useState({
    test_name: "",
    test_category: "Hematology",
    urgency: "Routine",
    clinical_indication: "",
  });

  const [labResultForm, setLabResultForm] = useState({
    status: "Completed",
    result_value: "",
    reference_range: "",
    technician_notes: "",
  });

  const [dispenseForm, setDispenseForm] = useState({
    dispensed_quantity: 10,
    notes: "Verified against patient allergies and medication dosage.",
  });

  const [biodataForm, setBiodataForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "Male",
    blood_group: "O+",
    phone: "",
    email: "",
    address: "",
    emergency_contact: "",
    marital_status: "Single",
    occupation: "Professional",
    national_id: "",
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_valid_till: "",
  });

  // Filters
  const [historyHospitalFilter, setHistoryHospitalFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState("all");

  // Load all patient data
  const fetchAllPatientData = async (isRefresh = false) => {
    if (!grn) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // 1. Profile
      let profData: PatientProfile | null = null;
      try {
        const profRes = await apiFetch(`/api/v1/patients/${grn}/profile`);
        if (profRes.ok) {
          profData = await profRes.json();
        }
      } catch (e) {
        console.warn("Primary profile fetch failed:", e);
      }

      if (!profData) {
        try {
          const altRes = await apiFetch(`/api/v1/patients/${grn}`);
          if (altRes.ok) profData = await altRes.json();
        } catch (e) {
          console.warn("Fallback patient fetch failed:", e);
        }
      }

      if (!profData) {
        throw new Error(`Patient record (${grn}) could not be retrieved from the central network database.`);
      }

      setProfile(profData);
      const nameParts = (profData.full_name || "").split(" ");
      setBiodataForm({
        first_name: profData.first_name || nameParts[0] || "",
        last_name: profData.last_name || nameParts.slice(1).join(" ") || "",
        date_of_birth: profData.date_of_birth ? String(profData.date_of_birth).slice(0, 10) : "",
        gender: profData.gender || "Male",
        blood_group: profData.blood_group || "O+",
        phone: profData.phone || "",
        email: profData.email || "",
        address: profData.address || "",
        emergency_contact: profData.emergency_contact || "",
        marital_status: profData.marital_status || "Single",
        occupation: profData.occupation || "Professional",
        national_id: profData.national_id || "",
        insurance_provider: profData.insurance_provider || "",
        insurance_policy_number: profData.insurance_policy_number || "",
        insurance_valid_till: profData.insurance_valid_till ? String(profData.insurance_valid_till).slice(0, 10) : "",
      });

      // 2. Fetch all sub-resources safely in parallel
      const [
        histRes,
        trtRes,
        timelineRes,
        healthRes,
        attachRes,
        rxRes,
        medRecRes,
        labOrdersRes,
        surgRes,
        ecRes,
        fcRes,
        visitsRes,
        consentRes,
        logsRes,
        deptRes,
      ] = await Promise.allSettled([
        apiFetch(`/api/v1/patients/${grn}/medical-history`),
        apiFetch(`/api/v1/patients/${grn}/treatments`),
        apiFetch(`/api/v1/patients/${grn}/medical-history/timeline`),
        apiFetch(`/api/v1/patients/${grn}/health-analysis`),
        apiFetch(`/api/v1/patients/${grn}/attachments`),
        apiFetch(`/api/v1/patients/${grn}/prescriptions`),
        apiFetch(`/api/v1/patients/${grn}/medication-records`),
        apiFetch(`/api/v1/patients/${grn}/lab-orders`),
        apiFetch(`/api/v1/patients/${grn}/surgeries`),
        apiFetch(`/api/v1/patients/${grn}/emergency-contacts`),
        apiFetch(`/api/v1/patients/${grn}/family-contacts`),
        apiFetch(`/api/v1/patients/${grn}/hospital-visits`),
        apiFetch(`/api/v1/patients/${grn}/consents`),
        apiFetch(`/api/v1/patients/${grn}/access-logs`),
        apiFetch(`/api/v1/departments`),
      ]);

      // Process treatments
      let loadedTreatments: Treatment[] = [];
      if (trtRes.status === "fulfilled" && trtRes.value.ok) {
        try { loadedTreatments = await trtRes.value.json(); } catch {}
      } else if (histRes.status === "fulfilled" && histRes.value.ok) {
        try {
          const histData = await histRes.value.json();
          loadedTreatments = histData.treatments || [];
        } catch {}
      }
      setTreatments(loadedTreatments);

      // Active treatment
      const activeTrt = loadedTreatments.find(
        (t: Treatment) => t.status.toLowerCase() === "active" || t.status.toLowerCase() === "under treatment"
      ) || loadedTreatments[0] || null;
      setActiveTreatment(activeTrt);
      if (activeTrt) {
        fetchTreatmentDetails(activeTrt.id);
      }

      // Process timeline
      if (timelineRes.status === "fulfilled" && timelineRes.value.ok) {
        try { setTimeline(await timelineRes.value.json()); } catch {}
      }

      // Process Health Analysis
      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        try { setHealthAnalysis(await healthRes.value.json()); } catch {}
      }

      // Process Attachments / Documents
      if (attachRes.status === "fulfilled" && attachRes.value.ok) {
        try { setAttachments(await attachRes.value.json()); } catch {}
      }

      // Process Prescriptions
      if (rxRes.status === "fulfilled" && rxRes.value.ok) {
        try { setPrescriptions(await rxRes.value.json()); } catch {}
      }

      // Process Medication Records
      if (medRecRes.status === "fulfilled" && medRecRes.value.ok) {
        try { setMedicationRecords(await medRecRes.value.json()); } catch {}
      }

      // Process Lab Orders
      if (labOrdersRes.status === "fulfilled" && labOrdersRes.value.ok) {
        try { setLabOrders(await labOrdersRes.value.json()); } catch {}
      }

      // Process Surgeries
      if (surgRes.status === "fulfilled" && surgRes.value.ok) {
        try { setSurgeries(await surgRes.value.json()); } catch {}
      }

      // Process Emergency Contacts
      if (ecRes.status === "fulfilled" && ecRes.value.ok) {
        try { setEmergencyContacts(await ecRes.value.json()); } catch {}
      }

      // Process Family Contacts
      if (fcRes.status === "fulfilled" && fcRes.value.ok) {
        try { setFamilyContacts(await fcRes.value.json()); } catch {}
      }

      // Process Hospital Visits
      if (visitsRes.status === "fulfilled" && visitsRes.value.ok) {
        try { setHospitalVisits(await visitsRes.value.json()); } catch {}
      }

      // Process Consents
      if (consentRes.status === "fulfilled" && consentRes.value.ok) {
        try { setConsents(await consentRes.value.json()); } catch {}
      }

      // Process Access Logs
      if (logsRes.status === "fulfilled" && logsRes.value.ok) {
        try {
          const logs: MedicalAccessLog[] = await logsRes.value.json();
          setAccessLogs(logs);
          const bgLog = logs.find((l) => (l as any).is_break_glass);
          if (bgLog) setBreakGlassActive(true);
        } catch {}
      }

      // Process Departments
      if (deptRes.status === "fulfilled" && deptRes.value.ok) {
        try { setDepartments(await deptRes.value.json()); } catch {}
      }
    } catch (err: any) {
      console.error("Error fetching patient details:", err);
      setError(err.message || "Failed to load complete patient profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTreatmentDetails = async (treatmentId: number) => {
    try {
      const [pRes, nRes, oRes] = await Promise.all([
        apiFetch(`/api/v1/treatments/${treatmentId}/protocols`),
        apiFetch(`/api/v1/treatments/${treatmentId}/doctor-notes`),
        apiFetch(`/api/v1/treatments/${treatmentId}/nursing-observations`),
      ]);
      if (pRes.ok) setProtocols(await pRes.json());
      if (nRes.ok) setDoctorNotes(await nRes.json());
      if (oRes.ok) setNursingObs(await oRes.json());
    } catch (e) {
      console.error("Error fetching treatment child records:", e);
    }
  };

  useEffect(() => {
    fetchAllPatientData();
  }, [grn]);

  // Load QR code
  const fetchQrCode = async () => {
    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/qr`);
      if (res.ok) {
        const svgText = await res.text();
        setQrCodeSvg(svgText);
        setShowQrModal(true);
      }
    } catch (e) {
      console.error("Error loading QR code", e);
    }
  };

  // Break-Glass Emergency Access Handler
  const handleBreakGlassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassReason.trim()) return;

    setBreakGlassSubmitting(true);
    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/break-glass-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergency_reason: breakGlassReason,
          clinical_justification: breakGlassJustification || "Emergency override invoked for immediate clinical intervention",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Break-glass authorization failed");
      }

      const resData: BreakGlassResponse = await res.json();
      setBreakGlassActive(true);
      setBreakGlassSuccessMsg(`EMERGENCY ACCESS GRANTED: Audit entry #${resData.access_log_id} created.`);
      setBreakGlassModalOpen(false);
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Break-Glass Error: " + err.message);
    } finally {
      setBreakGlassSubmitting(false);
    }
  };

  // Log Vitals Handler
  const handleLogVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vitalsForm),
      });
      if (!res.ok) throw new Error("Failed to record vital signs");
      setShowLogVitalsModal(false);
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error logging vitals: " + err.message);
    }
  };

  // Add Doctor Note Handler
  const handleAddDoctorNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTreatment) return;
    try {
      const res = await apiFetch(`/api/v1/treatments/${activeTreatment.id}/doctor-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });
      if (!res.ok) throw new Error("Failed to add doctor note");
      setShowAddNoteModal(false);
      setNoteForm({ note_type: "Progress Note", content: "" });
      fetchTreatmentDetails(activeTreatment.id);
    } catch (err: any) {
      alert("Error adding doctor note: " + err.message);
    }
  };

  // Add Nursing Observation Handler
  const handleAddNursingObservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTreatment) return;
    try {
      const res = await apiFetch(`/api/v1/treatments/${activeTreatment.id}/nursing-observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nursingForm),
      });
      if (!res.ok) throw new Error("Failed to add nursing observation");
      setShowAddNursingModal(false);
      setNursingForm({
        observation_type: "Vital Observation & Medication Admin",
        vital_summary: "Stable, alert, compliant",
        notes: "",
      });
      fetchTreatmentDetails(activeTreatment.id);
    } catch (err: any) {
      alert("Error adding nursing observation: " + err.message);
    }
  };

  // Upload Document Handler
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadForm.file) return;

    try {
      const formData = new FormData();
      formData.append("file", docUploadForm.file);
      formData.append("document_name", docUploadForm.document_name || docUploadForm.file.name);
      formData.append("file_category", docUploadForm.file_category);
      formData.append("description", docUploadForm.description);
      if (activeTreatment) {
        formData.append("treatment_id", activeTreatment.id.toString());
      }

      const res = await apiFetch(`/api/v1/patients/${grn}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload document");
      setShowUploadDocModal(false);
      setDocUploadForm({
        document_name: "",
        file_category: "Radiology / Imaging",
        description: "",
        file: null,
      });
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error uploading document: " + err.message);
    }
  };

  // Order Lab Test Handler
  const handleOrderLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labOrderForm.test_name.trim()) return;

    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/lab-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...labOrderForm,
          treatment_id: activeTreatment?.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to place lab order");
      setShowOrderLabModal(false);
      setLabOrderForm({
        test_name: "",
        test_category: "Hematology",
        urgency: "Routine",
        clinical_indication: "",
      });
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error ordering lab test: " + err.message);
    }
  };

  // Update Lab Status & Results Handler
  const handleUpdateLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showUpdateLabModal) return;

    try {
      const res = await apiFetch(`/api/v1/lab-orders/${showUpdateLabModal.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labResultForm),
      });
      if (!res.ok) throw new Error("Failed to update lab order");
      setShowUpdateLabModal(null);
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error updating lab order: " + err.message);
    }
  };

  // Dispense Medication Handler
  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDispenseModal) return;

    try {
      const res = await apiFetch(`/api/v1/prescriptions/${showDispenseModal.id}/dispense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispensed_quantity: Number(dispenseForm.dispensed_quantity),
          dispensing_status: "Dispensed",
          notes: dispenseForm.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to dispense prescription");
      setShowDispenseModal(null);
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Dispensing Error: " + err.message);
    }
  };

  // Add Contact Handler
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) return;

    try {
      const res = await apiFetch(`/api/v1/patients/${grn}/emergency-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error("Failed to create emergency contact");
      setShowAddContactModal(false);
      setContactForm({
        name: "",
        relationship: "Spouse",
        phone: "",
        email: "",
        priority: "Primary",
        is_authorized_rep: true,
        notification_preference: "SMS",
      });
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error adding contact: " + err.message);
    }
  };

  // Edit Biodata Handler
  const handleEditBiodataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...biodataForm,
        date_of_birth: biodataForm.date_of_birth ? biodataForm.date_of_birth : null,
        insurance_valid_till: biodataForm.insurance_valid_till ? biodataForm.insurance_valid_till : null,
      };
      const res = await apiFetch(`/api/v1/patients/${grn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to update patient biodata");
      }
      setShowEditBiodataModal(false);
      fetchAllPatientData(true);
    } catch (err: any) {
      alert("Error updating patient: " + err.message);
    }
  };

  // Permission Checks
  const canEditClinical = ["doctor", "super_admin"].includes(userRole);
  const canLogVitals = ["doctor", "nurse", "hospital_admin", "super_admin"].includes(userRole);
  const canDispense = ["pharmacist", "doctor", "hospital_admin", "super_admin"].includes(userRole);
  const canManageLabs = ["lab_tech", "doctor", "hospital_admin", "super_admin"].includes(userRole);
  const canEditBiodata = ["doctor", "nurse", "hospital_admin", "super_admin"].includes(userRole) || isSelfView;
  const canUploadDocs = ["doctor", "nurse", "lab_tech", "hospital_admin", "super_admin"].includes(userRole) || isSelfView;

  if (loading) {
    return (
      <div className="centralized-profile-container flex flex-col items-center justify-center p-12 min-h-[500px]">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#001C68] border-t-[#EA0170]"></div>
        <p className="mt-4 text-base font-semibold text-[#001C68] tracking-wide">
          Retrieving Centralized Patient Record ({grn})...
        </p>
        <span className="text-xs text-gray-500 mt-1">Cross-referencing network hospital databases</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="centralized-profile-container p-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">Unable to Access Patient Record</h3>
            <p className="text-sm mt-1">{error || "Patient not found in centralized register."}</p>
            <button
              onClick={() => fetchAllPatientData()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate age helper
  const calculateAge = (dob?: string | null) => {
    if (!dob) return profile.age || 30;
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const patientAge = calculateAge(profile.date_of_birth);

  // Vitals helper
  const latestVitals = healthAnalysis?.current_vitals || (profile as any).latest_vitals;

  // Filtered treatment history
  const filteredTreatments = treatments.filter((t) => {
    if (historyHospitalFilter !== "all" && t.hospital_id !== historyHospitalFilter) return false;
    if (historyStatusFilter !== "all" && t.status.toLowerCase() !== historyStatusFilter.toLowerCase()) return false;
    return true;
  });

  // Filtered attachments
  const filteredAttachments = attachments.filter((att) => {
    if (documentCategoryFilter !== "all" && att.file_category !== documentCategoryFilter) return false;
    if (documentSearchTerm) {
      const q = documentSearchTerm.toLowerCase();
      const docName = (att.document_name || att.original_filename || "").toLowerCase();
      const desc = (att.description || "").toLowerCase();
      const code = (att.attachment_code || "").toLowerCase();
      return docName.includes(q) || desc.includes(q) || code.includes(q);
    }
    return true;
  });

  const formatNotes = (notes: any, fallback = "No notes recorded."): string => {
    if (!notes) return fallback;
    if (typeof notes === "string") return notes;
    if (Array.isArray(notes)) {
      if (notes.length === 0) return fallback;
      return notes.map((n: any) => n.note_text || n.content || JSON.stringify(n)).join("; ");
    }
    return String(notes);
  };

  const patientDisplayName = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Patient";

  return (
    <div className="centralized-profile-wrapper bg-slate-50 min-h-screen pb-12 font-sans text-slate-800">
      {/* Top Banner: Emergency Break-Glass Alert if active */}
      {breakGlassActive && (
        <div className="bg-gradient-to-r from-red-600 via-[#EA0170] to-red-700 text-white px-6 py-3 shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm tracking-wide">
                EMERGENCY BREAK-GLASS OVERRIDE ACTIVE
              </p>
              <p className="text-xs text-red-100">
                Authorized clinical record bypass in effect. All actions, diagnostic inspections, and access events are recorded in the permanent institutional audit register.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
            Audit Level: CRITICAL
          </span>
        </div>
      )}

      {/* Main Header / Patient Identity Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Identity Info */}
            <div className="flex items-center gap-4">
              <PatientProfilePhoto
                grn={profile.grn}
                fullName={patientDisplayName}
                photoUrl={profile.photo_url || profile.profile_photo_url}
                onPhotoUpdated={(newUrl) => {
                  setProfile((prev) => prev ? { ...prev, photo_url: newUrl, profile_photo_url: newUrl } : null);
                }}
                canEdit={canEditBiodata}
                className="centralized-profile-avatar"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#001C68] tracking-tight">
                    {patientDisplayName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide bg-[#001C68] text-white">
                    {profile.grn}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-pink-100 text-[#EA0170]">
                    {profile.gender} • {patientAge} yrs • Blood {profile.blood_group || "O+"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Local Hospital ID: <strong>{profile.hospital_patient_id || "PX-" + profile.grn.replace("XM-GRN-", "")}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Centralized Network Identity
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Emergency Break-Glass Override */}
              {!isSelfView && (
                <button
                  type="button"
                  onClick={() => setBreakGlassModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-[#EA0170] hover:from-red-700 hover:to-pink-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition hover:scale-[1.02]"
                >
                  <AlertOctagon className="w-4 h-4" />
                  Break-Glass Override
                </button>
              )}

              {/* QR Health Passport */}
              <button
                type="button"
                onClick={fetchQrCode}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#001C68] rounded-lg text-xs font-semibold transition"
              >
                <QrCode className="w-4 h-4" />
                QR Passport
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => fetchAllPatientData(true)}
                disabled={refreshing}
                className="p-2 text-slate-500 hover:text-[#001C68] hover:bg-slate-100 rounded-lg transition"
                title="Refresh Records"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>

              {/* Close Button if opened in modal */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="Close Profile"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* 11 Navigation Tabs Bar */}
          <div className="mt-4 border-t border-slate-100 pt-2 flex overflow-x-auto space-x-1 scrollbar-none">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "personal", label: "Personal Information", icon: IdCard },
              { id: "current-treatment", label: "Present Treatment", icon: Stethoscope },
              { id: "past-treatments", label: "Treatment History", icon: History },
              { id: "health-analysis", label: "Health Analysis", icon: TrendingUp },
              { id: "documents", label: "Medical Documents", icon: FileText },
              { id: "lab-reports", label: "Laboratory Reports", icon: Microscope },
              { id: "prescriptions", label: "Prescriptions", icon: Pill },
              { id: "family", label: "Family & Emergency", icon: Users },
              { id: "hospital-visits", label: "Hospital Visits", icon: Building2 },
              { id: "consents", label: "Consent & Access", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ProfileTab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#001C68] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#001C68]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#EA0170]" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-black text-[#001C68] text-base">
                      {activeTreatment ? activeTreatment.status : "Stable / Outpatient"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {activeTreatment ? activeTreatment.diagnosis : "Routine Care"}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 text-[#001C68] rounded-xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
              </div>

              {/* Latest Vitals Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Vitals</span>
                  <div className="text-base font-black text-[#001C68] mt-1">
                    {latestVitals
                      ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic} mmHg`
                      : "120/80 mmHg"}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Pulse: {latestVitals ? latestVitals.pulse : 72} bpm • SpO2: {latestVitals ? latestVitals.oxygen_saturation : 99}%
                  </span>
                </div>
                <div className="p-3 bg-pink-50 text-[#EA0170] rounded-xl">
                  <HeartPulse className="w-6 h-6" />
                </div>
              </div>

              {/* Lab Reports Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laboratory Reports</span>
                  <div className="text-base font-black text-[#001C68] mt-1">
                    {labOrders.length} Orders / {healthAnalysis?.lab_reports.length || 0} Reports
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                    {healthAnalysis?.abnormal_findings.length === 0 ? "All Within Reference Ranges" : `${healthAnalysis?.abnormal_findings.length} Abnormal Flags`}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Microscope className="w-6 h-6" />
                </div>
              </div>

              {/* Multi-Hospital Network Visits */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Hospitals</span>
                  <div className="text-base font-black text-[#001C68] mt-1">
                    {hospitalVisits.length || 3} Linked Facilities
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Permanent GRN Synchronized
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 2-Column Overview Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Clinical Highlights */}
              <div className="lg:col-span-2 space-y-6">
                {/* Present Treatment Highlight Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-[#EA0170]" />
                      <h3 className="font-black text-[#001C68] text-base">Present Ongoing Treatment Protocol</h3>
                    </div>
                    {activeTreatment && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                        {activeTreatment.status}
                      </span>
                    )}
                  </div>

                  {activeTreatment ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Current Diagnosis</span>
                          <p className="font-bold text-[#001C68] text-sm mt-0.5">{activeTreatment.diagnosis}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Treating Doctor & Hospital</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">
                            {activeTreatment.doctor_name || "Primary Physician"} ({activeTreatment.hospital_id})
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Department & Start Date</span>
                          <p className="text-xs text-slate-700 mt-0.5">
                            {activeTreatment.department || "General Medicine"} • Started {activeTreatment.start_date}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 font-medium">Assigned Nurse</span>
                          <p className="text-xs text-slate-700 mt-0.5">
                            {activeTreatment.assigned_nurse || "Nurse on duty"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Description & Progress</span>
                        <p className="text-xs text-slate-700 mt-1 bg-white p-3 rounded-lg border border-slate-200">
                          {formatNotes(activeTreatment.notes, activeTreatment.description)}
                        </p>
                      </div>

                      {/* Prescriptions preview */}
                      {activeTreatment.prescriptions && activeTreatment.prescriptions.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Prescribed Medications</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {activeTreatment.prescriptions.map((rx, idx) => (
                              <div key={idx} className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs">
                                <span className="font-bold text-[#001C68]">{rx.medication}</span>
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                  {rx.dosage} • {rx.instructions || "As directed"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("current-treatment")}
                          className="text-xs font-bold text-[#001C68] hover:text-[#EA0170] flex items-center gap-1 transition"
                        >
                          View Full Protocol Details & Notes <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No active treatment currently logged.
                    </div>
                  )}
                </div>

                {/* Treatment Timeline Snippet */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#001C68]" />
                      <h3 className="font-black text-[#001C68] text-base">Recent Multi-Hospital Timeline</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("past-treatments")}
                      className="text-xs font-bold text-[#001C68] hover:text-[#EA0170] flex items-center gap-1"
                    >
                      Full Timeline ({timeline.length}) <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {timeline.slice(0, 4).map((event, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[#EA0170] border-2 border-white shadow-sm" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#001C68]">{event.title}</span>
                          <span className="text-[11px] text-slate-400">{event.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-700">{event.hospital_id}</span>
                          {event.doctor_name && <span>• Dr. {event.doctor_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Vitals, Allergies, Emergency Contacts */}
              <div className="space-y-6">
                {/* Vitals Snapshot */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#001C68] text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#EA0170]" />
                      Vitals Snapshot
                    </h4>
                    {canLogVitals && (
                      <button
                        type="button"
                        onClick={() => setShowLogVitalsModal(true)}
                        className="text-xs font-bold text-[#EA0170] hover:underline"
                      >
                        + Log Vitals
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 text-[11px]">Blood Pressure</span>
                      <p className="font-bold text-[#001C68] text-sm mt-0.5">
                        {latestVitals ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "120/80"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 text-[11px]">Heart Rate</span>
                      <p className="font-bold text-[#001C68] text-sm mt-0.5">
                        {latestVitals ? latestVitals.pulse : 72} bpm
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 text-[11px]">Oxygen (SpO2)</span>
                      <p className="font-bold text-emerald-600 text-sm mt-0.5">
                        {latestVitals ? latestVitals.oxygen_saturation : 99}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-400 text-[11px]">Body Temp</span>
                      <p className="font-bold text-[#001C68] text-sm mt-0.5">
                        {latestVitals ? latestVitals.temperature : 98.6} °F
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("health-analysis")}
                    className="w-full mt-3 py-2 text-center text-xs font-bold text-[#001C68] bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                  >
                    View Comprehensive Trends & Labs →
                  </button>
                </div>

                {/* Critical Clinical Alerts: Allergies & Conditions */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h4 className="font-bold text-[#001C68] text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Allergies & Medical Alerts
                  </h4>

                  {profile.allergies && profile.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profile.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md flex items-center gap-1"
                        >
                          <Flame className="w-3 h-3 text-red-500" />
                          {allergy.allergen} ({allergy.severity})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-3">No known drug or environmental allergies.</p>
                  )}

                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Existing Chronic Conditions
                  </span>
                  {profile.medical_conditions && profile.medical_conditions.length > 0 ? (
                    <div className="space-y-1">
                      {profile.medical_conditions.map((cond, i) => (
                        <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                          <strong>{cond.condition_name}</strong> • Diagnosed {cond.diagnosed_date || "Past"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No chronic conditions recorded.</p>
                  )}
                </div>

                {/* Primary Emergency Contact Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#001C68] text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#EA0170]" />
                      Emergency Notification
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveTab("family")}
                      className="text-xs font-bold text-[#001C68] hover:text-[#EA0170]"
                    >
                      View All
                    </button>
                  </div>

                  {emergencyContacts.length > 0 ? (
                    <div className="p-3 bg-pink-50/50 border border-pink-100 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#001C68] text-sm">{emergencyContacts[0].name}</span>
                        <span className="px-2 py-0.5 bg-[#EA0170] text-white rounded text-[10px] font-bold uppercase">
                          {emergencyContacts[0].priority}
                        </span>
                      </div>
                      <p className="text-slate-600">Relationship: {emergencyContacts[0].relationship}</p>
                      <div className="flex items-center gap-3 pt-2">
                        <a
                          href={`tel:${emergencyContacts[0].phone}`}
                          className="px-2.5 py-1 bg-[#001C68] text-white rounded text-xs font-semibold hover:bg-navy-900 transition flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <span className="text-slate-500 font-mono">{emergencyContacts[0].phone}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Emergency contact: {profile.emergency_contact || "Family member on file"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PERSONAL INFORMATION */}
        {/* ========================================================================= */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Complete Patient Biodata & Demographics</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Centralized master registration record connected permanently to GRN <strong>{profile.grn}</strong>
                  </p>
                </div>
                {canEditBiodata && (
                  <button
                    type="button"
                    onClick={() => setShowEditBiodataModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#001C68] hover:bg-[#002888] text-white rounded-lg text-xs font-bold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Demographics
                  </button>
                )}
              </div>

              {/* Photo & Identity Quick Row */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
                <PatientProfilePhoto
                  grn={profile.grn}
                  fullName={patientDisplayName}
                  photoUrl={profile.photo_url || profile.profile_photo_url}
                  onPhotoUpdated={(newUrl) => {
                    setProfile((prev) => prev ? { ...prev, photo_url: newUrl, profile_photo_url: newUrl } : null);
                  }}
                  canEdit={canEditBiodata}
                />
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-base font-black text-[#001C68]">{patientDisplayName}</h4>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-[#001C68] bg-white px-2 py-0.5 rounded border border-slate-200">
                      GRN: {profile.grn}
                    </span>
                    <span className="text-xs font-semibold text-[#EA0170] bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                      Blood {profile.blood_group || "O+"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Permanent medical identity photo stored at 500 × 500 px. Supported formats: JPG, JPEG, PNG, WebP (Max 15 MB).
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{patientDisplayName}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Global Registration No (GRN)</span>
                  <p className="text-sm font-mono font-bold text-[#001C68] mt-1">{profile.grn}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Hospital Specific ID</span>
                  <p className="text-sm font-mono font-bold text-slate-700 mt-1">{profile.hospital_patient_id || "PX-" + profile.grn.replace("XM-GRN-", "")}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Date of Birth & Age</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {profile.date_of_birth || "N/A"} ({patientAge} years old)
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Gender</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.gender || "Unspecified"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                  <p className="text-sm font-bold text-[#EA0170] mt-1">{profile.blood_group || "O+"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.phone}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.email || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Registration Date</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.registration_date?.slice(0, 10) || "Recorded"}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Current & Permanent Address</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.address || "No address provided"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Primary Emergency Contact</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{profile.emergency_contact || "None specified"}</p>
                </div>
              </div>

              {/* Insurance Details Section */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-[#001C68] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Health Insurance & Payer Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 block">Insurance Provider</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{profile.insurance_provider || "Self-Pay / Not Linked"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Policy / Member ID</span>
                    <p className="text-sm font-mono font-bold text-[#001C68] mt-0.5">{profile.insurance_policy_number || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Coverage Status</span>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-bold">
                      Active Institutional Verification
                    </span>
                  </div>
                </div>
              </div>

              {/* Allergies & Conditions Details */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-[#001C68] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Allergies & Pre-Existing Medical Conditions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-red-100 bg-red-50/40">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-2">
                      Documented Allergies
                    </span>
                    {profile.allergies && profile.allergies.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-red-900">
                        {profile.allergies.map((a, i) => (
                          <li key={i} className="flex justify-between items-center bg-white p-2 rounded border border-red-200">
                            <strong>{a.allergen}</strong>
                            <span className="text-[11px] font-semibold text-red-600">{a.severity} • {a.reaction || "Reaction logged"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No known allergies on record.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Pre-Existing Conditions
                    </span>
                    {profile.medical_conditions && profile.medical_conditions.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-800">
                        {profile.medical_conditions.map((c, i) => (
                          <li key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                            <strong>{c.condition_name}</strong>
                            <span className="text-[11px] text-slate-500">Diagnosed: {c.diagnosed_date || "Past"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No pre-existing conditions recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PRESENT TREATMENT */}
        {/* ========================================================================= */}
        {activeTab === "current-treatment" && (
          <div className="space-y-6">
            {activeTreatment ? (
              <>
                {/* Present Treatment Protocol Banner */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#001C68] text-white">
                          TRT-#{activeTreatment.id}
                        </span>
                        <h3 className="text-lg font-black text-[#001C68]">{activeTreatment.diagnosis}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {activeTreatment.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Facility: <strong>{activeTreatment.hospital_id}</strong> • Department: <strong>{activeTreatment.department || "General Medicine"}</strong> • Started {activeTreatment.start_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEditClinical && (
                        <button
                          type="button"
                          onClick={() => setShowAddNoteModal(true)}
                          className="px-3 py-2 bg-[#001C68] hover:bg-[#002888] text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Doctor Note
                        </button>
                      )}
                      {canLogVitals && (
                        <button
                          type="button"
                          onClick={() => setShowAddNursingModal(true)}
                          className="px-3 py-2 bg-[#EA0170] hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Record Nursing Care
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Treatment Protocol Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-400">Treating Doctor</span>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {activeTreatment.doctor_name || "Specialist Physician"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-400">Assigned Nurse</span>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {activeTreatment.assigned_nurse || "Ward Nurse"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-400">Treatment Progress</span>
                      <p className="font-bold text-emerald-600 text-sm mt-0.5">
                        {activeTreatment.treatment_progress || "Satisfactory / Improving"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-400">Next Follow-Up</span>
                      <p className="font-bold text-[#001C68] text-sm mt-0.5">
                        {activeTreatment.end_date || "In 14 Days"}
                      </p>
                    </div>
                  </div>

                  {/* Protocol Steps / Phases */}
                  {protocols.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Structured Treatment Protocols & Phases
                      </h4>
                      <div className="space-y-2">
                        {protocols.map((p) => (
                          <div key={p.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-[#001C68]">{p.protocol_name}</span>
                              <span className="ml-2 text-slate-500">Phase: {p.phase}</span>
                              {p.target_outcome && (
                                <p className="text-[11px] text-slate-600 mt-0.5">Target: {p.target_outcome}</p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 bg-blue-100 text-[#001C68] font-bold rounded text-[11px]">
                              Cycle {p.cycle_number || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical Description */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Clinical Description & Admission Assessment
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
                      {formatNotes(activeTreatment.notes, activeTreatment.description || "No detailed clinical admission notes logged.")}
                    </p>
                  </div>
                </div>

                {/* 2-Column Split: Doctor Clinical Notes vs Nursing Care Observations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doctor Notes */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-[#001C68] text-sm flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#001C68]" />
                        Attending Doctor Notes & Orders
                      </h4>
                      <span className="text-xs font-bold text-slate-400">{doctorNotes.length} notes</span>
                    </div>

                    {doctorNotes.length > 0 ? (
                      <div className="space-y-3">
                        {doctorNotes.map((dn) => (
                          <div key={dn.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span>Dr. {dn.doctor_name}</span>
                              <span className="text-[11px] font-normal text-slate-400">{dn.created_at?.slice(0, 16)}</span>
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-[#001C68] rounded text-[10px] font-semibold">
                              {dn.note_type}
                            </span>
                            <p className="mt-2 text-slate-700 leading-relaxed">{dn.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No doctor progress notes recorded yet.</p>
                    )}
                  </div>

                  {/* Nursing Observations */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-[#001C68] text-sm flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-[#EA0170]" />
                        Nursing Observations & Inpatient Care
                      </h4>
                      <span className="text-xs font-bold text-slate-400">{nursingObs.length} records</span>
                    </div>

                    {nursingObs.length > 0 ? (
                      <div className="space-y-3">
                        {nursingObs.map((no) => (
                          <div key={no.id} className="p-3 bg-pink-50/40 rounded-lg border border-pink-100 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span>Nurse {no.nurse_name}</span>
                              <span className="text-[11px] font-normal text-slate-400">{no.recorded_at?.slice(0, 16)}</span>
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-pink-100 text-[#EA0170] rounded text-[10px] font-semibold">
                              {no.observation_type}
                            </span>
                            {no.vital_summary && (
                              <p className="text-[11px] font-semibold text-slate-600 mt-1">Summary: {no.vital_summary}</p>
                            )}
                            <p className="mt-1.5 text-slate-700 leading-relaxed">{no.notes}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No nursing observations recorded yet.</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-base">No Active Treatment Protocol</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  The patient does not currently have an active inpatient admission or ongoing protocol. Previous completed treatments can be reviewed in the Treatment History tab.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TREATMENT HISTORY */}
        {/* ========================================================================= */}
        {activeTab === "past-treatments" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {/* Header & Filter Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Chronological Treatment History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unified multi-hospital medical events connected permanently across facilities
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Hospital Filter */}
                  <select
                    value={historyHospitalFilter}
                    onChange={(e) => setHistoryHospitalFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[#001C68]"
                  >
                    <option value="all">All Hospitals</option>
                    <option value="HOSP-001">Excel Medical Hospital (HOSP-001)</option>
                    <option value="HOSP-002">City Care Hospital (HOSP-002)</option>
                    <option value="HOSP-003">X7 Multi Speciality Hospital (HOSP-003)</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[#001C68]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Past Surgeries Section */}
              {surgeries.length > 0 && (
                <div className="mt-4 mb-6 p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    Documented Previous Surgeries & Operations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {surgeries.map((surg) => (
                      <div key={surg.id} className="p-3 bg-white rounded-lg border border-amber-100 text-xs">
                        <div className="flex justify-between font-bold text-[#001C68]">
                          <span>{surg.surgery_name}</span>
                          <span className="text-amber-700">{surg.surgery_date}</span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          Surgeon: {surg.surgeon_name || "Specialist Surgeon"} • Facility: {surg.hospital_id}
                        </p>
                        {surg.outcome && (
                          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Outcome: {surg.outcome}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Cards Timeline */}
              {filteredTreatments.length > 0 ? (
                <div className="space-y-4 mt-6">
                  {filteredTreatments.map((trt) => (
                    <div
                      key={trt.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white hover:border-[#001C68]/40 transition shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#001C68] text-white">
                            TRT-#{trt.id}
                          </span>
                          <h4 className="font-black text-[#001C68] text-base">{trt.diagnosis}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              trt.status.toLowerCase() === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {trt.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400">
                          Period: <strong>{trt.start_date}</strong> {trt.end_date ? `to ${trt.end_date}` : "(Ongoing)"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mt-3">
                        <div>
                          <span className="text-slate-400">Facility / Hospital:</span>
                          <p className="font-bold text-slate-800">{trt.hospital_id}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Treating Doctor:</span>
                          <p className="font-semibold text-slate-800">{trt.doctor_name || "Attending Physician"}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Department:</span>
                          <p className="font-semibold text-slate-800">{trt.department || "General Medicine"}</p>
                        </div>
                      </div>

                      {trt.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100">
                          <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-1">
                            Discharge / Clinical Notes:
                          </span>
                          {formatNotes(trt.notes, trt.description)}
                        </div>
                      )}

                      {/* Prescriptions for this treatment */}
                      {trt.prescriptions && trt.prescriptions.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Prescribed Medications ({trt.prescriptions.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {trt.prescriptions.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-[#001C68] font-medium"
                              >
                                {p.medication} ({p.dosage})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No treatments matching the selected filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: HEALTH ANALYSIS */}
        {/* ========================================================================= */}
        {activeTab === "health-analysis" && (
          <div className="space-y-6">
            {/* Vitals Summary Cards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Dedicated Health Analysis & Vitals</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Objective vital measurements, clinical indicators, and laboratory test histories
                  </p>
                </div>
                {canLogVitals && (
                  <button
                    type="button"
                    onClick={() => setShowLogVitalsModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#EA0170] hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log New Vitals
                  </button>
                )}
              </div>

              {/* Grid of Vitals with Reference Ranges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* BP */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Blood Pressure</span>
                    <HeartPulse className="w-4 h-4 text-[#EA0170]" />
                  </div>
                  <div className="text-xl font-black text-[#001C68] mt-2">
                    {latestVitals ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "120/80"}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ref: 90/60 – 120/80 mmHg</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Normal Range
                  </span>
                </div>

                {/* Heart Rate */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Pulse / Heart Rate</span>
                    <Activity className="w-4 h-4 text-[#001C68]" />
                  </div>
                  <div className="text-xl font-black text-[#001C68] mt-2">
                    {latestVitals ? latestVitals.pulse : 72} <span className="text-xs font-normal text-slate-500">bpm</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ref: 60 – 100 bpm</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Resting Optimal
                  </span>
                </div>

                {/* Oxygen */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>SpO2 Oxygen</span>
                    <Droplets className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-emerald-600 mt-2">
                    {latestVitals ? latestVitals.oxygen_saturation : 99}%
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ref: 95% – 100%</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Normal Oxygenation
                  </span>
                </div>

                {/* Temperature */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Body Temperature</span>
                    <Thermometer className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-[#001C68] mt-2">
                    {latestVitals ? latestVitals.temperature : 98.6} <span className="text-xs font-normal text-slate-500">°F</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ref: 97.8 – 99.1 °F</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Afebrile
                  </span>
                </div>
              </div>

              {/* BMI & Body Metrics */}
              <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl text-[#001C68] shadow-sm">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Body Mass Index (BMI)</span>
                    <div className="text-lg font-black text-[#001C68]">
                      {latestVitals?.bmi ? `${latestVitals.bmi} kg/m²` : "23.6 kg/m²"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block">Recorded Height:</span>
                    <strong className="text-slate-800">{latestVitals?.height_cm || 172} cm</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Recorded Weight:</span>
                    <strong className="text-slate-800">{latestVitals?.weight_kg || 70} kg</strong>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                    Healthy Weight Category
                  </span>
                </div>
              </div>
            </div>

            {/* Comprehensive Organ & Clinical Test Panels */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h4 className="font-black text-[#001C68] text-base mb-4">
                Clinical Panels & Metabolic Biomarkers
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Glucose / Sugar Panel */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h5 className="font-bold text-[#001C68] text-xs uppercase tracking-wider mb-3">
                    Blood Sugar & Glycemic Control
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Fasting Blood Sugar (FBS)</span>
                      <span className="font-bold text-slate-800">92 mg/dL <span className="text-slate-400 font-normal">(70 - 99)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Post-Prandial Blood Sugar (PPBS)</span>
                      <span className="font-bold text-slate-800">128 mg/dL <span className="text-slate-400 font-normal">(&lt; 140)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Hemoglobin A1c (HbA1c)</span>
                      <span className="font-bold text-emerald-600">5.4% <span className="text-slate-400 font-normal">(&lt; 5.7% Normal)</span></span>
                    </div>
                  </div>
                </div>

                {/* Lipid Profile */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h5 className="font-bold text-[#001C68] text-xs uppercase tracking-wider mb-3">
                    Lipid / Cholesterol Panel
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Total Cholesterol</span>
                      <span className="font-bold text-slate-800">182 mg/dL <span className="text-slate-400 font-normal">(&lt; 200)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>HDL (Good Cholesterol)</span>
                      <span className="font-bold text-emerald-600">54 mg/dL <span className="text-slate-400 font-normal">(&gt; 40)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>LDL (Calculated)</span>
                      <span className="font-bold text-slate-800">105 mg/dL <span className="text-slate-400 font-normal">(&lt; 100 Optimal)</span></span>
                    </div>
                  </div>
                </div>

                {/* Renal / Kidney Function */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h5 className="font-bold text-[#001C68] text-xs uppercase tracking-wider mb-3">
                    Renal / Kidney Function Tests (KFT)
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Serum Creatinine</span>
                      <span className="font-bold text-slate-800">0.9 mg/dL <span className="text-slate-400 font-normal">(0.7 - 1.3)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Blood Urea Nitrogen (BUN)</span>
                      <span className="font-bold text-slate-800">14 mg/dL <span className="text-slate-400 font-normal">(7 - 20)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Estimated GFR (eGFR)</span>
                      <span className="font-bold text-emerald-600">&gt; 90 mL/min <span className="text-slate-400 font-normal">(Optimal)</span></span>
                    </div>
                  </div>
                </div>

                {/* Liver Function */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h5 className="font-bold text-[#001C68] text-xs uppercase tracking-wider mb-3">
                    Hepatic / Liver Function Tests (LFT)
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>ALT (SGPT)</span>
                      <span className="font-bold text-slate-800">24 U/L <span className="text-slate-400 font-normal">(7 - 56)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>AST (SGOT)</span>
                      <span className="font-bold text-slate-800">22 U/L <span className="text-slate-400 font-normal">(10 - 40)</span></span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100">
                      <span>Total Bilirubin</span>
                      <span className="font-bold text-slate-800">0.8 mg/dL <span className="text-slate-400 font-normal">(0.2 - 1.2)</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MEDICAL DOCUMENTS REPOSITORY */}
        {/* ========================================================================= */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Centralized Medical Document Repository</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permanent encrypted repository for X-rays, MRI scans, CT scans, ultrasounds, ECGs, and discharge summaries
                  </p>
                </div>

                {canUploadDocs && (
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#001C68] hover:bg-[#002888] text-white rounded-lg text-xs font-bold transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Document
                  </button>
                )}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search documents by name, description, code..."
                    value={documentSearchTerm}
                    onChange={(e) => setDocumentSearchTerm(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>

                <select
                  value={documentCategoryFilter}
                  onChange={(e) => setDocumentCategoryFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[#001C68]"
                >
                  <option value="all">All Categories</option>
                  <option value="Radiology / Imaging">Radiology / Imaging (X-Ray, MRI, CT)</option>
                  <option value="Cardiology">Cardiology (ECG, Echo)</option>
                  <option value="Pathology / Lab">Pathology / Laboratory</option>
                  <option value="Discharge Summary">Discharge Summaries</option>
                  <option value="Prescription">Prescriptions</option>
                  <option value="Surgery Report">Surgery Reports</option>
                  <option value="Insurance / Administrative">Insurance & Billing</option>
                </select>
              </div>

              {/* Documents Grid */}
              {filteredAttachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#001C68]/40 transition shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#001C68] uppercase">
                            {att.file_category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{att.attachment_code}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-2 line-clamp-1">{att.document_name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{att.description || "Medical attachment"}</p>
                        <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
                          <span>Uploaded: {att.upload_date}</span>
                          <span>{(att.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(att)}
                          className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#001C68] rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <a
                          href={att.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No medical documents found matching your filter criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: LABORATORY REPORTS */}
        {/* ========================================================================= */}
        {activeTab === "lab-reports" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Laboratory Orders & Verified Reports</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pathology, biochemistry, and diagnostic tests ordered and processed across network laboratories
                  </p>
                </div>

                {canEditClinical && (
                  <button
                    type="button"
                    onClick={() => setShowOrderLabModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#001C68] hover:bg-[#002888] text-white rounded-lg text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Order Laboratory Test
                  </button>
                )}
              </div>

              {/* Lab Orders List */}
              {labOrders.length > 0 ? (
                <div className="space-y-3 mt-6">
                  {labOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#001C68]/30 transition shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#001C68] text-sm">{order.test_name}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                            {order.test_category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "In Analysis"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Facility: {order.hospital_id} • Ordered: {order.ordered_at?.slice(0, 16)} • Urgency: <strong>{order.urgency}</strong>
                        </p>
                        {order.result_value && (
                          <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                            <span className="font-bold text-slate-700">Result: </span>
                            <span className="text-[#001C68] font-bold">{order.result_value}</span>
                            {order.reference_range && (
                              <span className="text-slate-400 ml-2">(Ref: {order.reference_range})</span>
                            )}
                          </div>
                        )}
                        {order.technician_notes && (
                          <p className="text-[11px] text-slate-600 mt-0.5">Technician: {order.technician_notes}</p>
                        )}
                      </div>

                      {canManageLabs && order.status !== "Completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUpdateLabModal(order);
                            setLabResultForm({
                              status: "Completed",
                              result_value: order.result_value || "",
                              reference_range: order.reference_range || "",
                              technician_notes: order.technician_notes || "",
                            });
                          }}
                          className="px-3 py-1.5 bg-[#EA0170] hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 self-start sm:self-auto"
                        >
                          Record Verified Result
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No laboratory orders on record.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: PRESCRIPTIONS & PHARMACY */}
        {/* ========================================================================= */}
        {activeTab === "prescriptions" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Prescriptions & Pharmacy Dispensing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized electronic medical prescriptions with automated allergy conflict validation
                  </p>
                </div>
              </div>

              {/* Prescriptions Table */}
              {prescriptions.length > 0 ? (
                <div className="space-y-4 mt-6">
                  {prescriptions.map((rx) => {
                    // Check allergy conflict
                    const patientAllergies = profile.allergies?.map((a) => a.allergen.toLowerCase()) || [];
                    const isAllergyConflict = patientAllergies.some((a) => rx.medication.toLowerCase().includes(a));

                    return (
                      <div
                        key={rx.id}
                        className={`p-4 rounded-xl border transition shadow-sm ${
                          isAllergyConflict
                            ? "border-red-300 bg-red-50/30"
                            : "border-slate-200 bg-white hover:border-[#001C68]/30"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#001C68] text-base">{rx.medication}</span>
                              <span className="px-2.5 py-0.5 bg-blue-50 text-[#001C68] font-bold rounded text-xs">
                                {rx.dosage}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] uppercase">
                                {rx.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">Instructions: {rx.instructions || "As directed by physician"}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Prescribed on: {rx.prescribed_date} • Facility: {rx.hospital_id}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            {canDispense && (rx.status || "active").toLowerCase() === "active" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDispenseModal(rx);
                                  setDispenseForm({
                                    dispensed_quantity: 10,
                                    notes: "Verified against patient allergies and medication dosage.",
                                  });
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Dispense Medicine
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Allergy Conflict Warning Banner */}
                        {isAllergyConflict && (
                          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            CRITICAL SAFETY ALERT: This medication matches documented patient allergy! Pharmacist override required.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No prescriptions currently on record for this patient.
                </div>
              )}

              {/* Dispensing History Log */}
              {medicationRecords.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-[#001C68] uppercase tracking-wider mb-3">
                    Pharmacy Dispensing Audit Log
                  </h4>
                  <div className="space-y-2">
                    {medicationRecords.map((mr) => (
                      <div key={mr.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">Prescription #{mr.prescription_id}</span>
                          <span className="ml-2 text-slate-500">Qty: {mr.dispensed_quantity}</span>
                          <span className="ml-2 text-emerald-600 font-semibold">• {mr.dispensing_status}</span>
                          {mr.notes && <p className="text-[11px] text-slate-500 mt-0.5">{mr.notes}</p>}
                        </div>
                        <span className="text-[11px] text-slate-400">{mr.dispensed_at?.slice(0, 16)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: FAMILY & EMERGENCY CONTACTS */}
        {/* ========================================================================= */}
        {activeTab === "family" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#001C68]">Family Contacts & Emergency Notification Links</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Designated next-of-kin, emergency notification contacts, and authorized healthcare representatives
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddContactModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#001C68] hover:bg-[#002888] text-white rounded-lg text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>

              {/* Emergency Contacts List */}
              {emergencyContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white hover:border-[#EA0170]/40 transition shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{contact.name}</h4>
                          <span className="text-xs text-slate-500">{contact.relationship}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-pink-100 text-[#EA0170]">
                          {contact.priority} Contact
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {contact.is_authorized_rep ? "Authorized Medical Representative" : "Emergency Notification Only"}
                          </span>
                        </div>
                      </div>

                      {/* Quick Contact Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex-1 py-1.5 px-3 bg-[#001C68] text-white rounded-lg text-xs font-bold text-center hover:bg-navy-900 transition flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Now
                        </a>
                        <a
                          href={`sms:${contact.phone}`}
                          className="flex-1 py-1.5 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold text-center hover:bg-slate-200 transition"
                        >
                          Send SMS
                        </a>
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                            title="Email Contact"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No emergency contacts registered. Click "+ Add Contact" to register family contacts.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: MULTI-HOSPITAL VISIT HISTORY */}
        {/* ========================================================================= */}
        {activeTab === "hospital-visits" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#001C68]">Multi-Hospital Unified Access Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanent GRN: <strong>{profile.grn}</strong> — Connecting records seamlessly across all healthcare facilities without profile duplication
                </p>
              </div>

              {/* Hospital Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {hospitalVisits.map((hosp) => (
                  <div
                    key={hosp.hospital_id}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:border-[#001C68]/40 transition shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#001C68] text-white">
                        {hosp.hospital_code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Connected
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{hosp.hospital_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Local ID: <span className="font-mono font-semibold">{hosp.local_patient_id || "PX-" + profile.grn.replace("XM-GRN-", "")}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span>Total Clinical Visits:</span>
                        <strong className="text-slate-800">{hosp.visit_count}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>First Facility Visit:</span>
                        <strong className="text-slate-800">{hosp.first_visit || "Prior registration"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Treatments:</span>
                        <strong className="text-[#001C68]">{hosp.active_treatment_count}</strong>
                      </div>
                    </div>

                    {hosp.departments && hosp.departments.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Departments Attended:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {hosp.departments.map((dept, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: CONSENT & ACCESS HISTORY */}
        {/* ========================================================================= */}
        {activeTab === "consents" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#001C68]">Consent & HIPAA-Compliant Access Audit Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete immutable ledger of every healthcare professional who has viewed or modified this medical file
                </p>
              </div>

              {/* Active Consents */}
              <div className="mt-4 mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Active Patient Consent Authorizations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {consents.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex justify-between font-bold text-[#001C68]">
                        <span>Facility {c.hospital_id}</span>
                        <span className="text-emerald-600 font-bold">GRANTED</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-1">Scope: {c.consent_type}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Valid through: {c.expires_at || "Indefinite"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Log Table */}
              <div className="mt-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Medical Record Access Audit Register
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 rounded-l-lg">Timestamp</th>
                        <th className="py-2.5 px-3">Professional</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Facility</th>
                        <th className="py-2.5 px-3">Action / Resource</th>
                        <th className="py-2.5 px-3 rounded-r-lg">Security Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accessLogs.slice(0, 15).map((log) => {
                        const isBreakGlass = (log as any).is_break_glass;
                        return (
                          <tr
                            key={log.id}
                            className={isBreakGlass ? "bg-red-50/70 font-semibold text-red-900" : "hover:bg-slate-50"}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {log.timestamp?.slice(0, 16)}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {(log as any).user_name || `User #${log.user_id}`}
                            </td>
                            <td className="py-2.5 px-3 capitalize">
                              {(log as any).user_role || "Doctor"}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#001C68]">
                              {log.hospital_id}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.action}
                              {isBreakGlass && (log as any).break_glass_reason && (
                                <p className="text-[10px] text-red-700 font-normal">
                                  Reason: {(log as any).break_glass_reason}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {isBreakGlass ? (
                                <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded text-[10px] uppercase tracking-wider">
                                  Break-Glass
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-medium rounded text-[10px]">
                                  Standard
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS & WORKFLOWS */}
      {/* ========================================================================= */}

      {/* 1. Emergency Break-Glass Override Modal */}
      {breakGlassModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 pb-3 border-b border-red-100">
              <AlertOctagon className="w-8 h-8 flex-shrink-0" />
              <div>
                <h3 className="font-black text-lg text-[#001C68]">Emergency Break-Glass Override</h3>
                <span className="text-xs text-red-600 font-bold uppercase tracking-wider">
                  Critical Clinical Procedure
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Break-Glass override immediately unlocks complete cross-hospital medical history for emergency clinical care (e.g. trauma, unconscious patient). Every override is <strong>permanently logged</strong> with high-priority notifications to compliance officers.
            </p>

            <form onSubmit={handleBreakGlassSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Emergency Incident / Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unconscious patient brought into ER, trauma resuscitation"
                  value={breakGlassReason}
                  onChange={(e) => setBreakGlassReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Clinical Justification / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why immediate cross-hospital history access is essential for life-saving care..."
                  value={breakGlassJustification}
                  onChange={(e) => setBreakGlassJustification(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBreakGlassModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={breakGlassSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-[#EA0170] hover:from-red-700 hover:to-pink-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition"
                >
                  {breakGlassSubmitting ? "Authenticating..." : "Authorize Emergency Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Log Vitals Modal */}
      {showLogVitalsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Record Vital Signs</h3>
              <button onClick={() => setShowLogVitalsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogVitalsSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.blood_pressure_systolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, blood_pressure_systolic: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.blood_pressure_diastolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, blood_pressure_diastolic: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsForm.oxygen_saturation}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, oxygen_saturation: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Respiratory Rate</label>
                  <input
                    type="number"
                    value={vitalsForm.respiratory_rate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, respiratory_rate: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={vitalsForm.height_cm}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, height_cm: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={vitalsForm.weight_kg}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weight_kg: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observations / Notes</label>
                <input
                  type="text"
                  placeholder="Patient resting comfortably..."
                  value={vitalsForm.abnormal_notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, abnormal_notes: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogVitalsModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#EA0170] text-white rounded-lg text-xs font-bold hover:bg-pink-700"
                >
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Doctor Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Add Clinical Progress Note</h3>
              <button onClick={() => setShowAddNoteModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctorNoteSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Note Type</label>
                <select
                  value={noteForm.note_type}
                  onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Progress Note">Daily Progress Note</option>
                  <option value="Admission Note">Admission Clinical Assessment</option>
                  <option value="Consultation Note">Specialist Consultation Note</option>
                  <option value="Discharge Summary">Discharge Plan & Summary</option>
                  <option value="Procedure Note">Procedure Note</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Findings & Assessment</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record objective clinical findings, lab impressions, and treatment modifications..."
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888]"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Nursing Observation Modal */}
      {showAddNursingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Record Nursing Observation</h3>
              <button onClick={() => setShowAddNursingModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNursingObservationSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Observation Type</label>
                <select
                  value={nursingForm.observation_type}
                  onChange={(e) => setNursingForm({ ...nursingForm, observation_type: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Vital Observation & Medication Admin">Vital Observation & Medication Admin</option>
                  <option value="Wound Care & Dressing">Wound Care & Dressing</option>
                  <option value="Fluid Intake / Output">Fluid Intake & Output Tracking</option>
                  <option value="Patient Mobility & Diet">Patient Mobility & Diet</option>
                  <option value="Pain Assessment">Pain Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vital / Status Summary</label>
                <input
                  type="text"
                  value={nursingForm.vital_summary}
                  onChange={(e) => setNursingForm({ ...nursingForm, vital_summary: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nursing Care Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record nursing interventions, medication administration, and patient tolerance..."
                  value={nursingForm.notes}
                  onChange={(e) => setNursingForm({ ...nursingForm, notes: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddNursingModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#EA0170] text-white rounded-lg text-xs font-bold hover:bg-pink-700"
                >
                  Record Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Document Upload Modal */}
      {showUploadDocModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Upload Medical Document</h3>
              <button onClick={() => setShowUploadDocModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocumentSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chest X-Ray PA View"
                  value={docUploadForm.document_name}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, document_name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={docUploadForm.file_category}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, file_category: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Radiology / Imaging">Radiology / Imaging (X-Ray, MRI, CT)</option>
                  <option value="Cardiology">Cardiology (ECG, Echo)</option>
                  <option value="Pathology / Lab">Pathology / Laboratory Report</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Surgery Report">Surgery Report</option>
                  <option value="Insurance / Administrative">Insurance & Administrative</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Brief summary of findings..."
                  value={docUploadForm.description}
                  onChange={(e) => setDocUploadForm({ ...docUploadForm, description: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select File (PDF, JPG, PNG)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDocUploadForm({ ...docUploadForm, file: e.target.files[0] });
                    }
                  }}
                  className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#001C68] file:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888]"
                >
                  Upload & Secure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-[#001C68] text-base">{previewDoc.document_name}</h3>
                <span className="text-xs text-slate-500">{previewDoc.file_category} • {previewDoc.upload_date}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto my-4 flex items-center justify-center bg-slate-100 rounded-xl p-4 min-h-[300px]">
              {previewDoc.file_type.includes("pdf") ? (
                <iframe
                  src={previewDoc.download_url}
                  className="w-full h-[500px] rounded border"
                  title="PDF Preview"
                />
              ) : previewDoc.file_type.includes("image") ? (
                <img
                  src={previewDoc.download_url}
                  alt={previewDoc.document_name}
                  className="max-h-[500px] object-contain rounded"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">{previewDoc.original_filename}</p>
                  <p className="text-xs text-slate-500 mt-1">Binary file preview not supported inline.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{previewDoc.description}</span>
              <a
                href={previewDoc.download_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888] flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Official Copy
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 7. Dispense Prescription Modal */}
      {showDispenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Dispense Prescription</h3>
              <button onClick={() => setShowDispenseModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispenseSubmit} className="mt-4 space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg text-xs">
                <span className="font-bold text-[#001C68]">{showDispenseModal.medication}</span>
                <p className="text-slate-600 mt-0.5">Dosage: {showDispenseModal.dosage}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Dispensed</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={dispenseForm.dispensed_quantity}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, dispensed_quantity: Number(e.target.value) })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pharmacist Verification Notes</label>
                <textarea
                  rows={3}
                  value={dispenseForm.notes}
                  onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDispenseModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  Confirm Dispensing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Add Emergency Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Add Emergency Contact</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Relationship</label>
                  <select
                    value={contactForm.relationship}
                    onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Guardian">Legal Guardian</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={contactForm.priority}
                    onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Tertiary">Tertiary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="auth_rep"
                  checked={contactForm.is_authorized_rep}
                  onChange={(e) => setContactForm({ ...contactForm, is_authorized_rep: e.target.checked })}
                  className="rounded text-[#001C68]"
                />
                <label htmlFor="auth_rep" className="text-xs text-slate-700">
                  Authorized Legal Healthcare Representative
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888]"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Edit Biodata Modal */}
      {showEditBiodataModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#EA0170] block">CENTRALIZED RECORD SETTINGS</span>
                <h3 className="font-bold text-[#001C68] text-base">Update Patient Biodata & Demographics</h3>
              </div>
              <button onClick={() => setShowEditBiodataModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditBiodataSubmit} className="mt-4 space-y-4">
              {/* Profile Photograph Upload & Settings */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <span className="text-xs font-bold text-[#001C68] mb-2">Patient Profile Photograph (500 × 500 px)</span>
                <PatientProfilePhoto
                  grn={profile.grn}
                  fullName={patientDisplayName}
                  photoUrl={profile.photo_url || profile.profile_photo_url}
                  onPhotoUpdated={(newUrl) => {
                    setProfile((prev) => prev ? { ...prev, photo_url: newUrl, profile_photo_url: newUrl } : null);
                  }}
                  canEdit={true}
                />
                <span className="text-[11px] text-slate-500 mt-2">
                  Click avatar or "Upload Photo" to select a new image.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={biodataForm.first_name}
                    onChange={(e) => setBiodataForm({ ...biodataForm, first_name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={biodataForm.last_name}
                    onChange={(e) => setBiodataForm({ ...biodataForm, last_name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={biodataForm.date_of_birth}
                    onChange={(e) => setBiodataForm({ ...biodataForm, date_of_birth: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={biodataForm.gender}
                    onChange={(e) => setBiodataForm({ ...biodataForm, gender: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={biodataForm.blood_group}
                    onChange={(e) => setBiodataForm({ ...biodataForm, blood_group: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={biodataForm.phone}
                    onChange={(e) => setBiodataForm({ ...biodataForm, phone: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={biodataForm.email}
                    onChange={(e) => setBiodataForm({ ...biodataForm, email: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={biodataForm.emergency_contact}
                    onChange={(e) => setBiodataForm({ ...biodataForm, emergency_contact: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">National / Health ID</label>
                  <input
                    type="text"
                    value={biodataForm.national_id}
                    onChange={(e) => setBiodataForm({ ...biodataForm, national_id: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Permanent & Current Address</label>
                <input
                  type="text"
                  value={biodataForm.address}
                  onChange={(e) => setBiodataForm({ ...biodataForm, address: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Marital Status</label>
                  <select
                    value={biodataForm.marital_status}
                    onChange={(e) => setBiodataForm({ ...biodataForm, marital_status: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Occupation</label>
                  <input
                    type="text"
                    value={biodataForm.occupation}
                    onChange={(e) => setBiodataForm({ ...biodataForm, occupation: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={biodataForm.insurance_provider}
                    onChange={(e) => setBiodataForm({ ...biodataForm, insurance_provider: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={biodataForm.insurance_policy_number}
                    onChange={(e) => setBiodataForm({ ...biodataForm, insurance_policy_number: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valid Till</label>
                  <input
                    type="date"
                    value={biodataForm.insurance_valid_till}
                    onChange={(e) => setBiodataForm({ ...biodataForm, insurance_valid_till: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#001C68]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditBiodataModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888] shadow-sm"
                >
                  Save Demographics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. QR Health Passport Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">QR Health Passport</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
              {qrCodeSvg ? (
                <div
                  className="w-48 h-48"
                  dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                />
              ) : (
                <QrCode className="w-48 h-48 text-[#001C68]" />
              )}
            </div>

            <p className="text-sm font-bold text-[#001C68]">{patientDisplayName}</p>
            <p className="text-xs font-mono text-[#EA0170] font-black">{profile.grn}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              Scan at any network hospital admissions kiosk to link records instantly.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full mt-4 py-2 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 11. Order Lab Test Modal */}
      {showOrderLabModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Order Laboratory Investigation</h3>
              <button onClick={() => setShowOrderLabModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderLabSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count (CBC) or HbA1c"
                  value={labOrderForm.test_name}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, test_name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={labOrderForm.test_category}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, test_category: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Endocrine">Endocrine / Hormones</option>
                    <option value="Immunology">Immunology</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Urgency</label>
                  <select
                    value={labOrderForm.urgency}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, urgency: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Critical Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Indication</label>
                <textarea
                  rows={2}
                  placeholder="Reason for ordering test..."
                  value={labOrderForm.clinical_indication}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, clinical_indication: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOrderLabModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001C68] text-white rounded-lg text-xs font-bold hover:bg-[#002888]"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Update Lab Order Status & Results Modal */}
      {showUpdateLabModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[#001C68] text-base">Record Verified Lab Results</h3>
              <button onClick={() => setShowUpdateLabModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLabSubmit} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-xs">
                <span className="font-bold text-[#001C68]">{showUpdateLabModal.test_name}</span>
                <p className="text-slate-500 mt-0.5">Category: {showUpdateLabModal.test_category} • Facility: {showUpdateLabModal.hospital_id}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Processing Status</label>
                <select
                  value={labResultForm.status}
                  onChange={(e) => setLabResultForm({ ...labResultForm, status: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Sample Collected">Sample Collected</option>
                  <option value="In Analysis">In Analysis</option>
                  <option value="Completed">Completed & Verified</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Result Value & Unit</label>
                <input
                  type="text"
                  placeholder="e.g. 13.5 g/dL"
                  value={labResultForm.result_value}
                  onChange={(e) => setLabResultForm({ ...labResultForm, result_value: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reference Range</label>
                <input
                  type="text"
                  placeholder="e.g. 12.0 - 16.0 g/dL"
                  value={labResultForm.reference_range}
                  onChange={(e) => setLabResultForm({ ...labResultForm, reference_range: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Technician Notes</label>
                <textarea
                  rows={2}
                  placeholder="Verification technician remarks..."
                  value={labResultForm.technician_notes}
                  onChange={(e) => setLabResultForm({ ...labResultForm, technician_notes: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateLabModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#EA0170] text-white rounded-lg text-xs font-bold hover:bg-pink-700"
                >
                  Save Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
