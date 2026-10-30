# X7 MediCore HMS — Advanced Multi-Hospital Login & Authentication System

A production-grade Multi-Hospital Healthcare Management System featuring federated multi-facility login, Global Registration Number (GRN) patient identity, Argon2id security, Alembic migrations, and role-based access control (RBAC).

---

## Key Features

1. **Hospital Selection First Step**:
   - The public entry page (`/`) requires hospital facility selection retrieved dynamically via FastAPI (`GET /api/v1/hospitals`).
   - Facility search by name, code (e.g. `HOSP-001`), and location.
   - Real-time active status validation prevents login to inactive/maintenance facilities.
2. **Dedicated Portals & Separate Login URLs**:
   - **Public Landing & Facility Selection**: `/`
   - **Hospital Admin Portal**: `/hospital-admin/login`
   - **Doctors, Staff & Patients Portal**: `/login` (with tabbed/GRN access)
   - **Super Admin Governance Console**: `/super-admin/login` (isolated; never exposed on public facility directory)
3. **Global Patient Identity System (GRN)**:
   - Permanent GRN (e.g., `XM-GRN-000001`) connects to global patient records across hospital visits.
   - Dual patient login: Registered email **or** permanent GRN + password.
   - Verified GRN badge and patient health passport view.
4. **Hardened Security & Rate Limiting**:
   - **Password Hashing**: Argon2id via `pwdlib[argon2]`.
   - **Brute-Force Protection**: 5 consecutive failed login attempts trigger a 15-minute account lockout.
   - **Single-Use Password Reset**: Expiring 30-minute recovery tokens with immediate session revocation.
   - **Audit Logs**: Platform-wide immutable audit trail (`authentication_audit_logs`).
   - **Hospital Membership Verification**: Rejects attempts to sign into unauthorized facilities.
5. **Database Migrations**:
   - Managed with **Alembic** (`backend/alembic/`).

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript, Vite, React Router 6, Lucide React
- **Backend**: Python 3.11+ / FastAPI, Pydantic v2, PyJWT, Argon2
- **Database**: PostgreSQL / SQLite (with auto-detection via `DATABASE_URL`)
- **ORM & Migrations**: SQLAlchemy 2.0 + Alembic

---

## 1. Quick Start

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- Web UI: `http://localhost:5173`

---

## 2. Demo User Credentials

**Universal Password for all demo accounts:** `ChangeMe123!`

| Role | Facility | Identifier (Email / GRN) | Portal Route |
|---|---|---|---|
| **Super Admin** | Network Federation | `superadmin@x7medicore.local` | `/super-admin/login` |
| **Hospital Admin** | HOSP-001 (Chennai) | `hospitaladmin@x7medicore.local` | `/hospital-admin/login` |
| **Hospital Admin** | HOSP-002 (Bengaluru) | `admin.bengaluru@x7medicore.local` | `/hospital-admin/login` |
| **Doctor** | HOSP-001 (Chennai) | `doctor@x7medicore.local` | `/login` |
| **Doctor** | HOSP-002 (Bengaluru) | `doctor.priya@x7medicore.local` | `/login` |
| **Nurse** | HOSP-001 (Chennai) | `nurse@x7medicore.local` | `/login` |
| **Lab Technician** | HOSP-001 (Chennai) | `lab@x7medicore.local` | `/login` |
| **Pharmacist** | HOSP-001 (Chennai) | `pharmacy@x7medicore.local` | `/login` |
| **Billing Staff** | HOSP-001 (Chennai) | `billing@x7medicore.local` | `/login` |
| **Patient 1** | HOSP-001 (Chennai) | `patient@x7medicore.local` **or** `XM-GRN-000001` | `/login?tab=patient` |
| **Patient 2** | HOSP-002 (Bengaluru) | `patient2@x7medicore.local` **or** `XM-GRN-000002` | `/login?tab=patient` |

---

## 3. Registered Demo Hospitals

| Hospital Code | Facility Name | Location | Status |
|---|---|---|---|
| `HOSP-001` | X7 City Central Hospital | Chennai, Tamil Nadu | **Active** |
| `HOSP-002` | X7 Memorial Specialty Hospital | Bengaluru, Karnataka | **Active** |
| `HOSP-003` | X7 Metro Healthcare Clinic | Hyderabad, Telangana | **Active** |
| `HOSP-004` | X7 Regional Care Center (Maintenance) | Coimbatore, Tamil Nadu | *Inactive / Maintenance* |

---

## 4. API Endpoints

### Hospitals & Federation
- `GET /api/v1/hospitals`: Public active facility list (or `?include_inactive=true` for Super Admin)
- `POST /api/v1/hospitals`: Super Admin registration of new facilities
- `PATCH /api/v1/hospitals/{id}`: Super Admin activate/deactivate facilities

### Authentication & Sessions
- `POST /api/v1/auth/login`: Multi-tenant login validating credentials, portal, and hospital code
- `POST /api/v1/auth/refresh`: Exchange refresh token for new access token
- `POST /api/v1/auth/logout`: Revoke active session
- `GET /api/v1/auth/me`: Current authenticated user identity
- `POST /api/v1/auth/forgot-password`: Generate single-use password recovery token
- `POST /api/v1/auth/reset-password`: Set new password using valid reset token

### Platform Governance & Clinical
- `GET /api/v1/admin/audit-logs`: Review security and auth audit logs (Super Admin only)
- `GET /api/v1/patient/profile`: Patient health profile and permanent GRN
- `GET /api/v1/dashboard/summary`: Role and hospital-scoped operational metrics
- CRUD endpoints: `/api/v1/patients`, `/doctors`, `/appointments`, `/treatments`, `/lab-reports`, `/prescriptions`, `/invoices`

---

## 5. Database Schema & Tables

- `hospitals`: Multi-facility network nodes
- `users`: Authenticated user identities and roles
- `user_hospital_memberships`: Facility membership mapping
- `global_patients`: Federated permanent GRN registries
- `patient_accounts`: Link between users and global patient identity
- `user_sessions`: Active refresh token sessions
- `login_attempts`: Rate limiting and lockout tracker
- `authentication_audit_logs`: Security audit logs
- `password_reset_tokens`: Expiring single-use reset tokens
- `patients`, `doctors`, `appointments`, `treatments`, `lab_reports`, `prescriptions`, `invoices`: Clinical models
