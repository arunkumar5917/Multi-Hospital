# X7 MediCore HMS — Final-Year Project MVP

A runnable full-stack Hospital Management System starter with:
- Separate Super Admin, Hospital Admin, and general-user login routes
- FastAPI + SQLAlchemy + PostgreSQL backend
- React + TypeScript + Vite frontend
- Patient, doctor, appointment, treatment, lab report, prescription, invoice, and dashboard modules
- Role-aware navigation and API authorization
- Docker Compose for PostgreSQL
- Demo seed data and API documentation

> This is an educational MVP, not a production-ready clinical system. Use synthetic data only. It does not include certified medical-device features, real payment processing, production-grade consent workflows, or a real blockchain network.

## Architecture
- `frontend/`: React/TypeScript UI
- `backend/app/`: FastAPI routes, models, schemas, security, and database setup
- PostgreSQL: configured through `DATABASE_URL`
- REST API docs: `/docs`

## 1. Requirements
- Python 3.11+
- Node.js 20+
- Docker Desktop (recommended for PostgreSQL), or an existing PostgreSQL server

## 2. Start PostgreSQL
From the project root:
```bash
docker compose up -d db
```

PostgreSQL development credentials are in `docker-compose.yml`. Change them before any deployment.

## 3. Start the backend
Windows PowerShell:
```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

macOS/Linux:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

The app creates the tables and development demo users at startup. It seeds sample patients/doctors/appointments only when the database is empty.

## 4. Start the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## Demo accounts
Password for all demo accounts: `ChangeMe123!`

| Portal | Email |
|---|---|
| Super Admin | `superadmin@x7medicore.local` |
| Hospital Admin | `hospitaladmin@x7medicore.local` |
| Doctor | `doctor@x7medicore.local` |
| Patient | `patient@x7medicore.local` |
| Nurse | `nurse@x7medicore.local` |
| Lab Technician | `lab@x7medicore.local` |
| Pharmacist | `pharmacy@x7medicore.local` |
| Billing Staff | `billing@x7medicore.local` |

These accounts and the default database password are for local demonstration only. Do not deploy with them.

## 5. Separate login URLs
- `http://localhost:5173/super-admin/login`
- `http://localhost:5173/hospital-admin/login`
- `http://localhost:5173/login` (general users)

Additional role routes include `/doctor/dashboard`, `/patient/dashboard`, `/staff/dashboard`, `/lab/dashboard`, `/pharmacy/dashboard`, and `/billing/dashboard`.

## 6. API endpoints
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/dashboard/summary`
- CRUD endpoints for `/api/v1/patients`, `/doctors`, `/appointments`, `/treatments`, `/lab-reports`, `/prescriptions`, `/invoices`
- `GET /api/v1/health`

All protected routes require `Authorization: Bearer <token>`.

## Implementation plan
### Phase 1 — Foundation
1. Start PostgreSQL and configure `.env`.
2. Verify `/api/v1/health` and `/docs`.
3. Test the three portal login routes.
4. Confirm role restrictions work server-side.

### Phase 2 — Core hospital workflows
1. Register and search patients.
2. Create doctor records.
3. Book appointments and update status.
4. Create treatment episodes and notes.
5. Add lab reports, prescriptions, and invoices.

### Phase 3 — Improve and validate
1. Add pagination, filters, field-level permissions, and stronger validation.
2. Add automated tests for authentication and CRUD endpoints.
3. Add Alembic migrations instead of `create_all`.
4. Add private object storage for documents.
5. Add consent-aware hospital transfer and audit-event review.
6. Add a verifiable health-passport proof service only after core workflows work.

## Security and production gaps
- For production, replace localStorage JWT storage with secure HttpOnly cookie sessions or another reviewed session strategy.
- Add MFA, password reset, email verification, rate limiting, session revocation, backups, malware scanning, formal audit retention, and security testing.
- Scope all clinical queries to hospital membership and treatment relationships.
- Replace demo seed accounts and all secrets.
- Complete privacy/compliance assessment for the actual deployment.
- Never use real patient information in the college demo.
