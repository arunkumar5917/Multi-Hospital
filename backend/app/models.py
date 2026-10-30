from datetime import datetime, date
from sqlalchemy import String, Integer, Boolean, DateTime, Date, Text, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

# ----------------- Facility & Authentication Models -----------------
class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    location: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memberships: Mapped[list["UserHospitalMembership"]] = relationship("UserHospitalMembership", back_populates="hospital")
    patient_links: Mapped[list["PatientHospitalLink"]] = relationship("PatientHospitalLink", back_populates="hospital")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False)
    hospital_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memberships: Mapped[list["UserHospitalMembership"]] = relationship("UserHospitalMembership", back_populates="user")
    patient_account: Mapped["PatientAccount | None"] = relationship("PatientAccount", back_populates="user", uselist=False)

class UserHospitalMembership(Base):
    __tablename__ = "user_hospital_memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="memberships")
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="memberships")

# ----------------- Global Patient Identity Models -----------------
class GlobalPatient(Base):
    __tablename__ = "global_patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grn: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped["PatientProfile | None"] = relationship("PatientProfile", back_populates="global_patient", uselist=False, cascade="all, delete-orphan")
    accounts: Mapped[list["PatientAccount"]] = relationship("PatientAccount", back_populates="global_patient")
    hospital_links: Mapped[list["PatientHospitalLink"]] = relationship("PatientHospitalLink", back_populates="global_patient")
    medical_history_items: Mapped[list["MedicalHistory"]] = relationship("MedicalHistory", back_populates="global_patient")
    conditions: Mapped[list["MedicalCondition"]] = relationship("MedicalCondition", back_populates="global_patient")
    allergies: Mapped[list["PatientAllergy"]] = relationship("PatientAllergy", back_populates="global_patient")
    treatments: Mapped[list["Treatment"]] = relationship("Treatment", back_populates="global_patient")
    attachments: Mapped[list["TreatmentAttachment"]] = relationship("TreatmentAttachment", back_populates="global_patient")
    medical_documents: Mapped[list["MedicalDocument"]] = relationship("MedicalDocument", back_populates="global_patient", cascade="all, delete-orphan")
    vitals: Mapped[list["PatientVital"]] = relationship("PatientVital", back_populates="global_patient", cascade="all, delete-orphan", order_by="desc(PatientVital.recorded_at)")
    family_contacts: Mapped[list["FamilyContact"]] = relationship("FamilyContact", back_populates="global_patient", cascade="all, delete-orphan")
    consents: Mapped[list["PatientConsent"]] = relationship("PatientConsent", back_populates="global_patient")

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    insurance_provider: Mapped[str | None] = mapped_column(String(160), nullable=True)
    insurance_policy_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    insurance_valid_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="profile")

class PatientAccount(Base):
    __tablename__ = "patient_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    primary_hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="patient_account")
    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="accounts")

class PatientHospitalLink(Base):
    __tablename__ = "patient_hospital_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), index=True, nullable=False)
    local_patient_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    consent_status: Mapped[str] = mapped_column(String(30), default="granted", nullable=False)
    linked_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="hospital_links")
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="patient_links")

# ----------------- Medical History, Conditions & Allergies -----------------
class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    doctor_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    treatment_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    record_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # diagnosis, surgery, chronic_condition, allergy, admission, observation, family_history
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    diagnosed_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    severity: Mapped[str] = mapped_column(String(30), default="moderate", nullable=False)  # mild, moderate, severe, critical
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)     # active, resolved, chronic
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="medical_history_items")

class MedicalCondition(Base):
    __tablename__ = "medical_conditions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    condition_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    icd_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)  # active, managed, resolved, chronic
    diagnosed_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="conditions")

class PatientAllergy(Base):
    __tablename__ = "patient_allergies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    allergen: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    reaction: Mapped[str] = mapped_column(Text, default="", nullable=False)
    severity: Mapped[str] = mapped_column(String(30), default="moderate", nullable=False)  # mild, moderate, severe, critical
    identified_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="allergies")

# ----------------- Treatments & Encounters -----------------
class Treatment(Base):
    __tablename__ = "treatments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    treatment_code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    visit_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    symptoms: Mapped[str] = mapped_column(Text, default="", nullable=False)
    clinical_observations: Mapped[str] = mapped_column(Text, default="", nullable=False)
    diagnosis: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    procedures_performed: Mapped[str] = mapped_column(Text, default="", nullable=False)
    follow_up_instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    next_appointment_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="Active", index=True, nullable=False)  # Active, In Progress, Completed, Follow-up Required, Referred, Cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="treatments")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="treatments")
    notes: Mapped[list["TreatmentNote"]] = relationship("TreatmentNote", back_populates="treatment", cascade="all, delete-orphan")
    attachments: Mapped[list["TreatmentAttachment"]] = relationship("TreatmentAttachment", back_populates="treatment")
    medical_documents: Mapped[list["MedicalDocument"]] = relationship("MedicalDocument", back_populates="treatment")
    prescriptions: Mapped[list["Prescription"]] = relationship("Prescription", back_populates="treatment")
    history_logs: Mapped[list["TreatmentHistory"]] = relationship("TreatmentHistory", back_populates="treatment", cascade="all, delete-orphan", order_by="desc(TreatmentHistory.timestamp)")
    lab_reports: Mapped[list["LabReport"]] = relationship("LabReport", back_populates="treatment")

class TreatmentNote(Base):
    __tablename__ = "treatment_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    treatment_id: Mapped[int] = mapped_column(ForeignKey("treatments.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note_type: Mapped[str] = mapped_column(String(40), default="observation", nullable=False)  # observation, consultation, follow_up, correction
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    treatment: Mapped["Treatment"] = relationship("Treatment", back_populates="notes")

class TreatmentHistory(Base):
    __tablename__ = "treatment_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    treatment_id: Mapped[int] = mapped_column(ForeignKey("treatments.id", ondelete="CASCADE"), index=True, nullable=False)
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)  # CREATED, STATUS_CHANGE, CLINICAL_UPDATE, COMPLETED, CANCELLED
    status_before: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status_after: Mapped[str] = mapped_column(String(40), nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    treatment: Mapped["Treatment"] = relationship("Treatment", back_populates="history_logs")
    changed_by: Mapped["User | None"] = relationship("User")

# ----------------- Medical Documents & Attachments -----------------
class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    treatment_id: Mapped[int | None] = mapped_column(ForeignKey("treatments.id", ondelete="SET NULL"), index=True, nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    patient_grn: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_category: Mapped[str] = mapped_column(String(80), index=True, nullable=False)  # X-ray, MRI, CT Scan, Ultrasound, Blood Test Report, Prescription, Bill / Invoice, Discharge Summary, Medical Report, Other
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="medical_documents")
    treatment: Mapped["Treatment | None"] = relationship("Treatment", back_populates="medical_documents")

class TreatmentAttachment(Base):
    __tablename__ = "treatment_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attachment_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    treatment_id: Mapped[int] = mapped_column(ForeignKey("treatments.id", ondelete="CASCADE"), index=True, nullable=False)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(80), nullable=False)
    file_category: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    treatment: Mapped["Treatment"] = relationship("Treatment", back_populates="attachments")
    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="attachments")

# ----------------- Patient Vitals & Health Analysis -----------------
class PatientVital(Base):
    __tablename__ = "patient_vitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_grn: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    blood_pressure_systolic: Mapped[int] = mapped_column(Integer, nullable=False)   # mmHg, e.g. 120
    blood_pressure_diastolic: Mapped[int] = mapped_column(Integer, nullable=False)  # mmHg, e.g. 80
    pulse: Mapped[int] = mapped_column(Integer, nullable=False)                    # bpm, e.g. 72
    temperature: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)      # °F, e.g. 98.6
    oxygen_saturation: Mapped[int] = mapped_column(Integer, nullable=False)        # SpO2 %, e.g. 98
    respiratory_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)   # breaths/min
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    bmi: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    abnormal_notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recorded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="vitals")
    recorded_by: Mapped["User | None"] = relationship("User")

# ----------------- Family & Emergency Contacts -----------------
class FamilyContact(Base):
    __tablename__ = "family_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_grn: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(60), nullable=False)  # Spouse, Father, Mother, Sibling, Child, Guardian, Friend
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_emergency_contact: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="family_contacts")

# ----------------- Prescriptions & Reports -----------------
class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    treatment_id: Mapped[int | None] = mapped_column(ForeignKey("treatments.id", ondelete="SET NULL"), index=True, nullable=True)
    global_patient_id: Mapped[int | None] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=True)
    patient_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    medication: Mapped[str] = mapped_column(String(160), nullable=False)
    dosage: Mapped[str] = mapped_column(String(160), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    prescribed_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)

    treatment: Mapped["Treatment | None"] = relationship("Treatment", back_populates="prescriptions")

class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    treatment_id: Mapped[int | None] = mapped_column(ForeignKey("treatments.id", ondelete="SET NULL"), index=True, nullable=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    report_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    findings: Mapped[str] = mapped_column(Text, nullable=False)
    conclusion: Mapped[str] = mapped_column(Text, default="", nullable=False)
    report_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    doctor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class LabReport(Base):
    __tablename__ = "lab_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int | None] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=True)
    treatment_id: Mapped[int | None] = mapped_column(ForeignKey("treatments.id", ondelete="SET NULL"), index=True, nullable=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), index=True, nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    test_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    test_category: Mapped[str] = mapped_column(String(80), default="General Pathology", nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    reference_range: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Completed", nullable=False)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    abnormal_flag: Mapped[str | None] = mapped_column(String(20), nullable=True)  # HIGH, LOW, ABNORMAL, NORMAL
    report_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    doctor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    treatment: Mapped["Treatment | None"] = relationship("Treatment", back_populates="lab_reports")

# ----------------- Patient Consents & HIPAA Audit Logs -----------------
class PatientConsent(Base):
    __tablename__ = "patient_consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    requesting_hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    consent_type: Mapped[str] = mapped_column(String(60), default="cross_hospital_access", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="granted", nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    global_patient: Mapped["GlobalPatient"] = relationship("GlobalPatient", back_populates="consents")

class MedicalRecordAccessLog(Base):
    __tablename__ = "medical_record_access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(60), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)  # VIEW, DOWNLOAD, EXPORT, CONSENT_CHECK
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class MedicalRecordAuditLog(Base):
    __tablename__ = "medical_record_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    global_patient_id: Mapped[int] = mapped_column(ForeignKey("global_patients.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(40), nullable=False)  # CREATE, UPDATE, DELETE, APPEND
    target_table: Mapped[str] = mapped_column(String(80), nullable=False)
    target_id: Mapped[str] = mapped_column(String(60), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

# ----------------- Legacy Compatibility Models -----------------
class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    specialization: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    treatments: Mapped[list["Treatment"]] = relationship("Treatment", back_populates="doctor")

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="scheduled", nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="unpaid", nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(80), index=True, nullable=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    identifier: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class AuthenticationAuditLog(Base):
    __tablename__ = "authentication_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    hospital_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    event: Mapped[str] = mapped_column(String(60), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
