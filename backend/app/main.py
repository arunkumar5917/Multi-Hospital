import os
import shutil
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
import jwt
from jwt import InvalidTokenError

from .database import Base, engine, get_db, SessionLocal
from .models import (
    Hospital, User, UserHospitalMembership, GlobalPatient, PatientAccount,
    PatientHospitalLink, MedicalHistory, MedicalCondition, PatientAllergy,
    Treatment, TreatmentNote, TreatmentAttachment, Prescription, MedicalReport,
    PatientConsent, MedicalRecordAccessLog, MedicalRecordAuditLog,
    Patient, Doctor, Appointment, LabReport, Invoice,
    PasswordResetToken, UserSession, LoginAttempt, AuthenticationAuditLog
)
from .schemas import (
    HospitalCreate, HospitalUpdate, HospitalOut,
    LoginRequest, LoginResponse, RefreshTokenRequest, ForgotPasswordRequest,
    ForgotPasswordResponse, ResetPasswordRequest, AuditLogOut,
    PatientRegisterRequest, PatientSearchResult, PatientHospitalLinkRequest,
    PatientProfileOut, MedicalHistoryCreate, MedicalHistoryOut,
    MedicalConditionCreate, MedicalConditionOut, PatientAllergyCreate, PatientAllergyOut,
    MedicalTimelineEvent, TreatmentCreate, TreatmentUpdate, TreatmentOut,
    PrescriptionItem, PrescriptionOut, AttachmentOut, TreatmentNoteCreate, TreatmentNoteOut,
    PatientConsentCreate, PatientConsentOut, MedicalAccessLogOut,
    UserOut, PatientCreate, PatientOut, DoctorCreate, DoctorOut,
    AppointmentCreate, AppointmentOut, LabReportCreate, LabReportOut,
    InvoiceCreate, InvoiceOut
)
from .security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    generate_reset_token, JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS
)

load_dotenv()
Base.metadata.create_all(bind=engine)

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage", "attachments"))
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(
    title="X7 MediCore HMS API",
    version="3.0.0",
    description="Centralized Global Patient Identity & Federated Multi-Hospital Medical History Management System"
)

origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)

DASHBOARDS = {
    "super_admin": "/super-admin/dashboard",
    "hospital_admin": "/hospital-admin/dashboard",
    "doctor": "/doctor/dashboard",
    "patient": "/patient/dashboard",
    "nurse": "/staff/dashboard",
    "lab_technician": "/lab/dashboard",
    "pharmacist": "/pharmacy/dashboard",
    "billing_staff": "/billing/dashboard",
}

PORTAL_ROLES = {
    "super_admin": {"super_admin"},
    "hospital_admin": {"hospital_admin"},
    "general": {"doctor", "nurse", "lab_technician", "pharmacist", "billing_staff", "patient"},
    "staff": {"doctor", "nurse", "lab_technician", "pharmacist", "billing_staff"},
    "patient": {"patient"},
}

# ----------------- Helper Functions -----------------
def generate_next_grn(db: Session) -> str:
    """Generate a concurrency-safe, sequential unique GRN formatted as XM-GRN-XXXXXX."""
    max_id = db.query(func.max(GlobalPatient.id)).scalar() or 0
    candidate_id = max_id + 1
    candidate_grn = f"XM-GRN-{candidate_id:06d}"
    # Safety check to prevent collisions
    while db.query(GlobalPatient).filter(GlobalPatient.grn == candidate_grn).first():
        candidate_id += 1
        candidate_grn = f"XM-GRN-{candidate_id:06d}"
    return candidate_grn

def generate_treatment_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(Treatment).count() + 1
    code = f"TRT-{year}-{count:04d}"
    while db.query(Treatment).filter(Treatment.treatment_code == code).first():
        count += 1
        code = f"TRT-{year}-{count:04d}"
    return code

def generate_attachment_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(TreatmentAttachment).count() + 1
    code = f"ATT-{year}-{count:04d}"
    while db.query(TreatmentAttachment).filter(TreatmentAttachment.attachment_code == code).first():
        count += 1
        code = f"ATT-{year}-{count:04d}"
    return code

def log_medical_access(db: Session, user: User, global_patient_id: int, hospital_id: str | None,
                       resource_type: str, resource_id: str | None, action: str, request: Request | None = None):
    try:
        ip = get_client_ip(request) if request else "127.0.0.1"
        log = MedicalRecordAccessLog(
            user_id=user.id, global_patient_id=global_patient_id, hospital_id=hospital_id,
            resource_type=resource_type, resource_id=str(resource_id) if resource_id else None,
            action=action, ip_address=ip, accessed_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()

def log_medical_audit(db: Session, user: User, global_patient_id: int, hospital_id: str | None,
                      action: str, table_name: str, record_id: str, old_val: str | None = None, new_val: str | None = None):
    try:
        audit = MedicalRecordAuditLog(
            user_id=user.id, global_patient_id=global_patient_id, hospital_id=hospital_id,
            action=action, table_name=table_name, record_id=str(record_id),
            old_values=old_val, new_values=new_val, timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

# ----------------- Demo Seeding -----------------
def seed_demo_data():
    with SessionLocal() as db:
        # 1. Hospitals
        hospitals_data = [
            ("HOSP-001", "X7 City Central Hospital", "Chennai, Tamil Nadu", "100 Anna Salai, Chennai", "+91 44 2852 0001", "chennai@x7medicore.local", True),
            ("HOSP-002", "X7 Memorial Specialty Hospital", "Bengaluru, Karnataka", "45 Residency Road, Bengaluru", "+91 80 4112 0002", "bengaluru@x7medicore.local", True),
            ("HOSP-003", "X7 Metro Healthcare Clinic", "Hyderabad, Telangana", "12 Banjara Hills, Hyderabad", "+91 40 6622 0003", "hyderabad@x7medicore.local", True),
            ("HOSP-004", "X7 Regional Care Center (Maintenance)", "Coimbatore, Tamil Nadu", "78 Avinashi Road, Coimbatore", "+91 422 230 0004", "coimbatore@x7medicore.local", False),
        ]
        hospital_map = {}
        for code, name, loc, addr, phone, email, active in hospitals_data:
            h = db.query(Hospital).filter(Hospital.code == code).first()
            if not h:
                h = Hospital(code=code, name=name, location=loc, address=addr, phone=phone, email=email, is_active=active)
                db.add(h)
                db.commit()
                db.refresh(h)
            hospital_map[code] = h

        # 2. Global Patients
        gp1 = db.query(GlobalPatient).filter(GlobalPatient.grn == "XM-GRN-000001").first()
        if not gp1:
            gp1 = GlobalPatient(
                grn="XM-GRN-000001", full_name="Arun Kumar", date_of_birth=date(1996, 8, 15),
                gender="Male", phone="+91 98765 43210", email="patient@x7medicore.local",
                blood_group="O+", address="Demo Address, Chennai, Tamil Nadu",
                emergency_contact="Emergency Family (+91 98765 43200)"
            )
            db.add(gp1); db.commit(); db.refresh(gp1)

        gp2 = db.query(GlobalPatient).filter(GlobalPatient.grn == "XM-GRN-000002").first()
        if not gp2:
            gp2 = GlobalPatient(
                grn="XM-GRN-000002", full_name="Meena Rani", date_of_birth=date(1999, 4, 20),
                gender="Female", phone="+91 90000 00002", email="patient2@x7medicore.local",
                blood_group="A+", address="45 MG Road, Bengaluru, Karnataka",
                emergency_contact="Guardian (+91 90000 00011)"
            )
            db.add(gp2); db.commit(); db.refresh(gp2)

        # 3. Patient-Hospital Links
        if db.query(PatientHospitalLink).count() == 0:
            link1 = PatientHospitalLink(global_patient_id=gp1.id, hospital_id=hospital_map["HOSP-001"].id, local_patient_id="PT-CHN-001", consent_status="granted")
            link2 = PatientHospitalLink(global_patient_id=gp1.id, hospital_id=hospital_map["HOSP-002"].id, local_patient_id="PT-BLR-001", consent_status="granted")
            link3 = PatientHospitalLink(global_patient_id=gp2.id, hospital_id=hospital_map["HOSP-002"].id, local_patient_id="PT-BLR-002", consent_status="granted")
            db.add_all([link1, link2, link3])
            db.commit()

        # 4. Medical Conditions & Allergies
        if db.query(MedicalCondition).count() == 0:
            db.add_all([
                MedicalCondition(global_patient_id=gp1.id, condition_name="Primary Hypertension", icd_code="I10", status="active", diagnosed_date=date(2025, 4, 10), notes="Controlled on low-dose ACE inhibitor"),
                MedicalCondition(global_patient_id=gp1.id, condition_name="Seasonal Allergic Rhinitis", icd_code="J30.2", status="managed", diagnosed_date=date(2024, 9, 15), notes="Triggered by dust and seasonal pollen")
            ])
            db.commit()

        if db.query(PatientAllergy).count() == 0:
            db.add_all([
                PatientAllergy(global_patient_id=gp1.id, allergen="Penicillin", reaction="Urticarial skin rash and mild facial swelling", severity="severe", identified_date=date(2021, 6, 20)),
                PatientAllergy(global_patient_id=gp1.id, allergen="Sulfa Drugs", reaction="Gastric distress and cutaneous pruritus", severity="moderate", identified_date=date(2023, 2, 11))
            ])
            db.commit()

        if db.query(MedicalHistory).count() == 0:
            db.add_all([
                MedicalHistory(global_patient_id=gp1.id, hospital_id="HOSP-001", record_type="surgery", title="Laparoscopic Appendectomy", description="Uncomplicated appendectomy following acute suppurative appendicitis", diagnosed_date=date(2021, 8, 14), severity="moderate", status="resolved"),
                MedicalHistory(global_patient_id=gp1.id, hospital_id="HOSP-001", record_type="diagnosis", title="Acute Viral Pharyngitis", description="Sore throat and rhinorrhea treated symptomatically", diagnosed_date=date(2026, 1, 10), severity="mild", status="resolved")
            ])
            db.commit()

        # 5. Seed Users
        demos = [
            ("superadmin@x7medicore.local", "Super Admin", "super_admin", None),
            ("hospitaladmin@x7medicore.local", "Hospital Admin", "hospital_admin", "HOSP-001"),
            ("admin.bengaluru@x7medicore.local", "Bengaluru Admin", "hospital_admin", "HOSP-002"),
            ("doctor@x7medicore.local", "Dr. Kumar", "doctor", "HOSP-001"),
            ("doctor.priya@x7medicore.local", "Dr. Priya", "doctor", "HOSP-002"),
            ("patient@x7medicore.local", "Arun Kumar", "patient", "HOSP-001"),
            ("patient2@x7medicore.local", "Meena Rani", "patient", "HOSP-002"),
            ("nurse@x7medicore.local", "Demo Nurse", "nurse", "HOSP-001"),
            ("lab@x7medicore.local", "Lab Technician", "lab_technician", "HOSP-001"),
            ("pharmacy@x7medicore.local", "Pharmacist", "pharmacist", "HOSP-001"),
            ("billing@x7medicore.local", "Billing Staff", "billing_staff", "HOSP-001"),
        ]
        created_users = {}
        for email, name, role, hosp_code in demos:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email, full_name=name, role=role, hospital_id=hosp_code,
                    password_hash=hash_password("ChangeMe123!"), is_active=True
                )
                db.add(u); db.commit(); db.refresh(u)
            created_users[email] = u

            if hosp_code and hosp_code in hospital_map:
                h_obj = hospital_map[hosp_code]
                mem = db.query(UserHospitalMembership).filter(
                    UserHospitalMembership.user_id == u.id,
                    UserHospitalMembership.hospital_id == h_obj.id
                ).first()
                if not mem:
                    db.add(UserHospitalMembership(user_id=u.id, hospital_id=h_obj.id, role=role, is_active=True))
                    db.commit()

        # Link Patient Accounts
        pat_u1 = created_users.get("patient@x7medicore.local")
        if pat_u1 and not db.query(PatientAccount).filter(PatientAccount.user_id == pat_u1.id).first():
            db.add(PatientAccount(user_id=pat_u1.id, global_patient_id=gp1.id, primary_hospital_id=hospital_map["HOSP-001"].id))
            db.commit()

        # 6. Doctors & Clinical records
        doc1 = db.query(Doctor).filter(Doctor.hospital_id == "HOSP-001").first()
        if not doc1:
            doc1 = Doctor(full_name="Dr. Kumar", specialization="General Medicine", phone="+91 90000 10001", email="doctor@x7medicore.local", hospital_id="HOSP-001")
            db.add(doc1); db.commit(); db.refresh(doc1)

        doc2 = db.query(Doctor).filter(Doctor.hospital_id == "HOSP-002").first()
        if not doc2:
            doc2 = Doctor(full_name="Dr. Priya", specialization="Cardiology", phone="+91 90000 10002", email="doctor.priya@x7medicore.local", hospital_id="HOSP-002")
            db.add(doc2); db.commit(); db.refresh(doc2)

        # 7. Multi-Hospital Treatments for Arun Kumar (XM-GRN-000001)
        if db.query(Treatment).count() == 0:
            # Treatment 1 at HOSP-001 (Chennai)
            t1 = Treatment(
                treatment_code="TRT-2026-0001",
                global_patient_id=gp1.id,
                doctor_id=doc1.id,
                hospital_id="HOSP-001",
                visit_date=datetime.now() - timedelta(days=20),
                chief_complaint="Persistent dry cough and sore throat for 3 days",
                symptoms="Fever (99.8 F), throat irritation, mild headache",
                clinical_observations="Erythematous posterior pharyngeal wall. Normal vesicular breath sounds. No cervical lymphadenopathy.",
                diagnosis="Seasonal Upper Respiratory Infection",
                description="Prescribed supportive care, oral hydration, and 5-day antibiotic regimen.",
                procedures_performed="Throat swab inspection and vital signs assessment",
                follow_up_instructions="Return if fever persists beyond 48 hours or if breathing becomes labored.",
                status="Completed",
                created_at=datetime.now() - timedelta(days=20)
            )
            db.add(t1); db.commit(); db.refresh(t1)

            # Prescriptions for T1
            p1 = Prescription(treatment_id=t1.id, global_patient_id=gp1.id, doctor_id=doc1.id, hospital_id="HOSP-001",
                              medication="Azithromycin 500mg", dosage="1 tablet daily before breakfast", instructions="Complete full 5-day course", prescribed_date=date.today() - timedelta(days=20), status="completed")
            db.add(p1); db.commit()

            # Attachment for T1
            xray_file = "sample_xray_chest.png"
            att1 = TreatmentAttachment(
                attachment_code="ATT-2026-0001",
                treatment_id=t1.id,
                global_patient_id=gp1.id,
                hospital_id="HOSP-001",
                original_filename="Chest_XRay_PA_View.png",
                stored_filename=xray_file,
                file_type="image/png",
                file_category="X-ray",
                file_size=1024,
                file_path=os.path.join(STORAGE_DIR, xray_file),
                description="Chest radiograph showing clear lung fields with no focal consolidations or pleural effusion.",
                upload_date=datetime.now() - timedelta(days=20)
            )
            db.add(att1); db.commit()

            # Treatment 2 at HOSP-002 (Bengaluru - Cross-Hospital Visit!)
            t2 = Treatment(
                treatment_code="TRT-2026-0002",
                global_patient_id=gp1.id,
                doctor_id=doc2.id,
                hospital_id="HOSP-002",
                visit_date=datetime.now() - timedelta(days=5),
                chief_complaint="Elevated blood pressure during annual executive health checkup",
                symptoms="Occasional morning occipital headache, no chest pain or shortness of breath",
                clinical_observations="Sitting BP: 146/92 mmHg. Heart sounds normal. ECG shows normal sinus rhythm.",
                diagnosis="Stage 1 Essential Hypertension",
                description="Initiated lifestyle modifications, dietary sodium reduction, and anti-hypertensive therapy.",
                procedures_performed="12-Lead Resting Electrocardiogram (ECG) and Ambulatory BP Monitoring review",
                follow_up_instructions="Maintain daily home BP log and repeat clinical evaluation in 4 weeks.",
                next_appointment_date=datetime.now() + timedelta(days=25),
                status="In Progress",
                created_at=datetime.now() - timedelta(days=5)
            )
            db.add(t2); db.commit(); db.refresh(t2)

            # Prescription for T2
            p2 = Prescription(treatment_id=t2.id, global_patient_id=gp1.id, doctor_id=doc2.id, hospital_id="HOSP-002",
                              medication="Telmisartan 40mg", dosage="1 tablet once daily in the morning", instructions="Take with water at the same time daily", prescribed_date=date.today() - timedelta(days=5), status="active")
            db.add(p2); db.commit()

            # Attachment for T2 (Blood report PDF)
            pdf_file = "sample_blood_report.pdf"
            att2 = TreatmentAttachment(
                attachment_code="ATT-2026-0002",
                treatment_id=t2.id,
                global_patient_id=gp1.id,
                hospital_id="HOSP-002",
                original_filename="Cardiovascular_Lipid_Panel.pdf",
                stored_filename=pdf_file,
                file_type="application/pdf",
                file_category="Blood Test Report",
                file_size=2048,
                file_path=os.path.join(STORAGE_DIR, pdf_file),
                description="Complete Lipid profile and Renal panel: Total Cholesterol 192 mg/dL, Creatinine 0.9 mg/dL (Normal).",
                upload_date=datetime.now() - timedelta(days=5)
            )
            db.add(att2); db.commit()

        # 8. Patient Consent record
        if db.query(PatientConsent).count() == 0:
            db.add_all([
                PatientConsent(global_patient_id=gp1.id, requesting_hospital_id="HOSP-002", consent_type="cross_hospital_access", status="granted", notes="Patient consented to share medical records between Chennai and Bengaluru facilities."),
                PatientConsent(global_patient_id=gp1.id, requesting_hospital_id="HOSP-001", consent_type="cross_hospital_access", status="granted", notes="Primary hospital consent granted.")
            ])
            db.commit()

seed_demo_data()

# ----------------- Dependencies & Current User -----------------
def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    token: str | None = Query(None),
    db: Session = Depends(get_db)
) -> User:
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        claims = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(claims["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token.")

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable or deactivated.")
    return user

def require_roles(*roles):
    def checker(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role '{'/'.join(roles)}' but account has '{user.role}'."
            )
        return user
    return checker

def get_client_ip(request: Request | None) -> str:
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def log_audit(db: Session, event: str, user_id: int | None = None, hospital_code: str | None = None, ip_address: str | None = None, details: str | None = None):
    try:
        audit = AuthenticationAuditLog(
            user_id=user_id, event=event, hospital_code=hospital_code,
            ip_address=ip_address, details=details, created_at=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

# ----------------- Base System Endpoints -----------------
@app.get("/")
def root():
    return {
        "name": "X7 MediCore HMS API",
        "version": "3.0.0",
        "status": "operational",
        "system": "Global Patient Identity (GRN) & Multi-Hospital Medical History",
        "docs": "/docs"
    }

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ----------------- Hospitals & Authentication -----------------
@app.get("/api/v1/hospitals", response_model=list[HospitalOut])
def list_hospitals(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(Hospital)
    if not include_inactive:
        query = query.filter(Hospital.is_active.is_(True))
    return query.order_by(Hospital.name.asc()).all()

@app.post("/api/v1/hospitals", response_model=HospitalOut, status_code=201)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("super_admin")),
    request: Request = None
):
    existing = db.query(Hospital).filter(Hospital.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Hospital code '{payload.code}' already exists.")

    hospital = Hospital(
        code=payload.code.upper().strip(), name=payload.name.strip(),
        location=payload.location.strip(), address=payload.address,
        phone=payload.phone, email=payload.email, logo_url=payload.logo_url,
        is_active=payload.is_active
    )
    db.add(hospital); db.commit(); db.refresh(hospital)
    log_audit(db, "HOSPITAL_CREATED", user_id=admin.id, hospital_code=hospital.code,
              ip_address=get_client_ip(request), details=f"Registered hospital {hospital.name}")
    return hospital

@app.patch("/api/v1/hospitals/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("super_admin")),
    request: Request = None
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(hospital, field, val)

    db.commit(); db.refresh(hospital)
    log_audit(db, "HOSPITAL_UPDATED", user_id=admin.id, hospital_code=hospital.code,
              ip_address=get_client_ip(request), details=f"Updated hospital {hospital.code}")
    return hospital

@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    identifier = (payload.identifier or payload.email or "").strip()
    portal = payload.portal.strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Email address or GRN is required.")
    if portal not in PORTAL_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid login portal '{portal}'.")

    # Rate Limiting (5 failures in 15 mins)
    cutoff = datetime.utcnow() - timedelta(minutes=15)
    recent_failures = db.query(LoginAttempt).filter(
        LoginAttempt.identifier == identifier.lower(),
        LoginAttempt.success.is_(False),
        LoginAttempt.attempted_at >= cutoff
    ).count()

    if recent_failures >= 5:
        log_audit(db, "LOCKED_OUT", hospital_code=payload.hospital_code, ip_address=client_ip,
                  details=f"Lockout triggered for identifier {identifier}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to repeated failed login attempts. Please wait 15 minutes or reset your password."
        )

    # Resolution: Email or Patient GRN
    user = None
    is_grn_login = identifier.upper().startswith("XM-GRN-") or identifier.upper().startswith("GRN")

    if is_grn_login:
        gp = db.query(GlobalPatient).filter(GlobalPatient.grn == identifier.upper()).first()
        if gp:
            account = db.query(PatientAccount).filter(PatientAccount.global_patient_id == gp.id).first()
            if account:
                user = db.query(User).filter(User.id == account.user_id).first()
    else:
        user = db.query(User).filter(User.email == identifier.lower()).first()
        if not user:
            gp = db.query(GlobalPatient).filter(GlobalPatient.grn == identifier.upper()).first()
            if gp:
                account = db.query(PatientAccount).filter(PatientAccount.global_patient_id == gp.id).first()
                if account:
                    user = db.query(User).filter(User.id == account.user_id).first()

    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        db.add(LoginAttempt(identifier=identifier.lower(), ip_address=client_ip, success=False, attempted_at=datetime.utcnow()))
        db.commit()
        log_audit(db, "LOGIN_FAILED", user_id=user.id if user else None, hospital_code=payload.hospital_code,
                  ip_address=client_ip, details=f"Failed login attempt for {identifier} on portal {portal}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/GRN or password.")

    if portal == "super_admin":
        if user.role != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Super Admin credentials required.")
    else:
        if user.role == "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin must sign in via /super-admin/login.")
        if portal == "hospital_admin" and user.role != "hospital_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is not authorized as a Hospital Administrator.")
        if portal == "general" and user.role not in PORTAL_ROLES["general"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please use your dedicated portal to sign in.")

    hospital_name = None
    hospital_code = payload.hospital_code

    if user.role != "super_admin":
        if not hospital_code and user.role == "patient":
            hospital_code = user.hospital_id or "HOSP-001"

        if not hospital_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital selection is required to sign in.")

        hospital = db.query(Hospital).filter(Hospital.code == hospital_code).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected hospital not found.")
        if not hospital.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"{hospital.name} is currently inactive or in maintenance.")
        hospital_name = hospital.name

        has_membership = (user.hospital_id == hospital_code)
        if not has_membership:
            mem = db.query(UserHospitalMembership).filter(
                UserHospitalMembership.user_id == user.id,
                UserHospitalMembership.hospital_id == hospital.id,
                UserHospitalMembership.is_active.is_(True)
            ).first()
            if mem:
                has_membership = True
            elif user.role == "patient" and user.patient_account:
                gp = user.patient_account.global_patient
                if gp:
                    link = db.query(PatientHospitalLink).filter(
                        PatientHospitalLink.global_patient_id == gp.id,
                        PatientHospitalLink.hospital_id == hospital_code
                    ).first()
                    if link:
                        has_membership = True

        if not has_membership:
            log_audit(db, "HOSPITAL_MISMATCH", user_id=user.id, hospital_code=hospital_code,
                      ip_address=client_ip, details=f"User {user.email} attempted login with unauthorized hospital {hospital_code}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Your account is not registered with {hospital.name}.")

    grn = None
    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        if account and account.global_patient:
            grn = account.global_patient.grn

    db.add(LoginAttempt(identifier=identifier.lower(), ip_address=client_ip, success=True, attempted_at=datetime.utcnow()))
    access_token = create_access_token(user.id, user.role, hospital_id=hospital_code, grn=grn)
    refresh_token = create_refresh_token()
    session_days = 30 if payload.remember_me else REFRESH_TOKEN_DAYS

    db.add(UserSession(
        user_id=user.id, refresh_token=refresh_token, user_agent=request.headers.get("User-Agent"),
        ip_address=client_ip, expires_at=datetime.utcnow() + timedelta(days=session_days), is_revoked=False
    ))
    db.commit()

    log_audit(db, "LOGIN_SUCCESS", user_id=user.id, hospital_code=hospital_code, ip_address=client_ip,
              details=f"User {user.email} signed in via {portal} portal")

    user_out = UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role,
                       hospital_id=hospital_code or user.hospital_id, grn=grn)

    return LoginResponse(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer",
        user=user_out, dashboard_path=DASHBOARDS.get(user.role, "/login"),
        hospital_code=hospital_code, hospital_name=hospital_name, grn=grn
    )

@app.post("/api/v1/auth/refresh")
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(
        UserSession.refresh_token == payload.refresh_token,
        UserSession.is_revoked.is_(False),
        UserSession.expires_at > datetime.utcnow()
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session. Please sign in again.")

    user = db.query(User).filter(User.id == session.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable.")

    grn = None
    if user.role == "patient" and user.patient_account and user.patient_account.global_patient:
        grn = user.patient_account.global_patient.grn

    new_token = create_access_token(user.id, user.role, hospital_id=user.hospital_id, grn=grn)
    return {"access_token": new_token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_MINUTES * 60}

@app.post("/api/v1/auth/logout")
def logout(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if credentials:
        try:
            claims = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = int(claims["sub"])
            db.query(UserSession).filter(UserSession.user_id == user_id).update({"is_revoked": True})
            db.commit()
            log_audit(db, "LOGOUT", user_id=user_id, ip_address=get_client_ip(request), details="User logged out")
        except Exception:
            pass
    return {"message": "Session terminated successfully."}

@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    grn = None
    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        if account and account.global_patient:
            grn = account.global_patient.grn
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role,
                   hospital_id=user.hospital_id, grn=grn)

@app.post("/api/v1/auth/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ident = payload.identifier.strip()
    user = None
    if ident.upper().startswith("XM-GRN-") or ident.upper().startswith("GRN"):
        gp = db.query(GlobalPatient).filter(GlobalPatient.grn == ident.upper()).first()
        if gp and gp.accounts:
            user = db.query(User).filter(User.id == gp.accounts[0].user_id).first()
    else:
        user = db.query(User).filter(User.email == ident.lower()).first()

    reset_token = None
    if user and user.is_active:
        reset_token = generate_reset_token()
        expires = datetime.utcnow() + timedelta(minutes=30)
        db.add(PasswordResetToken(user_id=user.id, token=reset_token, expires_at=expires, is_used=False))
        db.commit()

    return ForgotPasswordResponse(
        message="If your account exists, password reset instructions have been issued.",
        reset_token=reset_token
    )

@app.post("/api/v1/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.is_used.is_(False),
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Token invalid, expired, or already used.")

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.password_hash = hash_password(payload.new_password)
    token_record.is_used = True
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})
    db.commit()
    return {"message": "Password updated successfully."}

@app.get("/api/v1/admin/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(limit: int = Query(50, le=200), db: Session = Depends(get_db), admin: User = Depends(require_roles("super_admin"))):
    return db.query(AuthenticationAuditLog).order_by(AuthenticationAuditLog.created_at.desc()).limit(limit).all()

# ----------------- SECTION 1: Patient Identity & Registration -----------------
@app.post("/api/v1/patients/register", response_model=PatientSearchResult, status_code=201)
def register_patient(
    payload: PatientRegisterRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse")),
    request: Request = None
):
    """
    Register a patient into the centralized Global Patient Identity System.
    Generates a permanent unique GRN (e.g. XM-GRN-000003) and links to registering hospital.
    """
    # 1. Prevent accidental duplicate registrations
    if payload.email:
        existing = db.query(GlobalPatient).filter(GlobalPatient.email == payload.email.lower().strip()).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Patient already registered with Global Registration Number (GRN): {existing.grn}. Please search by GRN to link this patient."
            )
    if payload.phone:
        existing_phone = db.query(GlobalPatient).filter(GlobalPatient.phone == payload.phone.strip()).first()
        if existing_phone:
            raise HTTPException(
                status_code=409,
                detail=f"Patient with phone {payload.phone} already has GRN: {existing_phone.grn}. Search by GRN to add hospital visits."
            )

    # 2. Concurrency-safe GRN generation
    grn = generate_next_grn(db)
    hosp_code = payload.hospital_code or user.hospital_id or "HOSP-001"
    hospital = db.query(Hospital).filter(Hospital.code == hosp_code).first()

    gp = GlobalPatient(
        grn=grn,
        full_name=payload.full_name.strip(),
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.lower().strip() if payload.email else None,
        blood_group=payload.blood_group,
        address=payload.address,
        emergency_contact=payload.emergency_contact
    )
    db.add(gp)
    db.commit()
    db.refresh(gp)

    # 3. Create Patient-Hospital Link
    if hospital:
        link = PatientHospitalLink(
            global_patient_id=gp.id,
            hospital_id=hospital.id,
            local_patient_id=f"PT-{hosp_code}-{gp.id:04d}",
            consent_status="granted",
            notes="Initial facility registration link"
        )
        db.add(link)

        # Also create local legacy patient record for full module backwards-compatibility
        local_p = Patient(
            patient_code=grn,
            global_patient_id=gp.id,
            full_name=gp.full_name,
            date_of_birth=gp.date_of_birth,
            gender=gp.gender,
            phone=gp.phone,
            email=gp.email,
            address=gp.address,
            blood_group=gp.blood_group,
            emergency_contact=gp.emergency_contact,
            hospital_id=hosp_code
        )
        db.add(local_p)
        db.commit()

    log_medical_audit(db, user, gp.id, hosp_code, "CREATE", "global_patients", str(gp.id),
                      None, f"Registered global patient {gp.full_name} ({grn})")

    return PatientSearchResult(
        grn=gp.grn, full_name=gp.full_name, date_of_birth=gp.date_of_birth,
        gender=gp.gender, phone=gp.phone, email=gp.email, blood_group=gp.blood_group,
        emergency_contact=gp.emergency_contact, primary_hospital_code=hosp_code,
        primary_hospital_name=hospital.name if hospital else hosp_code,
        linked_hospitals=[hosp_code], is_linked_to_current_hospital=True, consent_status="granted"
    )

@app.get("/api/v1/patients/search", response_model=list[PatientSearchResult])
def search_patients(
    q: str | None = Query(None, description="Search by GRN, name, phone, or local patient code"),
    query: str | None = Query(None, description="Alias for search query"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user)
):
    """
    Search patients by GRN, Full Name, Phone number, or local code.
    Identifies whether the patient is already linked to the staff's hospital.
    """
    query_str = (q or query or "").strip()
    if not query_str:
        return []
    current_hosp = user.hospital_id

    clean_digits = "".join(c for c in query_str if c.isdigit())
    filters = [
        GlobalPatient.grn.ilike(f"%{query_str}%"),
        GlobalPatient.full_name.ilike(f"%{query_str}%"),
        GlobalPatient.phone.ilike(f"%{query_str}%"),
        GlobalPatient.email.ilike(f"%{query_str}%")
    ]
    if len(clean_digits) >= 4:
        filters.append(func.replace(func.replace(GlobalPatient.phone, ' ', ''), '-', '').ilike(f"%{clean_digits}%"))

    patients_q = db.query(GlobalPatient).filter(or_(*filters)).limit(30).all()

    results = []
    for gp in patients_q:
        linked_hospitals = []
        is_linked = False
        consent_status = "pending"

        for link in gp.hospital_links:
            if link.hospital and link.is_active:
                linked_hospitals.append(link.hospital.code)
                if current_hosp and link.hospital.code == current_hosp:
                    is_linked = True
                    consent_status = link.consent_status

        if user.role == "super_admin":
            is_linked = True
            consent_status = "granted"

        primary_hosp = linked_hospitals[0] if linked_hospitals else current_hosp
        results.append(PatientSearchResult(
            grn=gp.grn, full_name=gp.full_name, date_of_birth=gp.date_of_birth,
            gender=gp.gender, phone=gp.phone, email=gp.email, blood_group=gp.blood_group,
            emergency_contact=gp.emergency_contact, primary_hospital_code=primary_hosp,
            linked_hospitals=linked_hospitals,
            is_linked_to_current_hospital=is_linked,
            consent_status=consent_status
        ))

    return results

@app.get("/api/v1/patients/{grn}", response_model=PatientSearchResult)
def get_patient_by_grn(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail=f"No patient record found for GRN: {grn}")

    linked_hospitals = [link.hospital.code for link in gp.hospital_links if link.hospital and link.is_active]
    is_linked = user.role == "super_admin" or (user.hospital_id in linked_hospitals)

    log_medical_access(db, user, gp.id, user.hospital_id, "patient", gp.grn, "VIEW", request)

    return PatientSearchResult(
        grn=gp.grn, full_name=gp.full_name, date_of_birth=gp.date_of_birth,
        gender=gp.gender, phone=gp.phone, email=gp.email, blood_group=gp.blood_group,
        emergency_contact=gp.emergency_contact,
        primary_hospital_code=linked_hospitals[0] if linked_hospitals else user.hospital_id,
        linked_hospitals=linked_hospitals,
        is_linked_to_current_hospital=is_linked,
        consent_status="granted" if is_linked else "pending"
    )

@app.get("/api/v1/patients/{grn}/hospitals")
def get_patient_hospitals(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    links = []
    for link in gp.hospital_links:
        if link.hospital:
            links.append({
                "hospital_id": link.hospital.id,
                "hospital_code": link.hospital.code,
                "hospital_name": link.hospital.name,
                "location": link.hospital.location,
                "local_patient_id": link.local_patient_id,
                "consent_status": link.consent_status,
                "linked_date": link.linked_date.isoformat(),
                "is_active": link.is_active
            })
    return links

@app.post("/api/v1/patients/{grn}/link-hospital", status_code=201)
def link_patient_to_hospital(
    grn: str,
    payload: PatientHospitalLinkRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse")),
    request: Request = None
):
    """Link an existing patient with permanent GRN to a new hospital with consent confirmation."""
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient GRN not found.")

    hospital = db.query(Hospital).filter(Hospital.code == payload.hospital_code).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    existing_link = db.query(PatientHospitalLink).filter(
        PatientHospitalLink.global_patient_id == gp.id,
        PatientHospitalLink.hospital_id == hospital.id
    ).first()

    if existing_link:
        existing_link.consent_status = payload.consent_status
        existing_link.is_active = True
        db.commit()
    else:
        new_link = PatientHospitalLink(
            global_patient_id=gp.id,
            hospital_id=hospital.id,
            local_patient_id=payload.local_patient_id or f"PT-{hospital.code}-{gp.id:04d}",
            consent_status=payload.consent_status,
            notes=payload.notes
        )
        db.add(new_link)
        db.commit()

    log_medical_audit(db, user, gp.id, hospital.code, "CREATE", "patient_hospital_links",
                      str(hospital.id), None, f"Linked GRN {gp.grn} to {hospital.name}")
    return {
        "message": f"Patient {gp.full_name} ({gp.grn}) successfully linked to {hospital.name}.",
        "hospital_code": hospital.code,
        "hospital_name": hospital.name,
        "grn": gp.grn
    }

# ----------------- SECTION 2: Medical History, Conditions & Allergies -----------------
@app.get("/api/v1/patients/{grn}/medical-history")
def get_medical_history(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    log_medical_access(db, user, gp.id, user.hospital_id, "medical_history", gp.grn, "VIEW", request)

    history_items = db.query(MedicalHistory).filter(MedicalHistory.global_patient_id == gp.id).order_by(MedicalHistory.diagnosed_date.desc()).all()
    conditions = db.query(MedicalCondition).filter(MedicalCondition.global_patient_id == gp.id).order_by(MedicalCondition.diagnosed_date.desc()).all()
    allergies = db.query(PatientAllergy).filter(PatientAllergy.global_patient_id == gp.id).order_by(PatientAllergy.identified_date.desc()).all()

    return {
        "grn": gp.grn,
        "full_name": gp.full_name,
        "blood_group": gp.blood_group,
        "conditions": conditions,
        "allergies": allergies,
        "history_entries": history_items
    }

@app.post("/api/v1/patients/{grn}/medical-history", response_model=MedicalHistoryOut, status_code=201)
def add_medical_history(
    grn: str,
    payload: MedicalHistoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "hospital_admin", "super_admin"))
):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hosp = user.hospital_id or "HOSP-001"
    doc = db.query(Doctor).filter(Doctor.email == user.email).first()
    doc_id = doc.id if doc else None

    entry = MedicalHistory(
        global_patient_id=gp.id,
        hospital_id=hosp,
        doctor_id=doc_id,
        treatment_id=payload.treatment_id,
        record_type=payload.record_type,
        title=payload.title,
        description=payload.description,
        diagnosed_date=payload.diagnosed_date,
        severity=payload.severity,
        status=payload.status
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_medical_audit(db, user, gp.id, hosp, "CREATE", "medical_history", str(entry.id),
                      None, f"Added {entry.record_type}: {entry.title}")
    return entry

@app.get("/api/v1/patients/{grn}/medical-history/timeline", response_model=list[MedicalTimelineEvent])
def get_medical_timeline(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    """
    Constructs an interactive, unified chronological timeline of all medical events
    (treatments, surgeries, diagnoses, lab reports, prescriptions) across all affiliated hospitals.
    """
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    log_medical_access(db, user, gp.id, user.hospital_id, "timeline", gp.grn, "VIEW", request)

    events: list[MedicalTimelineEvent] = []

    # 1. Treatments
    treatments = db.query(Treatment).filter(Treatment.global_patient_id == gp.id).all()
    for t in treatments:
        hosp = db.query(Hospital).filter(Hospital.code == t.hospital_id).first()
        doc = t.doctor
        events.append(MedicalTimelineEvent(
            id=f"trt-{t.id}",
            event_type="treatment",
            title=f"Treatment: {t.diagnosis}",
            description=f"Complaint: {t.chief_complaint}. Procedures: {t.procedures_performed or 'Standard examination'}",
            date=t.visit_date.isoformat(),
            hospital_id=t.hospital_id,
            hospital_name=hosp.name if hosp else t.hospital_id,
            doctor_name=doc.full_name if doc else "Attending Physician",
            doctor_specialization=doc.specialization if doc else "General",
            status=t.status
        ))

    # 2. Medical History entries (surgeries, past illnesses)
    history_items = db.query(MedicalHistory).filter(MedicalHistory.global_patient_id == gp.id).all()
    for h in history_items:
        hosp = db.query(Hospital).filter(Hospital.code == h.hospital_id).first()
        events.append(MedicalTimelineEvent(
            id=f"hist-{h.id}",
            event_type=h.record_type,
            title=f"{h.record_type.capitalize()}: {h.title}",
            description=h.description,
            date=datetime.combine(h.diagnosed_date, datetime.min.time()).isoformat(),
            hospital_id=h.hospital_id,
            hospital_name=hosp.name if hosp else h.hospital_id,
            severity=h.severity,
            status=h.status
        ))

    # 3. Prescriptions
    prescriptions = db.query(Prescription).filter(Prescription.global_patient_id == gp.id).all()
    for p in prescriptions:
        events.append(MedicalTimelineEvent(
            id=f"rx-{p.id}",
            event_type="prescription",
            title=f"Prescription: {p.medication}",
            description=f"Dosage: {p.dosage}. Instructions: {p.instructions}",
            date=datetime.combine(p.prescribed_date, datetime.min.time()).isoformat(),
            hospital_id=p.hospital_id,
            status=p.status
        ))

    # Sort descending by date
    events.sort(key=lambda x: x.date, reverse=True)
    return events

# ----------------- SECTION 3 & 4: Treatments Management -----------------
@app.post("/api/v1/treatments", response_model=TreatmentOut, status_code=201)
def create_treatment(
    payload: TreatmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "hospital_admin", "super_admin")),
    request: Request = None
):
    """
    Create a new comprehensive treatment record.
    Automatically generates Treatment ID, links to permanent GRN, and records into global medical history.
    """
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == payload.patient_grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail=f"Patient with GRN '{payload.patient_grn}' not found.")

    hosp_code = user.hospital_id or "HOSP-001"
    hospital = db.query(Hospital).filter(Hospital.code == hosp_code).first()

    # Find doctor record
    doc = db.query(Doctor).filter(Doctor.email == user.email).first()
    if not doc:
        # Fallback to any doctor in this hospital
        doc = db.query(Doctor).filter(Doctor.hospital_id == hosp_code).first()
        if not doc:
            doc = Doctor(full_name=user.full_name, specialization="General Medicine", hospital_id=hosp_code, is_active=True)
            db.add(doc); db.commit(); db.refresh(doc)

    treatment_code = generate_treatment_code(db)
    visit_time = payload.visit_date or datetime.utcnow()

    treatment = Treatment(
        treatment_code=treatment_code,
        global_patient_id=gp.id,
        doctor_id=doc.id,
        hospital_id=hosp_code,
        visit_date=visit_time,
        chief_complaint=payload.chief_complaint.strip(),
        symptoms=payload.symptoms.strip(),
        clinical_observations=payload.clinical_observations.strip(),
        diagnosis=payload.diagnosis.strip(),
        description=payload.description.strip(),
        procedures_performed=payload.procedures_performed.strip(),
        follow_up_instructions=payload.follow_up_instructions.strip(),
        next_appointment_date=payload.next_appointment_date,
        status=payload.status
    )
    db.add(treatment)
    db.commit()
    db.refresh(treatment)

    # Automatically add to Medical History
    history_entry = MedicalHistory(
        global_patient_id=gp.id,
        hospital_id=hosp_code,
        doctor_id=doc.id,
        treatment_id=treatment.id,
        record_type="diagnosis",
        title=treatment.diagnosis,
        description=f"Visit complaint: {treatment.chief_complaint}. Description: {treatment.description}",
        diagnosed_date=visit_time.date() if isinstance(visit_time, datetime) else date.today(),
        severity="moderate",
        status="active" if treatment.status in ["In Progress", "Scheduled"] else "resolved"
    )
    db.add(history_entry)

    # Process prescriptions
    prescription_outs = []
    for rx in payload.prescriptions:
        p = Prescription(
            treatment_id=treatment.id,
            global_patient_id=gp.id,
            doctor_id=doc.id,
            hospital_id=hosp_code,
            medication=rx.medication.strip(),
            dosage=rx.dosage.strip(),
            instructions=rx.instructions.strip(),
            prescribed_date=visit_time.date(),
            status="active"
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        prescription_outs.append(PrescriptionOut.model_validate(p))

    db.commit()

    log_medical_audit(db, user, gp.id, hosp_code, "CREATE", "treatments", str(treatment.id),
                      None, f"Created treatment {treatment_code}: {treatment.diagnosis}")

    return TreatmentOut(
        id=treatment.id,
        treatment_code=treatment.treatment_code,
        global_patient_id=gp.id,
        patient_grn=gp.grn,
        patient_name=gp.full_name,
        doctor_id=doc.id,
        doctor_name=doc.full_name,
        doctor_specialization=doc.specialization,
        hospital_id=hosp_code,
        hospital_name=hospital.name if hospital else hosp_code,
        visit_date=treatment.visit_date,
        chief_complaint=treatment.chief_complaint,
        symptoms=treatment.symptoms,
        clinical_observations=treatment.clinical_observations,
        diagnosis=treatment.diagnosis,
        description=treatment.description,
        procedures_performed=treatment.procedures_performed,
        follow_up_instructions=treatment.follow_up_instructions,
        next_appointment_date=treatment.next_appointment_date,
        status=treatment.status,
        created_at=treatment.created_at,
        prescriptions=prescription_outs,
        attachments=[],
        notes=[]
    )

@app.get("/api/v1/patients/{grn}/treatments", response_model=list[TreatmentOut])
def get_patient_treatments(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    """
    Get all authorized historical and current treatments for a patient in chronological order,
    including records across multi-hospital network.
    """
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    log_medical_access(db, user, gp.id, user.hospital_id, "treatment_history", gp.grn, "VIEW", request)

    treatments = db.query(Treatment).filter(Treatment.global_patient_id == gp.id).order_by(Treatment.visit_date.desc()).all()
    results = []
    for t in treatments:
        hosp = db.query(Hospital).filter(Hospital.code == t.hospital_id).first()
        doc = t.doctor

        rx_outs = [PrescriptionOut.model_validate(p) for p in t.prescriptions]
        att_outs = [
            AttachmentOut(
                id=a.id,
                attachment_code=a.attachment_code,
                treatment_id=a.treatment_id,
                patient_grn=gp.grn,
                hospital_id=a.hospital_id,
                original_filename=a.original_filename,
                file_type=a.file_type,
                file_category=a.file_category,
                file_size=a.file_size,
                description=a.description,
                upload_date=a.upload_date,
                download_url=f"/api/v1/attachments/{a.id}"
            )
            for a in t.attachments
        ]
        notes_outs = [TreatmentNoteOut.model_validate(n) for n in t.notes]

        results.append(TreatmentOut(
            id=t.id,
            treatment_code=t.treatment_code,
            global_patient_id=gp.id,
            patient_grn=gp.grn,
            patient_name=gp.full_name,
            doctor_id=doc.id if doc else 0,
            doctor_name=doc.full_name if doc else "Attending Doctor",
            doctor_specialization=doc.specialization if doc else "General",
            hospital_id=t.hospital_id,
            hospital_name=hosp.name if hosp else t.hospital_id,
            visit_date=t.visit_date,
            chief_complaint=t.chief_complaint,
            symptoms=t.symptoms,
            clinical_observations=t.clinical_observations,
            diagnosis=t.diagnosis,
            description=t.description,
            procedures_performed=t.procedures_performed,
            follow_up_instructions=t.follow_up_instructions,
            next_appointment_date=t.next_appointment_date,
            status=t.status,
            created_at=t.created_at,
            prescriptions=rx_outs,
            attachments=att_outs,
            notes=notes_outs
        ))
    return results

@app.get("/api/v1/treatments/{treatment_id}", response_model=TreatmentOut)
def get_treatment_details(treatment_id: int, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    t = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Treatment record not found.")

    gp = t.global_patient
    hosp = db.query(Hospital).filter(Hospital.code == t.hospital_id).first()
    doc = t.doctor

    log_medical_access(db, user, gp.id, t.hospital_id, "treatment", str(t.id), "VIEW", request)

    rx_outs = [PrescriptionOut.model_validate(p) for p in t.prescriptions]
    att_outs = [
        AttachmentOut(
            id=a.id,
            attachment_code=a.attachment_code,
            treatment_id=a.treatment_id,
            patient_grn=gp.grn,
            hospital_id=a.hospital_id,
            original_filename=a.original_filename,
            file_type=a.file_type,
            file_category=a.file_category,
            file_size=a.file_size,
            description=a.description,
            upload_date=a.upload_date,
            download_url=f"/api/v1/attachments/{a.id}"
        )
        for a in t.attachments
    ]
    notes_outs = [TreatmentNoteOut.model_validate(n) for n in t.notes]

    return TreatmentOut(
        id=t.id,
        treatment_code=t.treatment_code,
        global_patient_id=gp.id,
        patient_grn=gp.grn,
        patient_name=gp.full_name,
        doctor_id=doc.id if doc else 0,
        doctor_name=doc.full_name if doc else "Attending Doctor",
        doctor_specialization=doc.specialization if doc else "General",
        hospital_id=t.hospital_id,
        hospital_name=hosp.name if hosp else t.hospital_id,
        visit_date=t.visit_date,
        chief_complaint=t.chief_complaint,
        symptoms=t.symptoms,
        clinical_observations=t.clinical_observations,
        diagnosis=t.diagnosis,
        description=t.description,
        procedures_performed=t.procedures_performed,
        follow_up_instructions=t.follow_up_instructions,
        next_appointment_date=t.next_appointment_date,
        status=t.status,
        created_at=t.created_at,
        prescriptions=rx_outs,
        attachments=att_outs,
        notes=notes_outs
    )

@app.patch("/api/v1/treatments/{treatment_id}", response_model=TreatmentOut)
def update_treatment(
    treatment_id: int,
    payload: TreatmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "hospital_admin", "super_admin")),
    request: Request = None
):
    t = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Treatment record not found.")

    old_diag = t.diagnosis
    old_status = t.status

    # Record clinical note or audit trail if correction made
    if payload.correction_reason:
        note = TreatmentNote(
            treatment_id=t.id,
            doctor_id=user.id,
            note_type="correction",
            note_text=f"Clinical Update by {user.full_name}: {payload.correction_reason}"
        )
        db.add(note)

    for field, val in payload.model_dump(exclude_unset=True, exclude={"correction_reason"}).items():
        if val is not None:
            setattr(t, field, val)

    t.updated_at = datetime.utcnow()
    db.commit()

    log_medical_audit(db, user, t.global_patient_id, t.hospital_id, "UPDATE", "treatments", str(t.id),
                      f"Status: {old_status}, Diag: {old_diag}",
                      f"Status: {t.status}, Diag: {t.diagnosis}, Reason: {payload.correction_reason or 'Direct Update'}")

    return get_treatment_details(treatment_id, db, user, request)

@app.post("/api/v1/treatments/{treatment_id}/notes", response_model=TreatmentNoteOut, status_code=201)
def add_treatment_note(
    treatment_id: int,
    payload: TreatmentNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "nurse", "hospital_admin", "super_admin")),
    request: Request = None
):
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment record not found.")

    note = TreatmentNote(
        treatment_id=treatment.id,
        doctor_id=user.id,
        note_type=payload.note_type,
        note_text=payload.note_text
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_medical_audit(db, user, treatment.global_patient_id, treatment.hospital_id, "CREATE",
                      "treatment_notes", str(note.id), None, f"Added {payload.note_type} note: {payload.note_text[:60]}")
    return note

# ----------------- SECTION 5: Medical Image and Document Upload -----------------
@app.post("/api/v1/treatments/{treatment_id}/attachments", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    treatment_id: int,
    file: UploadFile = File(...),
    file_category: str = Form("Other Medical Documents"),
    description: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor", "nurse", "lab_technician", "hospital_admin", "super_admin")),
    request: Request = None
):
    """
    Securely upload diagnostic images (X-ray, MRI, CT Scan, Ultrasound) or clinical documents (PDF, Reports).
    Files are stored in private file storage and metadata is linked to the patient's global treatment history.
    """
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment record not found.")

    gp = treatment.global_patient

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".pdf", ".webp", ".dcm"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'. Approved formats: JPG, PNG, PDF, WEBP, DICOM.")

    # Generate unique stored filename
    stored_filename = f"{treatment.treatment_code}_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = os.path.join(STORAGE_DIR, stored_filename)

    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 20MB.")

    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    att_code = generate_attachment_code(db)
    attachment = TreatmentAttachment(
        attachment_code=att_code,
        treatment_id=treatment.id,
        global_patient_id=gp.id,
        hospital_id=treatment.hospital_id,
        original_filename=file.filename or "medical_document",
        stored_filename=stored_filename,
        file_type=file.content_type or "application/octet-stream",
        file_category=file_category,
        file_size=file_size,
        file_path=dest_path,
        uploaded_by_user_id=user.id,
        description=description,
        upload_date=datetime.utcnow()
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    log_medical_audit(db, user, gp.id, treatment.hospital_id, "CREATE", "treatment_attachments", str(attachment.id),
                      None, f"Uploaded {file_category}: {file.filename}")

    return AttachmentOut(
        id=attachment.id,
        attachment_code=attachment.attachment_code,
        treatment_id=attachment.treatment_id,
        patient_grn=gp.grn,
        hospital_id=attachment.hospital_id,
        original_filename=attachment.original_filename,
        file_type=attachment.file_type,
        file_category=attachment.file_category,
        file_size=attachment.file_size,
        description=attachment.description,
        upload_date=attachment.upload_date,
        download_url=f"/api/v1/attachments/{attachment.id}"
    )

@app.get("/api/v1/treatments/{treatment_id}/attachments", response_model=list[AttachmentOut])
def list_treatment_attachments(treatment_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    t = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Treatment record not found.")

    gp = t.global_patient
    return [
        AttachmentOut(
            id=a.id,
            attachment_code=a.attachment_code,
            treatment_id=a.treatment_id,
            patient_grn=gp.grn,
            hospital_id=a.hospital_id,
            original_filename=a.original_filename,
            file_type=a.file_type,
            file_category=a.file_category,
            file_size=a.file_size,
            description=a.description,
            upload_date=a.upload_date,
            download_url=f"/api/v1/attachments/{a.id}"
        )
        for a in t.attachments
    ]

@app.get("/api/v1/attachments/{attachment_id}")
def download_attachment(attachment_id: int, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    att = db.query(TreatmentAttachment).filter(TreatmentAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment file not found.")

    # Authorization verification
    gp = att.global_patient
    if user.role == "patient" and (not user.patient_account or user.patient_account.global_patient_id != gp.id):
        raise HTTPException(status_code=403, detail="Access denied: Cannot view another patient's medical files.")

    if not os.path.exists(att.file_path):
        raise HTTPException(status_code=404, detail="Physical document file missing from storage.")

    log_medical_access(db, user, gp.id, att.hospital_id, "attachment", str(att.id), "DOWNLOAD", request)

    return FileResponse(
        path=att.file_path,
        media_type=att.file_type,
        filename=att.original_filename
    )

@app.get("/api/v1/patients/{grn}/attachments", response_model=list[AttachmentOut])
def get_all_patient_attachments(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user), request: Request = None):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    log_medical_access(db, user, gp.id, user.hospital_id, "all_attachments", gp.grn, "VIEW", request)

    atts = db.query(TreatmentAttachment).filter(TreatmentAttachment.global_patient_id == gp.id).order_by(TreatmentAttachment.upload_date.desc()).all()
    return [
        AttachmentOut(
            id=a.id,
            attachment_code=a.attachment_code,
            treatment_id=a.treatment_id,
            patient_grn=gp.grn,
            hospital_id=a.hospital_id,
            original_filename=a.original_filename,
            file_type=a.file_type,
            file_category=a.file_category,
            file_size=a.file_size,
            description=a.description,
            upload_date=a.upload_date,
            download_url=f"/api/v1/attachments/{a.id}"
        )
        for a in atts
    ]

# ----------------- SECTION 7: Consents & Access Logs -----------------
@app.post("/api/v1/patients/{grn}/consents", response_model=PatientConsentOut, status_code=201)
def create_patient_consent(
    grn: str,
    payload: PatientConsentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("patient", "doctor", "hospital_admin", "super_admin"))
):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hosp = db.query(Hospital).filter(Hospital.code == payload.requesting_hospital_id).first()
    consent = PatientConsent(
        global_patient_id=gp.id,
        requesting_hospital_id=payload.requesting_hospital_id,
        consent_type=payload.consent_type,
        status=payload.status,
        granted_at=datetime.utcnow(),
        notes=payload.notes
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)

    log_medical_audit(db, user, gp.id, payload.requesting_hospital_id, "CREATE", "patient_consents", str(consent.id),
                      None, f"Recorded consent for {payload.requesting_hospital_id} ({payload.consent_type})")

    return PatientConsentOut(
        id=consent.id,
        global_patient_id=gp.id,
        requesting_hospital_id=consent.requesting_hospital_id,
        requesting_hospital_name=hosp.name if hosp else consent.requesting_hospital_id,
        consent_type=consent.consent_type,
        status=consent.status,
        granted_at=consent.granted_at,
        expires_at=consent.expires_at,
        notes=consent.notes
    )

@app.get("/api/v1/patients/{grn}/consents", response_model=list[PatientConsentOut])
def get_patient_consents(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    consents = db.query(PatientConsent).filter(PatientConsent.global_patient_id == gp.id).all()
    results = []
    for c in consents:
        hosp = db.query(Hospital).filter(Hospital.code == c.requesting_hospital_id).first()
        results.append(PatientConsentOut(
            id=c.id,
            global_patient_id=gp.id,
            requesting_hospital_id=c.requesting_hospital_id,
            requesting_hospital_name=hosp.name if hosp else c.requesting_hospital_id,
            consent_type=c.consent_type,
            status=c.status,
            granted_at=c.granted_at,
            expires_at=c.expires_at,
            notes=c.notes
        ))
    return results

@app.get("/api/v1/patients/{grn}/access-logs", response_model=list[MedicalAccessLogOut])
def get_patient_access_logs(grn: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    gp = db.query(GlobalPatient).filter(GlobalPatient.grn == grn.upper().strip()).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Patient not found.")

    logs = db.query(MedicalRecordAccessLog).filter(
        MedicalRecordAccessLog.global_patient_id == gp.id
    ).order_by(MedicalRecordAccessLog.accessed_at.desc()).limit(100).all()

    results = []
    for l in logs:
        u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
        results.append(MedicalAccessLogOut(
            id=l.id,
            user_id=l.user_id,
            user_name=u.full_name if u else "Healthcare Personnel",
            hospital_id=l.hospital_id,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            action=l.action,
            ip_address=l.ip_address,
            accessed_at=l.accessed_at
        ))
    return results

# ----------------- SECTION 6: Patient Profile Dashboard -----------------
@app.get("/api/v1/patient/profile", response_model=PatientProfileOut)
def get_patient_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patient accounts can access personal patient profile.")

    account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
    if not account or not account.global_patient:
        raise HTTPException(status_code=404, detail="Global patient profile not found.")

    gp = account.global_patient
    registered_hospitals = [link.hospital.name for link in gp.hospital_links if link.hospital and link.is_active]
    primary_hosp = db.query(Hospital).filter(Hospital.id == account.primary_hospital_id).first() if account.primary_hospital_id else None

    return PatientProfileOut(
        grn=gp.grn,
        full_name=gp.full_name,
        date_of_birth=gp.date_of_birth,
        gender=gp.gender,
        phone=gp.phone,
        email=gp.email,
        blood_group=gp.blood_group,
        emergency_contact=gp.emergency_contact,
        primary_hospital_code=primary_hosp.code if primary_hosp else user.hospital_id,
        primary_hospital_name=primary_hosp.name if primary_hosp else None,
        registered_hospitals=registered_hospitals
    )

# ----------------- Summary & Operational Metrics -----------------
@app.get("/api/v1/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "super_admin":
        return {
            "hospitals": db.query(Hospital).count(),
            "active_hospitals": db.query(Hospital).filter(Hospital.is_active.is_(True)).count(),
            "patients": db.query(GlobalPatient).count(),
            "doctors": db.query(Doctor).count(),
            "staff": db.query(User).filter(User.role.notin_(["super_admin", "patient"])).count(),
            "treatments": db.query(Treatment).count(),
            "active_treatments": db.query(Treatment).filter(Treatment.status.in_(["In Progress", "Scheduled", "active"])).count(),
            "attachments": db.query(TreatmentAttachment).count(),
            "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0),
        }

    hospital = user.hospital_id
    if not hospital:
        raise HTTPException(status_code=403, detail="No hospital is assigned.")

    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        gp_id = account.global_patient_id if account else -1
        return {
            "hospitals": db.query(PatientHospitalLink).filter(PatientHospitalLink.global_patient_id == gp_id).count(),
            "active_treatments": db.query(Treatment).filter(Treatment.global_patient_id == gp_id, Treatment.status.in_(["In Progress", "active"])).count(),
            "total_treatments": db.query(Treatment).filter(Treatment.global_patient_id == gp_id).count(),
            "prescriptions": db.query(Prescription).filter(Prescription.global_patient_id == gp_id).count(),
            "attachments": db.query(TreatmentAttachment).filter(TreatmentAttachment.global_patient_id == gp_id).count(),
            "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0),
        }

    return {
        "hospitals": 1,
        "patients": db.query(GlobalPatient).count(),
        "doctors": db.query(Doctor).filter(Doctor.hospital_id == hospital).count(),
        "staff": db.query(User).filter(User.hospital_id == hospital, User.role.notin_(["patient"])).count(),
        "appointments": db.query(Appointment).filter(Appointment.hospital_id == hospital).count(),
        "treatments": db.query(Treatment).filter(Treatment.hospital_id == hospital).count(),
        "active_treatments": db.query(Treatment).filter(Treatment.hospital_id == hospital, Treatment.status.in_(["In Progress", "active"])).count(),
        "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(Invoice.hospital_id == hospital).scalar() or 0),
    }

# ----------------- Legacy CRUD Fallbacks -----------------
@app.get("/api/v1/patients", response_model=list[PatientOut])
def get_patients(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "patient":
        return db.query(Patient).filter(Patient.email == user.email).all()
    if user.role == "super_admin":
        return db.query(Patient).all()
    return db.query(Patient).filter(Patient.hospital_id == user.hospital_id).all()

@app.post("/api/v1/patients", response_model=PatientOut, status_code=201)
def create_patient_legacy(payload: PatientCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse"))):
    hosp = user.hospital_id or "HOSP-001"
    p = Patient(**payload.model_dump(), hospital_id=hosp)
    db.add(p); db.commit(); db.refresh(p)
    return p

@app.get("/api/v1/doctors", response_model=list[DoctorOut])
def get_doctors(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "super_admin":
        return db.query(Doctor).all()
    return db.query(Doctor).filter(Doctor.hospital_id == user.hospital_id).all()

@app.post("/api/v1/doctors", response_model=DoctorOut, status_code=201)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    d = Doctor(**payload.model_dump(), hospital_id=hosp, is_active=True)
    db.add(d); db.commit(); db.refresh(d)
    return d

@app.get("/api/v1/appointments", response_model=list[AppointmentOut])
def get_appointments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "super_admin":
        return db.query(Appointment).all()
    if user.role == "patient":
        p = db.query(Patient).filter(Patient.email == user.email).first()
        pid = p.id if p else -1
        return db.query(Appointment).filter(Appointment.patient_id == pid).all()
    return db.query(Appointment).filter(Appointment.hospital_id == user.hospital_id).all()

@app.post("/api/v1/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    hosp = user.hospital_id or "HOSP-001"
    ap = Appointment(**payload.model_dump(), hospital_id=hosp)
    db.add(ap); db.commit(); db.refresh(ap)
    return ap

@app.get("/api/v1/prescriptions", response_model=list[PrescriptionOut])
def get_prescriptions(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        gp_id = account.global_patient_id if account else -1
        return db.query(Prescription).filter(Prescription.global_patient_id == gp_id).all()
    if user.role == "super_admin":
        return db.query(Prescription).all()
    return db.query(Prescription).filter(Prescription.hospital_id == user.hospital_id).all()

@app.get("/api/v1/lab-reports", response_model=list[LabReportOut])
def get_lab_reports(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "patient":
        p = db.query(Patient).filter(Patient.email == user.email).first()
        pid = p.id if p else -1
        return db.query(LabReport).filter(LabReport.patient_id == pid).all()
    if user.role == "super_admin":
        return db.query(LabReport).all()
    return db.query(LabReport).filter(LabReport.hospital_id == user.hospital_id).all()

@app.get("/api/v1/invoices", response_model=list[InvoiceOut])
def get_invoices(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "patient":
        p = db.query(Patient).filter(Patient.email == user.email).first()
        pid = p.id if p else -1
        return db.query(Invoice).filter(Invoice.patient_id == pid).all()
    if user.role == "super_admin":
        return db.query(Invoice).all()
    return db.query(Invoice).filter(Invoice.hospital_id == user.hospital_id).all()

@app.post("/api/v1/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("billing_staff", "hospital_admin", "super_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    inv = Invoice(**payload.model_dump(), hospital_id=hosp)
    db.add(inv); db.commit(); db.refresh(inv)
    return inv
