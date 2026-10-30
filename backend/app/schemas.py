from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

# Hospitals
class HospitalBase(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=160)
    location: str = Field(min_length=2, max_length=160)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    logo_url: str | None = None
    is_active: bool = True

class HospitalCreate(HospitalBase):
    pass

class HospitalUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None

class HospitalOut(HospitalBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

# Authentication & User
class LoginRequest(BaseModel):
    email: str | None = None
    identifier: str | None = None  # email or GRN
    password: str = Field(min_length=1, max_length=128)
    portal: str = "general"        # "super_admin" | "hospital_admin" | "general"
    hospital_code: str | None = None
    remember_me: bool = False

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    hospital_id: str | None = None
    grn: str | None = None

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: UserOut
    dashboard_path: str
    hospital_code: str | None = None
    hospital_name: str | None = None
    grn: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or GRN

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

class PatientProfileOut(BaseModel):
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

# Healthcare & Clinical Models
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

class TreatmentCreate(BaseModel):
    treatment_code: str = Field(min_length=2, max_length=30)
    patient_id: int
    doctor_id: int
    diagnosis: str
    description: str = ""
    start_date: date = date.today()
    status: str = "active"

class TreatmentOut(TreatmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class LabReportCreate(BaseModel):
    patient_id: int
    test_name: str
    result: str
    report_date: date = date.today()
    status: str = "review_pending"

class LabReportOut(LabReportCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class PrescriptionCreate(BaseModel):
    patient_id: int
    doctor_id: int
    medication: str
    dosage: str
    instructions: str = ""
    prescribed_date: date = date.today()
    status: str = "active"

class PrescriptionOut(PrescriptionCreate):
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
