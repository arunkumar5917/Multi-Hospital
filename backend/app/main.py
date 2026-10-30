import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import jwt
from jwt import InvalidTokenError

from .database import Base, engine, get_db, SessionLocal
from .models import (
    Hospital, User, UserHospitalMembership, GlobalPatient, PatientAccount,
    PasswordResetToken, UserSession, LoginAttempt, AuthenticationAuditLog,
    Patient, Doctor, Appointment, Treatment, LabReport, Prescription, Invoice
)
from .schemas import (
    HospitalCreate, HospitalUpdate, HospitalOut,
    LoginRequest, LoginResponse, RefreshTokenRequest, ForgotPasswordRequest,
    ForgotPasswordResponse, ResetPasswordRequest, AuditLogOut, PatientProfileOut,
    UserOut, PatientCreate, PatientOut, DoctorCreate, DoctorOut,
    AppointmentCreate, AppointmentOut, TreatmentCreate, TreatmentOut,
    LabReportCreate, LabReportOut, PrescriptionCreate, PrescriptionOut,
    InvoiceCreate, InvoiceOut
)
from .security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    generate_reset_token, JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS
)

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="X7 MediCore HMS API",
    version="2.0.0",
    description="Multi-Hospital Enterprise Healthcare Management & Authentication System"
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
    "general": {"doctor", "nurse", "lab_technician", "pharmacist", "billing_staff", "patient"}
}

def seed_demo_data():
    with SessionLocal() as db:
        # 1. Seed Multi-Hospital Network
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

        # 2. Seed Global Patients (Permanent GRN)
        gp1 = db.query(GlobalPatient).filter(GlobalPatient.grn == "XM-GRN-000001").first()
        if not gp1:
            gp1 = GlobalPatient(
                grn="XM-GRN-000001", full_name="Arun Kumar", date_of_birth=date(1996, 8, 15),
                gender="Male", phone="+91 98765 43210", email="patient@x7medicore.local",
                blood_group="O+", address="Demo Address, Chennai, Tamil Nadu",
                emergency_contact="Emergency Family (+91 98765 43200)"
            )
            db.add(gp1)
            db.commit()
            db.refresh(gp1)

        gp2 = db.query(GlobalPatient).filter(GlobalPatient.grn == "XM-GRN-000002").first()
        if not gp2:
            gp2 = GlobalPatient(
                grn="XM-GRN-000002", full_name="Meena Rani", date_of_birth=date(1999, 4, 20),
                gender="Female", phone="+91 90000 00002", email="patient2@x7medicore.local",
                blood_group="A+", address="45 MG Road, Bengaluru, Karnataka",
                emergency_contact="Guardian (+91 90000 00011)"
            )
            db.add(gp2)
            db.commit()
            db.refresh(gp2)

        # 3. Seed Demo Users
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
                db.add(u)
                db.commit()
                db.refresh(u)
            created_users[email] = u

            # Create UserHospitalMembership
            if hosp_code and hosp_code in hospital_map:
                h_obj = hospital_map[hosp_code]
                mem = db.query(UserHospitalMembership).filter(
                    UserHospitalMembership.user_id == u.id,
                    UserHospitalMembership.hospital_id == h_obj.id
                ).first()
                if not mem:
                    db.add(UserHospitalMembership(user_id=u.id, hospital_id=h_obj.id, role=role, is_active=True))
                    db.commit()

        # Link Patient Accounts to Global Patients
        pat_u1 = created_users.get("patient@x7medicore.local")
        if pat_u1:
            pa1 = db.query(PatientAccount).filter(PatientAccount.user_id == pat_u1.id).first()
            if not pa1 and gp1:
                db.add(PatientAccount(user_id=pat_u1.id, global_patient_id=gp1.id, primary_hospital_id=hospital_map["HOSP-001"].id))
                db.commit()

        pat_u2 = created_users.get("patient2@x7medicore.local")
        if pat_u2:
            pa2 = db.query(PatientAccount).filter(PatientAccount.user_id == pat_u2.id).first()
            if not pa2 and gp2:
                db.add(PatientAccount(user_id=pat_u2.id, global_patient_id=gp2.id, primary_hospital_id=hospital_map["HOSP-002"].id))
                db.commit()

        # 4. Seed Clinical Records
        if db.query(Patient).count() == 0:
            p1 = Patient(
                patient_code="XM-GRN-000001", full_name="Arun Kumar", date_of_birth=date(1996, 8, 15),
                gender="Male", phone="+91 98765 43210", email="patient@x7medicore.local",
                address="Demo address, Chennai", blood_group="O+", emergency_contact="Family contact",
                hospital_id="HOSP-001"
            )
            p2 = Patient(
                patient_code="XM-GRN-000002", full_name="Meena Rani", date_of_birth=date(1999, 4, 20),
                gender="Female", phone="+91 90000 00002", email="patient2@x7medicore.local",
                address="MG Road, Bengaluru", blood_group="A+", emergency_contact="Guardian",
                hospital_id="HOSP-002"
            )
            db.add_all([p1, p2])
            db.commit()

        if db.query(Doctor).count() == 0:
            db.add_all([
                Doctor(full_name="Dr. Kumar", specialization="General Medicine", phone="+91 90000 10001",
                       email="doctor@x7medicore.local", hospital_id="HOSP-001"),
                Doctor(full_name="Dr. Priya", specialization="Cardiology", phone="+91 90000 10002",
                       email="doctor.priya@x7medicore.local", hospital_id="HOSP-002")
            ])
            db.commit()

        if db.query(Appointment).count() == 0:
            patient = db.query(Patient).filter(Patient.hospital_id == "HOSP-001").first()
            doctor = db.query(Doctor).filter(Doctor.hospital_id == "HOSP-001").first()
            if patient and doctor:
                db.add(Appointment(
                    patient_id=patient.id, doctor_id=doctor.id,
                    scheduled_at=datetime.now() + timedelta(days=1, hours=2),
                    reason="Comprehensive Health Checkup", status="scheduled", hospital_id="HOSP-001"
                ))
                db.commit()

        if db.query(Treatment).count() == 0:
            patient = db.query(Patient).filter(Patient.hospital_id == "HOSP-001").first()
            doctor = db.query(Doctor).filter(Doctor.hospital_id == "HOSP-001").first()
            if patient and doctor:
                db.add(Treatment(
                    treatment_code="TRT2026001", patient_id=patient.id, doctor_id=doctor.id,
                    diagnosis="Seasonal Respiratory Infection", description="Mild viral pharyngitis with standard recovery plan",
                    start_date=date.today(), status="active", hospital_id="HOSP-001"
                ))
                db.commit()

        if db.query(Prescription).count() == 0:
            patient = db.query(Patient).filter(Patient.hospital_id == "HOSP-001").first()
            doctor = db.query(Doctor).filter(Doctor.hospital_id == "HOSP-001").first()
            if patient and doctor:
                db.add(Prescription(
                    patient_id=patient.id, doctor_id=doctor.id,
                    medication="Amoxicillin 500mg", dosage="1 tablet twice daily after meals",
                    instructions="Complete full 5-day course with plenty of fluids",
                    prescribed_date=date.today(), status="active", hospital_id="HOSP-001"
                ))
                db.commit()

        if db.query(LabReport).count() == 0:
            patient = db.query(Patient).filter(Patient.hospital_id == "HOSP-001").first()
            if patient:
                db.add(LabReport(
                    patient_id=patient.id, test_name="Complete Blood Count (CBC)",
                    result="Hemoglobin: 14.2 g/dL (Normal). WBC: 7,400/mcL. Platelets: 280,000/mcL. All parameters within normal ranges.",
                    report_date=date.today(), status="completed", hospital_id="HOSP-001"
                ))
                db.commit()

        if db.query(Invoice).count() == 0:
            patient = db.query(Patient).filter(Patient.hospital_id == "HOSP-001").first()
            if patient:
                db.add(Invoice(
                    patient_id=patient.id, description="Outpatient Consultation & Laboratory Diagnostics",
                    amount=1250.00, status="unpaid", invoice_date=date.today(), hospital_id="HOSP-001"
                ))
                db.commit()

seed_demo_data()

# ----------------- Dependencies & Current User -----------------
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        claims = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
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

def get_client_ip(request: Request) -> str:
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

# ----------------- Public Hospital Endpoints -----------------
@app.get("/")
def root():
    return {
        "name": "X7 MediCore HMS API",
        "version": "2.0.0",
        "status": "operational",
        "authentication": "Multi-Hospital JWT & GRN Architecture",
        "docs": "/docs"
    }

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/v1/hospitals", response_model=list[HospitalOut])
def list_hospitals(
    include_inactive: bool = Query(False, description="Include inactive hospitals (Super Admin only)"),
    db: Session = Depends(get_db)
):
    """Retrieve hospitals dynamically from the database. Default returns only active hospitals."""
    query = db.query(Hospital)
    if not include_inactive:
        query = query.filter(Hospital.is_active.is_(True))
    return query.order_by(Hospital.name.asc()).all()

@app.post("/api/v1/hospitals", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("super_admin")),
    request: Request = None
):
    """Super Admin: Register a new hospital."""
    existing = db.query(Hospital).filter(Hospital.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Hospital with code '{payload.code}' already exists.")

    hospital = Hospital(
        code=payload.code.upper().strip(),
        name=payload.name.strip(),
        location=payload.location.strip(),
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        logo_url=payload.logo_url,
        is_active=payload.is_active
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)

    log_audit(db, "HOSPITAL_CREATED", user_id=admin.id, hospital_code=hospital.code,
              ip_address=get_client_ip(request), details=f"Super Admin registered hospital {hospital.name} ({hospital.code})")
    return hospital

@app.patch("/api/v1/hospitals/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("super_admin")),
    request: Request = None
):
    """Super Admin: Update hospital details or toggle active/inactive status."""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(hospital, field, val)

    db.commit()
    db.refresh(hospital)

    log_audit(db, "HOSPITAL_UPDATED", user_id=admin.id, hospital_code=hospital.code,
              ip_address=get_client_ip(request), details=f"Updated hospital {hospital.code}: {list(update_data.keys())}")
    return hospital

# ----------------- Authentication Endpoints -----------------
@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user across Super Admin, Hospital Admin, or Doctor/Staff/Patient portals.
    Validates hospital assignment, active status, and rate limits.
    """
    client_ip = get_client_ip(request)
    identifier = (payload.identifier or payload.email or "").strip()
    portal = payload.portal.strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Email address or GRN is required.")
    if portal not in PORTAL_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid login portal '{portal}'.")

    # 1. Rate Limiting Check (Temporary lockout: 5 failed attempts in 15 mins)
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

    # 2. Account Resolution: Support Email OR Patient GRN
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
            # Check if identifier matches a patient code or GRN directly
            gp = db.query(GlobalPatient).filter(GlobalPatient.grn == identifier.upper()).first()
            if gp:
                account = db.query(PatientAccount).filter(PatientAccount.global_patient_id == gp.id).first()
                if account:
                    user = db.query(User).filter(User.id == account.user_id).first()

    # 3. Verify Credentials
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        db.add(LoginAttempt(identifier=identifier.lower(), ip_address=client_ip, success=False, attempted_at=datetime.utcnow()))
        db.commit()
        log_audit(db, "LOGIN_FAILED", user_id=user.id if user else None, hospital_code=payload.hospital_code,
                  ip_address=client_ip, details=f"Failed login attempt for {identifier} on portal {portal}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/GRN or password.")

    # 4. Portal Authorization
    if portal == "super_admin":
        if user.role != "super_admin":
            log_audit(db, "PORTAL_MISMATCH", user_id=user.id, ip_address=client_ip,
                      details=f"Non-super-admin user {user.email} attempted Super Admin portal login")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Super Admin credentials required.")
    else:
        if user.role == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin accounts must sign in via the dedicated Super Admin portal (/super-admin/login)."
            )
        if portal == "hospital_admin" and user.role != "hospital_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is not authorized as a Hospital Administrator.")
        if portal == "general" and user.role not in PORTAL_ROLES["general"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please use your dedicated portal to sign in.")

    # 5. Hospital Validation (Mandatory for non-Super Admin)
    hospital_name = None
    hospital_code = payload.hospital_code

    if user.role != "super_admin":
        if not hospital_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital selection is required to sign in.")

        hospital = db.query(Hospital).filter(Hospital.code == hospital_code).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The selected hospital was not found.")
        if not hospital.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{hospital.name} is currently inactive or under scheduled maintenance. Please contact support."
            )
        hospital_name = hospital.name

        # Verify Account Hospital Membership
        has_membership = (user.hospital_id == hospital_code)
        if not has_membership:
            mem = db.query(UserHospitalMembership).filter(
                UserHospitalMembership.user_id == user.id,
                UserHospitalMembership.hospital_id == hospital.id,
                UserHospitalMembership.is_active.is_(True)
            ).first()
            if mem:
                has_membership = True

        if not has_membership:
            log_audit(db, "HOSPITAL_MISMATCH", user_id=user.id, hospital_code=hospital_code,
                      ip_address=client_ip, details=f"User {user.email} attempted login with unauthorized hospital {hospital_code}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your account is not registered with {hospital.name}. Please select your assigned hospital."
            )

    # 6. Resolve Patient GRN
    grn = None
    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        if account and account.global_patient:
            grn = account.global_patient.grn

    # 7. Record Successful Attempt & Create Session
    db.add(LoginAttempt(identifier=identifier.lower(), ip_address=client_ip, success=True, attempted_at=datetime.utcnow()))
    access_token = create_access_token(user.id, user.role, hospital_id=hospital_code, grn=grn)
    refresh_token = create_refresh_token()

    session_days = 30 if payload.remember_me else REFRESH_TOKEN_DAYS
    session_expiry = datetime.utcnow() + timedelta(days=session_days)

    db.add(UserSession(
        user_id=user.id,
        refresh_token=refresh_token,
        user_agent=request.headers.get("User-Agent"),
        ip_address=client_ip,
        expires_at=session_expiry,
        is_revoked=False
    ))
    db.commit()

    log_audit(db, "LOGIN_SUCCESS", user_id=user.id, hospital_code=hospital_code,
              ip_address=client_ip, details=f"User {user.email} signed in via {portal} portal")

    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        hospital_id=hospital_code or user.hospital_id,
        grn=grn
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_out,
        dashboard_path=DASHBOARDS.get(user.role, "/login"),
        hospital_code=hospital_code,
        hospital_name=hospital_name,
        grn=grn
    )

@app.post("/api/v1/auth/refresh")
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
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

    new_access_token = create_access_token(user.id, user.role, hospital_id=user.hospital_id, grn=grn)
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_MINUTES * 60
    }

@app.post("/api/v1/auth/logout")
def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db)
):
    """Revoke user active sessions and record audit log."""
    client_ip = get_client_ip(request)
    if credentials:
        try:
            claims = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = int(claims["sub"])
            # Revoke sessions for this user
            db.query(UserSession).filter(UserSession.user_id == user_id).update({"is_revoked": True})
            db.commit()
            log_audit(db, "LOGOUT", user_id=user_id, ip_address=client_ip, details="User successfully logged out")
        except Exception:
            pass
    return {"message": "Session terminated successfully."}

@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get authenticated user identity and details."""
    grn = None
    if user.role == "patient":
        account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
        if account and account.global_patient:
            grn = account.global_patient.grn

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        hospital_id=user.hospital_id,
        grn=grn
    )

@app.post("/api/v1/auth/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Generate a single-use expiring password reset token for registered account."""
    client_ip = get_client_ip(request)
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
        db.add(PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=expires,
            is_used=False
        ))
        db.commit()
        log_audit(db, "PASSWORD_RESET_REQUEST", user_id=user.id, ip_address=client_ip,
                  details=f"Password reset token issued for {user.email}")

    return ForgotPasswordResponse(
        message="If your account exists and is active, password reset instructions have been issued.",
        reset_token=reset_token
    )

@app.post("/api/v1/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Verify single-use token and update account password."""
    client_ip = get_client_ip(request)
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.is_used.is_(False),
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid, already used, or expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    user.password_hash = hash_password(payload.new_password)
    token_record.is_used = True
    # Revoke all current sessions on password change
    db.query(UserSession).filter(UserSession.user_id == user.id).update({"is_revoked": True})
    db.commit()

    log_audit(db, "PASSWORD_RESET_SUCCESS", user_id=user.id, ip_address=client_ip,
              details=f"Password reset completed for {user.email}")
    return {"message": "Password updated successfully. You can now log in with your new password."}

# ----------------- Super Admin & Audit Logs -----------------
@app.get("/api/v1/admin/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("super_admin"))
):
    """Super Admin: Review authentication audit logs across all hospitals."""
    return db.query(AuthenticationAuditLog).order_by(AuthenticationAuditLog.created_at.desc()).limit(limit).all()

# ----------------- Patient Profile & Identity -----------------
@app.get("/api/v1/patient/profile", response_model=PatientProfileOut)
def get_patient_profile(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Retrieve permanent Global Registration Number (GRN) and medical profile."""
    if user.role != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only patient accounts can access patient profiles.")

    account = db.query(PatientAccount).filter(PatientAccount.user_id == user.id).first()
    if not account or not account.global_patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global patient profile not found.")

    gp = account.global_patient
    hosp = db.query(Hospital).filter(Hospital.id == account.primary_hospital_id).first() if account.primary_hospital_id else None

    return PatientProfileOut(
        grn=gp.grn,
        full_name=gp.full_name,
        date_of_birth=gp.date_of_birth,
        gender=gp.gender,
        phone=gp.phone,
        email=gp.email,
        blood_group=gp.blood_group,
        emergency_contact=gp.emergency_contact,
        primary_hospital_code=hosp.code if hosp else user.hospital_id,
        primary_hospital_name=hosp.name if hosp else None
    )

# ----------------- Scoped Healthcare Operations & Dashboards -----------------
@app.get("/api/v1/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Return dashboard operational metrics scoped by role and hospital."""
    if user.role == "super_admin":
        return {
            "hospitals": db.query(Hospital).count(),
            "active_hospitals": db.query(Hospital).filter(Hospital.is_active.is_(True)).count(),
            "patients": db.query(GlobalPatient).count(),
            "doctors": db.query(Doctor).count(),
            "staff": db.query(User).filter(User.role.notin_(["super_admin", "patient"])).count(),
            "appointments": db.query(Appointment).count(),
            "active_treatments": db.query(Treatment).filter(Treatment.status == "active").count(),
            "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).scalar() or 0),
        }

    hospital = user.hospital_id
    if not hospital:
        raise HTTPException(status_code=403, detail="No hospital is assigned to this account.")

    if user.role == "patient":
        # Scoped to the specific patient
        p = db.query(Patient).filter(Patient.email == user.email).first()
        patient_id = p.id if p else -1
        return {
            "hospitals": 1,
            "appointments": db.query(Appointment).filter(Appointment.patient_id == patient_id).count(),
            "active_treatments": db.query(Treatment).filter(Treatment.patient_id == patient_id, Treatment.status == "active").count(),
            "prescriptions": db.query(Prescription).filter(Prescription.patient_id == patient_id).count(),
            "lab_reports": db.query(LabReport).filter(LabReport.patient_id == patient_id).count(),
            "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(Invoice.patient_id == patient_id).scalar() or 0),
        }

    # Hospital Admin / Doctor / Staff metrics scoped to hospital
    return {
        "hospitals": 1,
        "patients": db.query(Patient).filter(Patient.hospital_id == hospital).count(),
        "doctors": db.query(Doctor).filter(Doctor.hospital_id == hospital).count(),
        "staff": db.query(User).filter(User.hospital_id == hospital, User.role.notin_(["patient"])).count(),
        "appointments": db.query(Appointment).filter(Appointment.hospital_id == hospital).count(),
        "active_treatments": db.query(Treatment).filter(Treatment.hospital_id == hospital, Treatment.status == "active").count(),
        "invoices_total": float(db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(Invoice.hospital_id == hospital).scalar() or 0),
    }

def scoped_patient_filter(query, model, user: User, db: Session):
    if user.role == "super_admin":
        return query
    if user.role == "patient":
        p = db.query(Patient).filter(Patient.email == user.email).first()
        pid = p.id if p else -1
        return query.filter(model.patient_id == pid)
    # Hospital admin & staff scoped by hospital
    return query.filter(model.hospital_id == user.hospital_id)

# CRUD Endpoints
@app.get("/api/v1/patients", response_model=list[PatientOut])
def get_patients(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "patient":
        return db.query(Patient).filter(Patient.email == user.email).all()
    if user.role == "super_admin":
        return db.query(Patient).all()
    return db.query(Patient).filter(Patient.hospital_id == user.hospital_id).all()

@app.post("/api/v1/patients", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("super_admin", "hospital_admin", "doctor", "nurse"))):
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
    q = db.query(Appointment)
    return scoped_patient_filter(q, Appointment, user, db).all()

@app.post("/api/v1/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    hosp = user.hospital_id or "HOSP-001"
    ap = Appointment(**payload.model_dump(), hospital_id=hosp)
    db.add(ap); db.commit(); db.refresh(ap)
    return ap

@app.get("/api/v1/treatments", response_model=list[TreatmentOut])
def get_treatments(db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = db.query(Treatment)
    return scoped_patient_filter(q, Treatment, user, db).all()

@app.post("/api/v1/treatments", response_model=TreatmentOut, status_code=201)
def create_treatment(payload: TreatmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor", "hospital_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    tr = Treatment(**payload.model_dump(), hospital_id=hosp)
    db.add(tr); db.commit(); db.refresh(tr)
    return tr

@app.get("/api/v1/lab-reports", response_model=list[LabReportOut])
def get_lab_reports(db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = db.query(LabReport)
    return scoped_patient_filter(q, LabReport, user, db).all()

@app.post("/api/v1/lab-reports", response_model=LabReportOut, status_code=201)
def create_lab_report(payload: LabReportCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("lab_technician", "doctor", "hospital_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    lr = LabReport(**payload.model_dump(), hospital_id=hosp)
    db.add(lr); db.commit(); db.refresh(lr)
    return lr

@app.get("/api/v1/prescriptions", response_model=list[PrescriptionOut])
def get_prescriptions(db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = db.query(Prescription)
    return scoped_patient_filter(q, Prescription, user, db).all()

@app.post("/api/v1/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor", "hospital_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    pr = Prescription(**payload.model_dump(), hospital_id=hosp)
    db.add(pr); db.commit(); db.refresh(pr)
    return pr

@app.get("/api/v1/invoices", response_model=list[InvoiceOut])
def get_invoices(db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = db.query(Invoice)
    return scoped_patient_filter(q, Invoice, user, db).all()

@app.post("/api/v1/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("billing_staff", "hospital_admin"))):
    hosp = user.hospital_id or "HOSP-001"
    inv = Invoice(**payload.model_dump(), hospital_id=hosp)
    db.add(inv); db.commit(); db.refresh(inv)
    return inv
