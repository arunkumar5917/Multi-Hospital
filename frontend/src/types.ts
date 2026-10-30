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
