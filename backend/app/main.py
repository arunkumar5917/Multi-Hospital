import os
from datetime import date, datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
import jwt
from jwt import InvalidTokenError

from .database import Base, engine, get_db, SessionLocal
from .models import User, Patient, Doctor, Appointment, Treatment, LabReport, Prescription, Invoice
from .schemas import (
    LoginRequest, LoginResponse, UserOut, PatientCreate, PatientOut,
    DoctorCreate, DoctorOut, AppointmentCreate, AppointmentOut,
    TreatmentCreate, TreatmentOut, LabReportCreate, LabReportOut,
    PrescriptionCreate, PrescriptionOut, InvoiceCreate, InvoiceOut
)
from .security import hash_password, verify_password, create_access_token, JWT_SECRET, JWT_ALGORITHM

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="X7 MediCore HMS API", version="1.0.0", description="Educational Hospital Management System MVP")
origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware, allow_origins=[origin], allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"]
)
bearer = HTTPBearer(auto_error=False)

DASHBOARDS = {
    "super_admin": "/super-admin/dashboard", "hospital_admin": "/hospital-admin/dashboard",
    "doctor": "/doctor/dashboard", "patient": "/patient/dashboard", "nurse": "/staff/dashboard",
    "lab_technician": "/lab/dashboard", "pharmacist": "/pharmacy/dashboard", "billing_staff": "/billing/dashboard",
    "family_member": "/family/dashboard"
}
PORTAL_ROLES = {
    "super_admin": {"super_admin"},
    "hospital_admin": {"hospital_admin"},
    "general": set(DASHBOARDS) - {"super_admin", "hospital_admin"}
}
HOSPITAL_ID = "HOSPITAL-DEMO-001"

def seed_demo_data():
    with SessionLocal() as db:
        demos = [
            ("superadmin@x7medicore.local", "Super Admin", "super_admin", None),
            ("hospitaladmin@x7medicore.local", "Hospital Admin", "hospital_admin", HOSPITAL_ID),
            ("doctor@x7medicore.local", "Dr. Kumar", "doctor", HOSPITAL_ID),
            ("patient@x7medicore.local", "Arun Kumar", "patient", HOSPITAL_ID),
            ("nurse@x7medicore.local", "Demo Nurse", "nurse", HOSPITAL_ID),
            ("lab@x7medicore.local", "Lab Technician", "lab_technician", HOSPITAL_ID),
            ("pharmacy@x7medicore.local", "Pharmacist", "pharmacist", HOSPITAL_ID),
            ("billing@x7medicore.local", "Billing Staff", "billing_staff", HOSPITAL_ID),
        ]
        for email, name, role, hospital_id in demos:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(email=email, full_name=name, role=role, hospital_id=hospital_id,
                            password_hash=hash_password("ChangeMe123!"), is_active=True))
        db.commit()
        if db.query(Patient).count() == 0:
            p = Patient(patient_code="PT20260001", full_name="Arun Kumar", date_of_birth=date(1996, 8, 15),
                        gender="Male", phone="+91 98765 43210", email="arun@example.test",
                        address="Demo address, Tamil Nadu", blood_group="O+", emergency_contact="Family contact",
                        hospital_id=HOSPITAL_ID)
            p2 = Patient(patient_code="PT20260002", full_name="Meena Rani", gender="Female",
                         phone="+91 90000 00002", email="meena@example.test", hospital_id=HOSPITAL_ID)
            db.add_all([p, p2]); db.commit()
        if db.query(Doctor).count() == 0:
            db.add_all([
                Doctor(full_name="Dr. Kumar", specialization="General Medicine", phone="+91 90000 10001",
                       email="doctor@example.test", hospital_id=HOSPITAL_ID),
                Doctor(full_name="Dr. Priya", specialization="Cardiology", phone="+91 90000 10002",
                       email="priya@example.test", hospital_id=HOSPITAL_ID)
            ]); db.commit()
        if db.query(Appointment).count() == 0:
            patient = db.query(Patient).first(); doctor = db.query(Doctor).first()
            db.add(Appointment(patient_id=patient.id, doctor_id=doctor.id,
                               scheduled_at=datetime.now() + timedelta(days=1),
                               reason="Follow-up consultation", status="scheduled", hospital_id=HOSPITAL_ID))
            db.commit()

seed_demo_data()

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        claims = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(claims["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account unavailable.")
    return user

def require_roles(*roles):
    def checker(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
        return user
    return checker

def scoped_query(query, model, user: User):
    if user.role != "super_admin":
        if not user.hospital_id:
            raise HTTPException(status_code=403, detail="No hospital is assigned to this account.")
        query = query.filter(model.hospital_id == user.hospital_id)
    return query

def get_related_patient(db: Session, patient_id: int, user: User):
    q = db.query(Patient).filter(Patient.id == patient_id)
    if user.role != "super_admin":
        q = q.filter(Patient.hospital_id == user.hospital_id)
    patient = q.first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in your authorized scope.")
    return patient

def get_related_doctor(db: Session, doctor_id: int, user: User):
    q = db.query(Doctor).filter(Doctor.id == doctor_id)
    if user.role != "super_admin":
        q = q.filter(Doctor.hospital_id == user.hospital_id)
    doctor = q.first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found in your authorized scope.")
    return doctor

@app.get("/")
def root():
    return {"name": "X7 MediCore HMS API", "status": "running", "docs": "/docs"}

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}

@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    portal = payload.portal.strip().lower()
    if portal not in PORTAL_ROLES:
        raise HTTPException(status_code=400, detail="Invalid login portal.")
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user.role not in PORTAL_ROLES[portal]:
        raise HTTPException(status_code=403, detail="This account cannot use this portal. Please use the correct login URL.")
    return LoginResponse(access_token=create_access_token(user.id, user.role), user=user, dashboard_path=DASHBOARDS[user.role])

@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user

@app.get("/api/v1/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "super_admin":
        return {
            "hospitals": 1,
            "patients": db.query(Patient).count(),
            "doctors": db.query(Doctor).count(),
            "staff": db.query(User).filter(User.role.notin_(["super_admin", "patient", "family_member"])).count(),
            "appointments": db.query(Appointment).count(),
            "active_treatments": db.query(Treatment).filter(Treatment.status == "active").count(),
            "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0),
        }
    hospital = user.hospital_id
    if not hospital:
        raise HTTPException(status_code=403, detail="No hospital is assigned.")
    return {
        "hospitals": 1,
        "patients": db.query(Patient).filter(Patient.hospital_id == hospital).count(),
        "doctors": db.query(Doctor).filter(Doctor.hospital_id == hospital).count(),
        "staff": db.query(User).filter(User.hospital_id == hospital, User.role.notin_(["patient", "family_member"])).count(),
        "appointments": db.query(Appointment).filter(Appointment.hospital_id == hospital).count(),
        "active_treatments": db.query(Treatment).filter(Treatment.hospital_id == hospital, Treatment.status == "active").count(),
        "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(Invoice.hospital_id == hospital).scalar() or 0),
    }

@app.get("/api/v1/patients", response_model=list[PatientOut])
def list_patients(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = scoped_query(db.query(Patient), Patient, user)
    if user.role == "patient":
        query = query.filter(Patient.email == user.email)
    if q:
        query = query.filter(Patient.full_name.ilike(f"%{q}%") | Patient.patient_code.ilike(f"%{q}%"))
    return query.order_by(Patient.id.desc()).limit(200).all()

@app.post("/api/v1/patients", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse"))):
    hospital_id = payload_hospital(user)
    if db.query(Patient).filter(Patient.patient_code == payload.patient_code).first():
        raise HTTPException(status_code=409, detail="Patient code already exists.")
    patient = Patient(**payload.model_dump(), hospital_id=hospital_id)
    db.add(patient); db.commit(); db.refresh(patient)
    return patient

def payload_hospital(user: User):
    if user.role != "super_admin" and not user.hospital_id:
        raise HTTPException(status_code=403, detail="No hospital is assigned.")
    return user.hospital_id or HOSPITAL_ID

@app.get("/api/v1/doctors", response_model=list[DoctorOut])
def list_doctors(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return scoped_query(db.query(Doctor), Doctor, user).order_by(Doctor.full_name).limit(200).all()

@app.post("/api/v1/doctors", response_model=DoctorOut, status_code=201)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin"))):
    doctor = Doctor(**payload.model_dump(), hospital_id=payload_hospital(user), is_active=True)
    db.add(doctor); db.commit(); db.refresh(doctor)
    return doctor

@app.get("/api/v1/appointments", response_model=list[AppointmentOut])
def list_appointments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = scoped_query(db.query(Appointment), Appointment, user)
    if user.role == "patient":
        patient = db.query(Patient).filter(Patient.email == user.email).first()
        query = query.filter(Appointment.patient_id == patient.id) if patient else query.filter(Appointment.id == -1)
    if user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.email == user.email).first()
        if doctor: query = query.filter(Appointment.doctor_id == doctor.id)
    return query.order_by(Appointment.scheduled_at.desc()).limit(200).all()

@app.post("/api/v1/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse"))):
    patient = get_related_patient(db, payload.patient_id, user)
    doctor = get_related_doctor(db, payload.doctor_id, user)
    if patient.hospital_id != doctor.hospital_id:
        raise HTTPException(status_code=400, detail="Patient and doctor must belong to the same hospital.")
    if payload.status not in {"scheduled", "completed", "cancelled", "in_progress"}:
        raise HTTPException(status_code=400, detail="Invalid appointment status.")
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == payload.doctor_id,
        Appointment.scheduled_at == payload.scheduled_at,
        Appointment.status.in_(["scheduled", "in_progress"])
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Doctor already has an appointment at that time.")
    appointment = Appointment(**payload.model_dump(), hospital_id=patient.hospital_id)
    db.add(appointment); db.commit(); db.refresh(appointment)
    return appointment

@app.patch("/api/v1/appointments/{appointment_id}")
def update_appointment(appointment_id: int, status_value: str, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse"))):
    query = db.query(Appointment).filter(Appointment.id == appointment_id)
    if user.role != "super_admin": query = query.filter(Appointment.hospital_id == user.hospital_id)
    appt = query.first()
    if not appt: raise HTTPException(status_code=404, detail="Appointment not found.")
    if status_value not in {"scheduled", "completed", "cancelled", "in_progress"}:
        raise HTTPException(status_code=400, detail="Invalid status.")
    appt.status = status_value; db.commit()
    return {"message": "Appointment updated", "id": appt.id, "status": appt.status}

@app.get("/api/v1/treatments", response_model=list[TreatmentOut])
def list_treatments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = scoped_query(db.query(Treatment), Treatment, user)
    return query.order_by(Treatment.id.desc()).limit(200).all()

@app.post("/api/v1/treatments", response_model=TreatmentOut, status_code=201)
def create_treatment(payload: TreatmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor"))):
    patient = get_related_patient(db, payload.patient_id, user)
    doctor = get_related_doctor(db, payload.doctor_id, user)
    if patient.hospital_id != doctor.hospital_id:
        raise HTTPException(status_code=400, detail="Patient and doctor must belong to the same hospital.")
    if db.query(Treatment).filter(Treatment.treatment_code == payload.treatment_code).first():
        raise HTTPException(status_code=409, detail="Treatment code already exists.")
    treatment = Treatment(**payload.model_dump(), hospital_id=patient.hospital_id)
    db.add(treatment); db.commit(); db.refresh(treatment)
    return treatment

@app.get("/api/v1/lab-reports", response_model=list[LabReportOut])
def list_lab_reports(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return scoped_query(db.query(LabReport), LabReport, user).order_by(LabReport.id.desc()).limit(200).all()

@app.post("/api/v1/lab-reports", response_model=LabReportOut, status_code=201)
def create_lab_report(payload: LabReportCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "lab_technician"))):
    patient = get_related_patient(db, payload.patient_id, user)
    report = LabReport(**payload.model_dump(), hospital_id=patient.hospital_id)
    db.add(report); db.commit(); db.refresh(report)
    return report

@app.get("/api/v1/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return scoped_query(db.query(Prescription), Prescription, user).order_by(Prescription.id.desc()).limit(200).all()

@app.post("/api/v1/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor"))):
    patient = get_related_patient(db, payload.patient_id, user)
    doctor = get_related_doctor(db, payload.doctor_id, user)
    if patient.hospital_id != doctor.hospital_id:
        raise HTTPException(status_code=400, detail="Patient and doctor must belong to the same hospital.")
    prescription = Prescription(**payload.model_dump(), hospital_id=patient.hospital_id)
    db.add(prescription); db.commit(); db.refresh(prescription)
    return prescription

@app.get("/api/v1/invoices", response_model=list[InvoiceOut])
def list_invoices(db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = scoped_query(db.query(Invoice), Invoice, user)
    return query.order_by(Invoice.id.desc()).limit(200).all()

@app.post("/api/v1/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "billing_staff"))):
    patient = get_related_patient(db, payload.patient_id, user)
    invoice = Invoice(**payload.model_dump(), hospital_id=patient.hospital_id)
    db.add(invoice); db.commit(); db.refresh(invoice)
    return invoice
