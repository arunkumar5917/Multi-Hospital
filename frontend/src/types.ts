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
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
  primary_hospital_code?: string | null;
  primary_hospital_name?: string | null;
  registered_hospitals?: string[];
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
  visit_date: string;
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
}

export interface PatientConsent {
  id: number;
  global_patient_id: number;
  requesting_hospital_id: string;
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
  hospital_id?: string | null;
  resource_type: string;
  resource_id?: string | null;
  action: string;
  ip_address?: string | null;
  accessed_at: string;
}
