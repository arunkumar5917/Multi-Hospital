# X7 MediCore HMS — Multi-Hospital Global Patient Identity & Complete Medical History Management

A production-grade, enterprise-ready Multi-Hospital Healthcare Management System featuring centralized **Global Patient Identity (GRN)**, multi-facility clinical history aggregation, private diagnostic scan storage, auditable treatments and prescriptions, Argon2id security, Alembic migrations, and role-based access control (RBAC).

---

## Key Features

1. **Global Patient Registration Number (GRN)**:
   - Concurrency-safe, sequential auto-generation of permanent patient identity numbers (e.g. `XM-GRN-000001`).
   - Central database storage in PostgreSQL / SQLite; never creates duplicate GRNs for registered patients.
   - Dual authentication for patients: registered email **or** GRN + secure password.
   - Global patient search across all affiliated network hospitals by GRN, full name, phone number, and local code.

2. **Centralized Multi-Hospital Medical History**:
   - Unified cross-facility clinical records linking GRN, patient, hospital, doctor, diagnoses, past surgeries, chronic illnesses, and known allergies.
   - Dated historical versions and append-only clinical event timeline preserving original records.
   - Interactive chronological timeline across all patient visits at any network hospital.

3. **New Treatment Management**:
   - Comprehensive clinical encounter recording for doctors and clinical staff.
   - Fields: auto-generated Treatment ID (e.g. `TRT-2026-0001`), patient GRN, facility, doctor, visit timestamp, chief complaint, symptoms, clinical observations, diagnosis, treatment description, procedures performed, dynamic prescriptions list, follow-up instructions, next appointment date, and status (`Scheduled`, `In Progress`, `Completed`, `Follow-up Required`, `Referred`, `Cancelled`).
   - Automatically writes to the patient's centralized medical history and logs access audit trails.

4. **Past Treatment History & Audit Trail**:
   - Chronological review of all previous treatments with facility tags and doctor specializations.
   - Read-only historical records with auditable clinical correction/observation notes.

5. **Diagnostic Scans & Medical Document Upload**:
   - Upload and attach medical files to specific treatments and GRNs (JPG, PNG, PDF, DICOM up to 20MB).
   - Categories: `X-ray`, `MRI`, `CT Scan`, `Ultrasound`, `Blood Test Report`, `Prescription`, `Discharge Summary`, `Medical Certificate`, `Clinical Photograph`, `Other Medical Documents`.
   - Private file storage in `backend/storage/attachments/` with secure preview and streaming download.

6. **Unified Patient Health Portal**:
   - Permanent GRN passport card with one-click clipboard copy.
   - Chronic conditions and drug allergy warning badges.
   - Comprehensive multi-hospital chronological medical timeline with category filters.
   - Diagnostic scans and lab reports visual gallery with image previews and PDF viewers.
   - Connected hospital network and cross-hospital consent status.

7. **Cross-Hospital Linking & Consent Management**:
   - Clinicians can look up patients from other network facilities and record cross-hospital consent.
   - Full HIPAA-compliant access audit logging for all medical record views and downloads.

8. **Security & RBAC**:
   - Multi-tenant hospital isolation with separate portals (`/`, `/hospital-admin/login`, `/login`, `/super-admin/login`).
   - Argon2id password hashing via `pwdlib[argon2]`.
   - Brute-force rate limiting (5 consecutive failures = 15-minute lockout).

---

## Architecture & Technology Stack

- **Frontend**: React 18, TypeScript, Vite, React Router 6, Lucide React
- **Backend**: Python 3.11+ / FastAPI, Pydantic v2, PyJWT, Argon2, python-multipart
- **Database**: PostgreSQL / SQLite (with auto-detection via `DATABASE_URL`)
- **ORM & Migrations**: SQLAlchemy 2.0 + Alembic
- **Private Storage**: Secure local/cloud private directory for scans and reports

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

### Run System Verification Test Suite

```bash
# Run the 18-point comprehensive verification test suite
backend/.venv/bin/python backend/test_suite.py
```

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
| **Patient 1** | HOSP-001 & HOSP-002 | `patient@x7medicore.local` **or** `XM-GRN-000001` | `/login?tab=patient` |
| **Patient 2** | HOSP-002 | `patient2@x7medicore.local` **or** `XM-GRN-000002` | `/login?tab=patient` |

---

## 3. Registered Demo Hospitals

| Hospital Code | Facility Name | Location | Status |
|---|---|---|---|
| `HOSP-001` | X7 City Central Hospital | Chennai, Tamil Nadu | **Active** |
| `HOSP-002` | X7 Memorial Specialty Hospital | Bengaluru, Karnataka | **Active** |
| `HOSP-003` | X7 Metro Healthcare Clinic | Hyderabad, Telangana | **Active** |

---

## 4. API Endpoints Overview

### Global Patient Identity & Registration
- `POST /api/v1/patients/register` — Register a new patient and generate a unique permanent GRN.
- `GET /api/v1/patients/search?query=...` — Search across all hospitals by GRN, name, or phone.
- `GET /api/v1/patients/{grn}` — Fetch global patient profile and linkage status.
- `GET /api/v1/patients/{grn}/hospitals` — List affiliated hospitals for a patient.
- `POST /api/v1/patients/{grn}/link-hospital` — Cross-link a patient to a new hospital with consent.

### Centralized Medical History & Timeline
- `GET /api/v1/patients/{grn}/medical-history` — Complete conditions, allergies, and diagnoses.
- `GET /api/v1/patients/{grn}/medical-history/timeline` — Chronological unified timeline.
- `POST /api/v1/patients/{grn}/conditions` — Add chronic condition.
- `POST /api/v1/patients/{grn}/allergies` — Document drug or environmental allergy.

### Treatments & Prescriptions
- `POST /api/v1/treatments` — Record clinical treatment encounter with dynamic prescriptions.
- `GET /api/v1/treatments` — List authorized treatments (filters by hospital/patient).
- `GET /api/v1/treatments/{id}` — Full clinical treatment details.
- `PATCH /api/v1/treatments/{id}` — Update treatment with auditable reason.
- `POST /api/v1/treatments/{id}/notes` — Append clinical observation note.

### Diagnostic Scans & Attachments
- `POST /api/v1/treatments/{id}/documents` — Upload medical scan/document (multipart form).
- `POST /api/v1/treatments/{id}/attachments` — Legacy upload endpoint for attachments.
- `GET /api/v1/documents/{id}` — Secure streaming file download/preview.
- `DELETE /api/v1/documents/{id}` — Delete medical document with permission check.
- `GET /api/v1/patients/{grn}/documents` — All patient scans and documents gallery.

### Patient Profile, Health Analysis & QR Passport
- `GET /api/v1/patients/me` — Retrieve logged-in patient's full biodata and insurance.
- `PATCH /api/v1/patients/me` — Update patient demographics and insurance coverage.
- `POST /api/v1/patients/{grn}/photo` — Upload and update patient profile picture.
- `GET /api/v1/patients/{grn}/photo` — Retrieve streaming patient profile photo.
- `GET /api/v1/patients/{grn}/health-analysis` — Full health analysis, vitals trends & lab reports with reference ranges.
- `POST /api/v1/patients/{grn}/vitals` — Log vital signs (BP, pulse, temp, SpO2, weight, height, BMI).
- `GET /api/v1/patients/{grn}/family-contacts` — List family and emergency contacts.
- `POST /api/v1/patients/{grn}/family-contacts` — Register new family contact.
- `DELETE /api/v1/family-contacts/{id}` — Remove family contact.
- `GET /api/v1/patients/{grn}/qr-code` — Generate crisp vector SVG QR code for permanent patient GRN.

### Consents & Audit Trail
- `GET /api/v1/patients/{grn}/consents` — List active patient data-sharing consents.
- `POST /api/v1/patients/{grn}/consents` — Record patient consent update.
- `GET /api/v1/patients/{grn}/access-logs` — Audit log of clinicians who accessed this record.
