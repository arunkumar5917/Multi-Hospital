export interface Hospital {
  id: number;
  code: string;
  name: string;
  location: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  hospital_id?: string | null;
  grn?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
  dashboard_path: string;
  hospital_code?: string | null;
  hospital_name?: string | null;
  grn?: string | null;
}

export interface PatientProfile {
  grn: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  hospital_patient_id?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  photo_url?: string | null;
  profile_photo_url?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  insurance_provider?: string | null;
  insurance_policy_number?: string | null;
  insurance_valid_till?: string | null;
  national_id?: string | null;
  primary_hospital_code?: string | null;
  primary_hospital_name?: string | null;
  registered_hospitals?: string[];
  registration_date?: string | null;
  allergies?: PatientAllergy[];
  medical_conditions?: MedicalCondition[];
}

export interface AuditLog {
  id: number;
  event: string;
  user_id?: number | null;
  hospital_code?: string | null;
  ip_address?: string | null;
  details?: string | null;
  created_at: string;
}

export interface Summary {
  hospitals?: number;
  active_hospitals?: number;
  patients?: number;
  doctors?: number;
  staff?: number;
  appointments?: number;
  active_treatments?: number;
  invoices_total?: number;
  prescriptions?: number;
  lab_reports?: number;
}

export interface MedicalCondition {
  id: number;
  condition_name: string;
  icd_code?: string | null;
  status: string;
  diagnosed_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface PatientAllergy {
  id: number;
  allergen: string;
  reaction: string;
  severity: string;
  identified_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface MedicalHistoryItem {
  id: number;
  record_type: string;
  title: string;
  description: string;
  diagnosed_date: string;
  severity: string;
  status: string;
  treatment_id?: number | null;
  hospital_id: string;
  doctor_id?: number | null;
  created_at: string;
}

export interface MedicalTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  date: string;
  hospital_id: string;
  hospital_name?: string | null;
  doctor_name?: string | null;
  doctor_specialization?: string | null;
  severity?: string | null;
  status?: string | null;
  details_url?: string | null;
}

export interface PrescriptionItem {
  id?: number;
  medication: string;
  dosage: string;
  instructions: string;
  treatment_id?: number | null;
  doctor_id?: number;
  hospital_id?: string;
  prescribed_date?: string;
  status?: string;
}

export interface Attachment {
  id: number;
  attachment_code: string;
  treatment_id: number;
  patient_grn: string;
  hospital_id: string;
  original_filename: string;
  document_name?: string;
  file_type: string;
  file_category: string;
  file_size: number;
  description: string;
  upload_date: string;
  download_url: string;
}

export interface TreatmentNote {
  id: number;
  treatment_id: number;
  doctor_id?: number | null;
  note_type: string;
  note_text: string;
  created_at: string;
}

export interface Treatment {
  id: number;
  treatment_code: string;
  global_patient_id?: number;
  patient_grn: string;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_specialization: string;
  hospital_id: string;
  hospital_name: string;
  department?: string | null;
  assigned_nurse?: string | null;
  treatment_progress?: string | null;
  visit_date: string;
  start_date?: string;
  end_date?: string | null;
  chief_complaint: string;
  symptoms: string;
  clinical_observations: string;
  diagnosis: string;
  description: string;
  procedures_performed: string;
  follow_up_instructions: string;
  next_appointment_date?: string | null;
  status: string;
  created_at: string;
  prescriptions: PrescriptionItem[];
  attachments: Attachment[];
  notes: TreatmentNote[];
}

export type PrescriptionOut = PrescriptionItem;

export interface PatientSearchResult {
  grn: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  primary_hospital_code?: string | null;
  primary_hospital_name?: string | null;
  linked_hospitals: string[];
  is_linked_to_current_hospital: boolean;
  consent_status: string;
  photo_url?: string | null;
}

export interface PatientConsent {
  id: number;
  global_patient_id: number;
  requesting_hospital_id: string;
  hospital_id?: string;
  requesting_hospital_name?: string | null;
  consent_type: string;
  status: string;
  granted_at: string;
  expires_at?: string | null;
  notes?: string | null;
}

export interface MedicalAccessLog {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  user_role?: string | null;
  hospital_id?: string | null;
  resource_type: string;
  resource_id?: string | null;
  action: string;
  ip_address?: string | null;
  accessed_at: string;
  timestamp?: string;
  is_break_glass?: boolean;
  break_glass_reason?: string | null;
}

export interface MedicalDocument {
  id: number;
  document_code: string;
  treatment_id?: number | null;
  patient_grn: string;
  hospital_id: string;
  document_name: string;
  original_filename: string;
  file_type: string;
  file_category: string;
  file_size: number;
  description: string;
  upload_date: string;
  download_url: string;
}

export interface PatientVital {
  id: number;
  patient_grn: string;
  hospital_id: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  pulse: number;
  temperature: number;
  oxygen_saturation: number;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
  is_abnormal: boolean;
  abnormal_notes?: string | null;
  recorded_at: string;
  recorded_by_name?: string | null;
}

export interface FamilyContact {
  id: number;
  patient_grn: string;
  full_name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  is_emergency_contact: boolean;
  is_primary: boolean;
  created_at: string;
}

export interface LabReport {
  id: number;
  patient_id?: number | null;
  treatment_id?: number | null;
  hospital_id: string;
  test_name: string;
  test_category: string;
  result: string;
  value?: number | null;
  unit?: string | null;
  reference_range?: string | null;
  report_date: string;
  status: string;
  is_abnormal: boolean;
  abnormal_flag?: string | null;
}

export interface HealthAnalysis {
  grn: string;
  current_vitals?: PatientVital | null;
  historical_vitals: PatientVital[];
  lab_reports: LabReport[];
  abnormal_findings: string[];
  allergies: PatientAllergy[];
  conditions: MedicalCondition[];
  active_medications: PrescriptionItem[];
  surgeries: MedicalHistoryItem[];
}

export interface TreatmentHistory {
  id: number;
  treatment_id: number;
  action: string;
  status_before?: string | null;
  status_after: string;
  change_summary?: string | null;
  timestamp: string;
  changed_by_name?: string | null;
}

export interface HospitalDepartment {
  id: number;
  hospital_id: string;
  name: string;
  code: string;
  floor?: string | null;
  head_doctor?: string | null;
  is_active: boolean;
}

export interface TreatmentProtocol {
  id: number;
  treatment_id: number;
  protocol_name: string;
  phase: string;
  cycle_number?: number | null;
  target_outcome?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorNote {
  id: number;
  treatment_id: number;
  doctor_id: number;
  doctor_name: string;
  note_type: string;
  content: string;
  created_at: string;
}

export interface NursingObservation {
  id: number;
  treatment_id: number;
  nurse_id: number;
  nurse_name: string;
  observation_type: string;
  vital_summary?: string | null;
  notes: string;
  recorded_at: string;
}

export interface LabTestOrder {
  id: number;
  treatment_id?: number | null;
  global_patient_id: number;
  patient_grn: string;
  ordering_doctor_id: number;
  hospital_id: string;
  test_name: string;
  test_category: string;
  urgency: string;
  clinical_indication?: string | null;
  status: string; // "Pending" | "Sample Collected" | "In Analysis" | "Completed" | "Cancelled"
  ordered_at: string;
  completed_at?: string | null;
  result_value?: string | null;
  reference_range?: string | null;
  technician_notes?: string | null;
}

export interface MedicationRecord {
  id: number;
  prescription_id: number;
  global_patient_id: number;
  pharmacist_id: number;
  hospital_id: string;
  dispensed_at: string;
  dispensed_quantity: number;
  dispensing_status: string;
  allergy_conflict_checked: boolean;
  allergy_warning?: string | null;
  notes?: string | null;
}

export interface PatientSurgery {
  id: number;
  global_patient_id: number;
  hospital_id: string;
  surgery_name: string;
  surgery_category?: string | null;
  surgeon_name?: string | null;
  surgery_date: string;
  outcome?: string | null;
  anesthesia_type?: string | null;
  complications?: string | null;
  notes?: string | null;
}

export interface EmergencyContact {
  id: number;
  global_patient_id: number;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  priority: string; // "Primary" | "Secondary" | "Tertiary"
  is_authorized_rep: boolean;
  notification_preference: string; // "SMS" | "Call" | "Email" | "All"
  created_at: string;
}

export interface HospitalVisitSummary {
  hospital_id: string;
  hospital_name: string;
  hospital_code: string;
  local_patient_id?: string | null;
  visit_count: number;
  first_visit?: string | null;
  latest_visit?: string | null;
  active_treatment_count: number;
  has_active_consent: boolean;
  departments: string[];
}

export interface BreakGlassResponse {
  status: string;
  message: string;
  access_log_id: number;
  grn: string;
  granted_at: string;
  expires_in_hours: number;
}
