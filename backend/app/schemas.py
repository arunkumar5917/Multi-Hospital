from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ----------------- Authentication Schemas -----------------
class TokenPayload(BaseModel):
    sub: str
    role: str
    hospital_id: str | None = None
    grn: str | None = None
    exp: int

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    hospital_id: str | None = None
    is_active: bool

class HospitalCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=160)
    location: str = Field(min_length=2, max_length=160)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    logo_url: str | None = None
    is_active: bool = True

class HospitalUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None

class HospitalOut(HospitalCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class LoginRequest(BaseModel):
    portal: str = Field(description="super_admin | hospital_admin | general | staff | patient")
    hospital_code: str | None = Field(default=None, description="Required for non-superadmin users")
    identifier: str | None = Field(default=None, description="Email or Global Registration Number")
    email: str | None = Field(default=None, description="Legacy email field")
    password: str = Field(min_length=1)
    remember_me: bool = False

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
    dashboard_path: str
    hospital_code: str | None = None
    hospital_name: str | None = None
    grn: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None

class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event: str
    user_id: int | None = None
    hospital_code: str | None = None
    ip_address: str | None = None
    details: str | None = None
    created_at: datetime

# ----------------- Patient Registration & Identity Schemas -----------------
class PatientRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    blood_group: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    hospital_code: str | None = None

class PatientSearchResult(BaseModel):
    grn: str
    full_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    blood_group: str | None = None
    emergency_contact: str | None = None
    primary_hospital_code: str | None = None
    primary_hospital_name: str | None = None
    linked_hospitals: list[str] = []
    is_linked_to_current_hospital: bool = True
    consent_status: str = "granted"
    photo_url: str | None = None

class PatientHospitalLinkRequest(BaseModel):
    hospital_code: str
    local_patient_id: str | None = None
    consent_status: str = "granted"
    notes: str | None = None

class PatientProfileOut(BaseModel):
    grn: str
    full_name: str
    date_of_birth: date | None = None
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    blood_group: str | None = None
    emergency_contact: str | None = None
    photo_url: str | None = None
    marital_status: str | None = None
    occupation: str | None = None
    insurance_provider: str | None = None
    insurance_policy_number: str | None = None
    insurance_valid_till: date | None = None
    national_id: str | None = None
    primary_hospital_code: str | None = None
    primary_hospital_name: str | None = None
    registered_hospitals: list[str] = []
    registration_date: datetime | None = None

class PatientProfileUpdate(BaseModel):
    full_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    blood_group: str | None = None
    marital_status: str | None = None
    occupation: str | None = None
    national_id: str | None = None
    insurance_provider: str | None = None
    insurance_policy_number: str | None = None
    insurance_valid_till: date | None = None

# ----------------- Medical History, Conditions & Allergies -----------------
class MedicalHistoryCreate(BaseModel):
    record_type: str = "diagnosis"  # diagnosis, surgery, past_illness, chronic_condition, allergy, admission, observation, family_history
    title: str = Field(min_length=2, max_length=200)
    description: str = ""
    diagnosed_date: date = date.today()
    severity: str = "moderate"      # mild, moderate, severe, critical
    status: str = "active"          # active, resolved, chronic
    treatment_id: int | None = None

class MedicalHistoryOut(MedicalHistoryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    global_patient_id: int
    hospital_id: str
    doctor_id: int | None = None
    created_at: datetime

class MedicalConditionCreate(BaseModel):
    condition_name: str = Field(min_length=2, max_length=160)
    icd_code: str | None = None
    status: str = "active"  # active, managed, resolved, chronic
    diagnosed_date: date = date.today()
    notes: str | None = None

class MedicalConditionOut(MedicalConditionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    global_patient_id: int
    created_at: datetime

class PatientAllergyCreate(BaseModel):
    allergen: str = Field(min_length=2, max_length=120)
    reaction: str = ""
    severity: str = "moderate"  # mild, moderate, severe, critical
    identified_date: date = date.today()
    notes: str | None = None

class PatientAllergyOut(PatientAllergyCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    global_patient_id: int
    created_at: datetime

class MedicalTimelineEvent(BaseModel):
    id: str
    event_type: str  # treatment, diagnosis, surgery, allergy, observation, prescription, report
    title: str
    description: str
    date: str
    hospital_id: str
    hospital_name: str | None = None
    doctor_name: str | None = None
    doctor_specialization: str | None = None
    severity: str | None = None
    status: str | None = None
    details_url: str | None = None

# ----------------- Prescriptions, Documents & Notes -----------------
class PrescriptionItem(BaseModel):
    medication: str = Field(min_length=1, max_length=160)
    dosage: str = Field(min_length=1, max_length=160)
    instructions: str = ""

class PrescriptionOut(PrescriptionItem):
    model_config = ConfigDict(from_attributes=True)
    id: int
    treatment_id: int | None = None
    doctor_id: int
    hospital_id: str
    prescribed_date: date
    status: str

class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    attachment_code: str
    treatment_id: int
    patient_grn: str
    hospital_id: str
    original_filename: str
    file_type: str
    file_category: str
    file_size: int
    description: str
    upload_date: datetime
    download_url: str

class MedicalDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    document_code: str
    treatment_id: int | None = None
    patient_grn: str
    hospital_id: str
    document_name: str
    original_filename: str
    file_type: str
    file_category: str
    file_size: int
    description: str
    upload_date: datetime
    download_url: str

class TreatmentNoteCreate(BaseModel):
    note_type: str = "observation"  # observation, consultation, follow_up, correction
    note_text: str = Field(min_length=1)

class TreatmentNoteOut(TreatmentNoteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    treatment_id: int
    doctor_id: int | None = None
    created_at: datetime

class TreatmentHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    treatment_id: int
    action: str
    status_before: str | None = None
    status_after: str
    change_summary: str | None = None
    timestamp: datetime
    changed_by_name: str | None = None

# ----------------- Patient Vitals & Health Analysis -----------------
class PatientVitalCreate(BaseModel):
    blood_pressure_systolic: int = Field(ge=50, le=280)
    blood_pressure_diastolic: int = Field(ge=30, le=200)
    pulse: int = Field(ge=30, le=250)
    temperature: float = Field(ge=90.0, le=110.0)
    oxygen_saturation: int = Field(ge=50, le=100)
    respiratory_rate: int | None = Field(default=None, ge=5, le=60)
    weight_kg: float | None = None
    height_cm: float | None = None
    notes: str | None = None

class PatientVitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_grn: str
    hospital_id: str
    blood_pressure_systolic: int
    blood_pressure_diastolic: int
    pulse: int
    temperature: float
    oxygen_saturation: int
    respiratory_rate: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    bmi: float | None = None
    is_abnormal: bool
    abnormal_notes: str | None = None
    recorded_at: datetime
    recorded_by_name: str | None = None

class FamilyContactCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    relationship: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=5, max_length=40)
    email: str | None = None
    address: str | None = None
    is_emergency_contact: bool = True
    is_primary: bool = False

class FamilyContactOut(FamilyContactCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    patient_grn: str
    created_at: datetime

class LabReportCreate(BaseModel):
    patient_id: int | None = None
    treatment_id: int | None = None
    test_name: str = Field(min_length=2, max_length=160)
    test_category: str = "General Pathology"
    result: str
    value: float | None = None
    unit: str | None = None
    reference_range: str | None = None
    report_date: date = date.today()
    status: str = "Completed"
    is_abnormal: bool = False
    abnormal_flag: str | None = None

class LabReportOut(LabReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class HealthAnalysisOut(BaseModel):
    grn: str
    current_vitals: PatientVitalOut | None = None
    historical_vitals: list[PatientVitalOut] = []
    lab_reports: list[LabReportOut] = []
    abnormal_findings: list[str] = []
    allergies: list[PatientAllergyOut] = []
    conditions: list[MedicalConditionOut] = []
    active_medications: list[PrescriptionOut] = []
    surgeries: list[MedicalHistoryOut] = []

# ----------------- Treatments -----------------
class TreatmentCreate(BaseModel):
    patient_grn: str
    visit_date: datetime | None = None
    chief_complaint: str = Field(min_length=2, max_length=500)
    symptoms: str = ""
    clinical_observations: str = ""
    diagnosis: str = Field(min_length=2, max_length=255)
    description: str = ""
    procedures_performed: str = ""
    follow_up_instructions: str = ""
    next_appointment_date: datetime | None = None
    status: str = "Active"  # Active, In Progress, Completed, Follow-up Required, Referred, Cancelled
    prescriptions: list[PrescriptionItem] = []

class TreatmentUpdate(BaseModel):
    chief_complaint: str | None = None
    symptoms: str | None = None
    clinical_observations: str | None = None
    diagnosis: str | None = None
    description: str | None = None
    procedures_performed: str | None = None
    follow_up_instructions: str | None = None
    next_appointment_date: datetime | None = None
    status: str | None = None
    correction_reason: str | None = None

class TreatmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    treatment_code: str
    global_patient_id: int
    patient_grn: str
    patient_name: str
    doctor_id: int
    doctor_name: str
    doctor_specialization: str
    hospital_id: str
    hospital_name: str
    visit_date: datetime
    chief_complaint: str
    symptoms: str
    clinical_observations: str
    diagnosis: str
    description: str
    procedures_performed: str
    follow_up_instructions: str
    next_appointment_date: datetime | None = None
    status: str
    created_at: datetime
    prescriptions: list[PrescriptionOut] = []
    attachments: list[AttachmentOut] = []
    documents: list[MedicalDocumentOut] = []
    notes: list[TreatmentNoteOut] = []
    history_logs: list[TreatmentHistoryOut] = []
    lab_reports: list[LabReportOut] = []

# ----------------- Consents & Access Logs -----------------
class PatientConsentCreate(BaseModel):
    requesting_hospital_id: str
    consent_type: str = "cross_hospital_access"  # cross_hospital_access, clinical_records, full_history
    status: str = "granted"                      # granted, revoked, pending
    notes: str | None = None

class PatientConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    global_patient_id: int
    requesting_hospital_id: str
    requesting_hospital_name: str | None = None
    consent_type: str
    status: str
    granted_at: datetime
    expires_at: datetime | None = None
    notes: str | None = None

class MedicalAccessLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None = None
    user_name: str | None = None
    hospital_id: str | None = None
    resource_type: str
    resource_id: str | None = None
    action: str
    ip_address: str | None = None
    accessed_at: datetime

# ----------------- Legacy Compatibility Schemas -----------------
class PatientCreate(BaseModel):
    patient_code: str = Field(min_length=2, max_length=40)
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    blood_group: str | None = None
    emergency_contact: str | None = None

class PatientOut(PatientCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class DoctorCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    specialization: str
    phone: str | None = None
    email: str | None = None

class DoctorOut(DoctorCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str
    is_active: bool

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    reason: str = ""
    status: str = "scheduled"

class AppointmentOut(AppointmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class InvoiceCreate(BaseModel):
    patient_id: int
    description: str
    amount: float
    status: str = "unpaid"
    invoice_date: date = date.today()

class InvoiceOut(InvoiceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str
