import { Hospital } from "../types";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Stethoscope,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Shield,
  HeartPulse,
} from "lucide-react";

interface PortalSelectorProps {
  hospital: Hospital;
  onChangeHospital: () => void;
}

export function PortalSelector({ hospital, onChangeHospital }: PortalSelectorProps) {
  const navigate = useNavigate();

  return (
    <div className="portal-selector-container">
      {/* Current Hospital Banner */}
      <div className="active-hospital-banner">
        <div className="banner-left">
          <div className="banner-icon">
            <Building2 size={24} />
          </div>
          <div>
            <span className="banner-tag">ACTIVE HOSPITAL SELECTION</span>
            <h3 className="banner-title">{hospital.name}</h3>
            <p className="banner-meta">
              Facility Code: <strong>{hospital.code}</strong> &bull; {hospital.location}
            </p>
          </div>
        </div>
        <button
          className="btn-outline-change"
          onClick={onChangeHospital}
          type="button"
          title="Change hospital selection"
        >
          <RefreshCw size={14} /> Change Hospital
        </button>
      </div>

      <div className="portal-intro">
        <h2>Choose Your Sign In Portal</h2>
        <p>Access your authorized hospital workspace with verified credentials.</p>
      </div>

      <div className="portal-cards-grid">
        {/* Portal 1: Hospital Admin */}
        <div
          className="portal-card-action admin-card"
          onClick={() => navigate("/hospital-admin/login")}
          role="button"
          tabIndex={0}
        >
          <div className="portal-card-top">
            <div className="portal-icon blue">
              <Building2 size={28} />
            </div>
            <span className="role-badge admin">Administrative</span>
          </div>
          <h3>Hospital Admin Portal</h3>
          <p>
            Exclusive entry for facility administrators and executives to manage clinical operations, staffing, and hospital departments.
          </p>
          <div className="portal-features">
            <span>✓ Staff & Doctor oversight</span>
            <span>✓ Operational analytics</span>
            <span>✓ Hospital department controls</span>
          </div>
          <Link to="/hospital-admin/login" className="portal-card-btn admin-btn">
            Sign In as Hospital Admin <ArrowRight size={16} />
          </Link>
        </div>

        {/* Portal 2: Doctors & Clinical Staff */}
        <div
          className="portal-card-action staff-card"
          onClick={() => navigate("/login")}
          role="button"
          tabIndex={0}
        >
          <div className="portal-card-top">
            <div className="portal-icon teal">
              <Stethoscope size={28} />
            </div>
            <span className="role-badge staff">Clinical & Operations</span>
          </div>
          <h3>Doctors & Staff Portal</h3>
          <p>
            Dedicated workspace for Doctors, Nurses, Lab Technicians, Pharmacists, and Billing Staff at {hospital.name}.
          </p>
          <div className="portal-features">
            <span>✓ Electronic Medical Records</span>
            <span>✓ Appointments & Treatments</span>
            <span>✓ Diagnostic Labs & Pharmacy</span>
          </div>
          <Link to="/login" className="portal-card-btn staff-btn">
            Sign In as Doctor / Staff <ArrowRight size={16} />
          </Link>
        </div>

        {/* Portal 3: Patient Portal */}
        <div
          className="portal-card-action patient-card"
          onClick={() => navigate("/login?tab=patient")}
          role="button"
          tabIndex={0}
        >
          <div className="portal-card-top">
            <div className="portal-icon emerald">
              <HeartPulse size={28} />
            </div>
            <span className="role-badge patient">Patient Care</span>
          </div>
          <h3>Patient Portal</h3>
          <p>
            Patient access using registered email or permanent Global Registration Number (GRN) to view clinical history, prescriptions, and reports.
          </p>
          <div className="portal-features">
            <span>✓ Permanent GRN Identity</span>
            <span>✓ Test reports & Prescriptions</span>
            <span>✓ Upcoming Appointments</span>
          </div>
          <Link to="/login?tab=patient" className="portal-card-btn patient-btn">
            Sign In with Email or GRN <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="portal-footer-security">
        <Shield size={16} />
        <span>
          End-to-end encrypted session. Access is strictly audited and scoped to <strong>{hospital.name}</strong>.
        </span>
      </div>
    </div>
  );
}
