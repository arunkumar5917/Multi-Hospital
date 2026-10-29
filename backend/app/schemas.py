from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    portal: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    hospital_id: str | None = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    dashboard_path: str

class PatientCreate(BaseModel):
    patient_code: str = Field(min_length=2, max_length=30)
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
    start_date: date
    status: str = "active"

class TreatmentOut(TreatmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class LabReportCreate(BaseModel):
    patient_id: int
    test_name: str
    result: str
    report_date: date
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
    prescribed_date: date
    status: str = "active"

class PrescriptionOut(PrescriptionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str

class InvoiceCreate(BaseModel):
    patient_id: int
    description: str
    amount: float = Field(gt=0)
    status: str = "unpaid"
    invoice_date: date

class InvoiceOut(InvoiceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hospital_id: str
