# Multi-Hospital Management System (X7 MediCore HMS)

## Overview

A secure, enterprise-grade, and scalable **Multi-Hospital Management System** designed to govern and federate multiple healthcare facilities through a centralized cloud platform.

The system delivers seamless hospital registration, staff onboarding, role-based authentication, unified patient health records with permanent Global Registration Numbers (**GRN**), cross-facility profile sharing, and strict hospital-level data isolation.

**Main Architecture Principle:**
```text
One Patient  ➔  One Permanent GRN  ➔  Complete Medical History  ➔  Multiple Hospitals
```

---

## Key Features

### 1. Super Admin
- **Register and Manage Hospitals**: Onboard new medical facilities, edit hospital details, and configure facility codes.
- **Approve or Reject Hospital Registrations**: Multi-step verification workflow with instant approval/rejection state controls.
- **Create Hospital Admin Accounts**: Provision initial hospital administrative accounts directly from the command center.
- **Monitor Hospital Activities**: Complete immutable audit trail of authentication events, patient record access, and security logs.
- **Manage Hospital Activation Status**: Real-time activation toggle (`Online` / `Offline`) with automatic patient record synchronization.
- **Federated Patient Sharing**: One-click intelligence synchronization sharing patient profiles across all active network hospitals.

### 2. Hospital Admin
- **Manage Hospital Information**: Update contact numbers, addresses, and official communications.
- **Add & Manage Doctors**: Maintain clinical credentials, specializations, and OPD consultation schedules.
- **Register Nurses & Healthcare Staff**: Individual staff onboarding with unique employee codes (e.g. `EMP-GANGA-0001`).
- **Create Employee Accounts**: Provision access credentials with auto-generated Employee IDs and departmental assignments.
- **Manage Departments**: Configure clinical departments (Cardiology, Orthopedics, Neurology, Pediatrics, Emergency, etc.).
- **Send Staff Invitation Emails**: Generate secure tokenized invitation links (`/activate?token=...`) allowing staff to activate passwords.
- **Account Activation Control**: Instantly activate, suspend, or update permissions for any staff member in the facility.

### 3. Staff Management
- **Individual Staff Login Accounts**: Dedicated credentials for each clinical and administrative employee.
- **Unique Employee IDs**: Standardized identifiers per hospital (e.g. `EMP-HOSP-0001`, `EMP-GANGA-0001`).
- **Department Assignments**: Specialty assignments with granular access scoping.
- **Role-Based Permissions**: Strictly enforced access rights matching clinical duties.
- **Secure Password Activation**: Self-service invitation acceptance with token verification and initial password setting.
- **Staff Lifecycle Management**: Real-time deactivation, status updates, and audit logging.

---

## Role-Based Access Matrix

| Role | Access Scope | Clinical & Operational Capabilities |
|---|---|---|
| **Super Admin** | All hospitals | Full platform governance, hospital approvals, admin creation, global audit logs |
| **Hospital Admin** | Own hospital | Hospital settings, staff onboarding, department configuration, facility reports |
| **Doctor** | Authorized patient records | Clinical diagnosis, treatments, protocols, prescriptions, lab orders, break-glass |
| **Nurse** | Assigned patients | Vital signs recording, nursing care notes, medication administration |
| **Lab Technician** | Laboratory module | Diagnostic test orders, lab investigations, report file uploads |
| **Pharmacist** | Pharmacy module | Prescription fulfillment, medication dispensing, allergy conflict checks |
| **Receptionist** | Front desk & OPD | Patient registration, central GRN search, appointments, queue management |
| **Billing Staff** | Billing module | Invoice generation, payment receipts, insurance clearance |
| **Other Staff** | Assigned permissions | Departmental administration, operational support, task management |
| **Patient** | Personal health record | Centralized medical history, vitals tracking, prescriptions, consent control |

---

## Authentication & Security

- **JWT Authentication**: Stateless, cryptographically signed Bearer tokens with configurable expiration.
- **Secure Password Hashing**: Multi-pass hashing (Argon2 / bcrypt) protecting all passwords.
- **Role-Based Access Control (RBAC)**: Enforced both at API route dependency level and UI client navigation.
- **Hospital-Level Data Isolation**: Multi-tenant database design ensuring staff view only their authorized hospital domain.
- **Permanent GRN Patient Passport**: Concurrency-safe sequence generation (e.g. `XM-GRN-000001`) preventing duplication.
- **Email Verification & Invitation Tokens**: Time-limited cryptographic tokens for staff onboarding (`/activate?token=...`).
- **Emergency Break-Glass Workflow**: Emergency clinical access override with mandatory justification and high-priority logging.
- **Comprehensive Audit Trails**: Immutable access tracking for HIPAA compliance (`AuthenticationAuditLog`, `MedicalRecordAccessLog`).

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Styling** | Modern Glassmorphism CSS, Tailwind utilities, Lucide React icons |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2 |
| **ORM & Database** | SQLAlchemy 2.0, PostgreSQL (Production) / SQLite (Local Dev) |
| **Database Migrations** | Alembic |
| **Authentication** | PyJWT, Argon2 / bcrypt |
| **Storage** | Secure encrypted local/cloud private directory for diagnostic scans & DICOM files |

---

## System Architecture

```text
                           SUPER ADMIN
                                |
                     Hospital Registration
                                |
                     Approval & Verification
                                |
                     Hospital Admin Account
                                |
                     Invitation Token / Email
                                |
                    HOSPITAL ADMIN DASHBOARD
                                |
                 +--------------+--------------+
                 |                             |
      Staff Onboarding & Invites      Department Management
                 |                             |
   +-------------+-------------+      (Cardiology, Ortho, ICU...)
   |             |             |
 Doctor        Nurse      Other Staff (Lab / Pharmacy / Reception)
   |             |             |
   +-------------+-------------+
                 |
        Secure Authentication
                 |
   Role-Based Protected Workspace
                 |
   +-------------+-------------+
   |                           |
Hospital Isolation    Centralized Patient GRN
   |                  (Cross-Hospital History)
   +-------------+-------------+
                 |
            PostgreSQL
```

---

## Project Structure

```text
hospital-management-system/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccountActivation.tsx       # Staff password activation (/activate)
│   │   │   ├── CentralizedPatientProfile.tsx# Central patient passport & medical history
│   │   │   ├── LoginForm.tsx               # Hospital & role selection sign-in form
│   │   │   ├── PatientDashboard.tsx        # Self-service patient health portal
│   │   │   ├── PatientProfilePhoto.tsx     # Client-compressed photo uploader
│   │   │   ├── ProtectedRoute.tsx          # Client-side RBAC guard
│   │   │   ├── StaffDashboard.tsx          # Clinician, Staff & Hospital Admin workspace
│   │   │   └── SuperAdminDashboard.tsx     # Federation governance & hospital approval
│   │   ├── context/
│   │   │   └── AuthContext.tsx             # JWT session state & token refreshment
│   │   ├── types.ts                        # TypeScript interfaces & domain models
│   │   ├── App.tsx                         # Client router & navigation config
│   │   └── main.tsx                        # React application entry
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py                         # FastAPI app & REST endpoint definitions
│   │   ├── models.py                       # SQLAlchemy ORM models
│   │   ├── schemas.py                      # Pydantic v2 request/response schemas
│   │   ├── database.py                     # Database engine & sessionmaker
│   │   ├── security.py                     # Password hashing & JWT generation
│   │   └── seed_data.py                    # Multi-hospital initial seed dataset
│   ├── storage/
│   │   ├── attachments/                    # Private diagnostic scans & reports
│   │   └── patient_photos/                 # Patient profile pictures
│   ├── test_suite.py                       # 24-point automated verification suite
│   ├── alembic/                            # Database migration files
│   └── requirements.txt                    # Python dependencies
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Installation & Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL (or local SQLite fallback)
- Git

### 1. Clone Repository

```bash
git clone https://github.com/arunkumar5917/Multi-Hospital.git
cd Multi-Hospital
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hospital_db
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=60
REFRESH_TOKEN_DAYS=7
FRONTEND_URL=http://localhost:5173
```

*(If `DATABASE_URL` is omitted, the application automatically defaults to `sqlite:///./hospital.db` for instant local execution).*

### 4. Database Initialization & Migrations

```bash
alembic upgrade head
```

### 5. Start Backend Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Backend API: `http://localhost:8000`
- Interactive OpenAPI Documentation (Swagger UI): `http://localhost:8000/docs`

### 6. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```

- Frontend Web Application: `http://localhost:5173`

---

## Run Automated Test Suite

The system includes a comprehensive automated test suite verifying all 24 core architectural capabilities:

```bash
backend/.venv/bin/python backend/test_suite.py
```

Expected result:
```text
=====================================================================
  ALL 24 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! (100% OK)     
=====================================================================
```

---

## Demo Credentials & Portals

**Universal Demo Password:** `ChangeMe123!`

| Role | Facility | Identifier (Email or GRN) | Portal Route |
|---|---|---|---|
| **Super Admin** | Platform Federation | `superadmin@x7medicore.local` | `/super-admin/login` |
| **Hospital Admin** | GANGA (Coimbatore) | `hospitaladmin@x7medicore.local` | `/hospital-admin/login` |
| **Hospital Admin** | HOSP-001 (Chennai) | `admin.chennai@x7medicore.local` | `/hospital-admin/login` |
| **Hospital Admin** | HOSP-002 (Bengaluru) | `admin.bengaluru@x7medicore.local` | `/hospital-admin/login` |
| **Doctor** | GANGA (Coimbatore) | `doctor@x7medicore.local` | `/login` |
| **Doctor** | HOSP-002 (Bengaluru) | `doctor.priya@x7medicore.local` | `/login` |
| **Nurse** | GANGA (Coimbatore) | `nurse@x7medicore.local` | `/login` |
| **Lab Technician** | GANGA (Coimbatore) | `lab@x7medicore.local` | `/login` |
| **Pharmacist** | GANGA (Coimbatore) | `pharmacy@x7medicore.local` | `/login` |
| **Receptionist** | GANGA (Coimbatore) | `receptionist@x7medicore.local` | `/login` |
| **Billing Staff** | GANGA (Coimbatore) | `billing@x7medicore.local` | `/login` |
| **Patient 1** | Cross-Facility Network | `patient@x7medicore.local` **or** `XM-GRN-000001` | `/login?tab=patient` |
| **Patient 2** | Cross-Facility Network | `patient2@x7medicore.local` **or** `XM-GRN-000002` | `/login?tab=patient` |

---

## Registered Facilities in Network

| Code | Facility Name | City & State | Status | Patient Profiles |
|---|---|---|---|---|
| `GANGA` | Ganga Multiple Hospital | Coimbatore, Tamil Nadu | **Approved & Active** | All 31 Profiles Shared |
| `HOSP-001` | X7 City Central Hospital | Chennai, Tamil Nadu | **Approved & Active** | All 31 Profiles Shared |
| `HOSP-002` | X7 Memorial Specialty Hospital | Bengaluru, Karnataka | **Approved & Active** | All 31 Profiles Shared |
| `HOSP-003` | X7 Metro Healthcare Clinic | Hyderabad, Telangana | **Approved & Active** | All 31 Profiles Shared |

---

## API Module Documentation

### 1. Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/login` — Sign in via email or permanent GRN with password and target portal.
- `POST /api/v1/auth/refresh` — Issue fresh access token using refresh token.
- `POST /api/v1/auth/forgot-password` — Generate password reset token.
- `POST /api/v1/auth/reset-password` — Set new password using reset token.

### 2. Hospitals Management (`/api/v1/hospitals`)
- `GET /api/v1/hospitals` — List all registered network hospitals.
- `POST /api/v1/hospitals` — Super Admin registers new hospital facility (auto-shares patient profiles).
- `GET /api/v1/hospitals/{id}` — Retrieve facility details by ID or Code.
- `PATCH /api/v1/hospitals/{id}` — Update hospital metadata.
- `PATCH /api/v1/hospitals/{id}/status` — Super Admin approves, rejects, or toggles active status.
- `POST /api/v1/hospitals/{id}/admin` — Super Admin provisions a dedicated Hospital Admin account.
- `POST /api/v1/hospitals/{code}/sync-patients` — Synchronize all patient records to facility.
- `POST /api/v1/network/sync-all-patients` — Multi-facility patient intelligence synchronization.

### 3. Staff & Onboarding (`/api/v1/staff`)
- `GET /api/v1/staff` — List staff members filtered by hospital, role, or department.
- `POST /api/v1/staff` — Onboard clinician with auto-generated Employee ID (`EMP-HOSP-0001`).
- `GET /api/v1/staff/{id}` — Get employee details and departmental assignments.
- `PATCH /api/v1/staff/{id}` — Update staff information, role, or active status.
- `DELETE /api/v1/staff/{id}` — Deactivate employee access credentials.

### 4. Staff Invitations (`/api/v1/invitations`)
- `POST /api/v1/invitations` — Generate secure tokenized staff invitation link.
- `GET /api/v1/invitations/{token}` — Verify validity of activation link.
- `POST /api/v1/invitations/activate` — Staff member accepts invite and sets password.

### 5. Hospital Departments (`/api/v1/departments`)
- `GET /api/v1/departments` — List active departments (optionally filtered by facility).
- `POST /api/v1/departments` — Create department (e.g. Cardiology, Orthopedics).
- `PATCH /api/v1/departments/{id}` — Update department head or description.
- `DELETE /api/v1/departments/{id}` — Deactivate department.

### 6. Patients & Central Identity (`/api/v1/patients`)
- `POST /api/v1/patients/register` — Register new patient and auto-generate unique permanent GRN.
- `GET /api/v1/patients/search?query=...` — Search across network by GRN, name, or phone.
- `GET /api/v1/patients/{grn}/profile` — Fetch complete centralized patient medical profile.
- `PATCH /api/v1/patients/{grn}/profile` — Update demographics, insurance, and contact info.
- `POST /api/v1/patients/{grn}/photo` — Upload patient photo with 2MB limit.
- `GET /api/v1/patients/{grn}/photo` — Stream photo or fallback to clean vector avatar.
- `GET /api/v1/patients/{grn}/health-analysis` — Vitals trends and lab investigation reports.
- `POST /api/v1/patients/{grn}/vitals` — Record vitals (BP, Heart Rate, Pulse, Temp, SpO2, BMI).
- `GET /api/v1/patients/{grn}/medical-history/timeline` — Chronological unified medical timeline.
- `GET /api/v1/patients/{grn}/hospital-visits` — Aggregated visit summary across network facilities.
- `POST /api/v1/patients/{grn}/break-glass-access` — Emergency clinician access override.

### 7. Roles & Access Matrix (`/api/v1/roles`)
- `GET /api/v1/roles` — Returns complete RBAC matrix with descriptions and granted permissions.

### 8. System & Security Audit (`/api/v1/audit`)
- `GET /api/v1/audit` — Immutable log trail of logins, status changes, and administrative actions.

---

## License

Proprietary enterprise software developed by **XORA Technologies**. All rights reserved.
