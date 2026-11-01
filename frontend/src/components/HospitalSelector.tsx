import React, { useEffect, useState } from "react";
import { Hospital } from "../types";
import { API_URL, useAuth } from "../context/AuthContext";
import { Building2, CheckCircle2, ChevronRight, MapPin, Search, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

interface HospitalSelectorProps {
  onHospitalSelected: (hospital: Hospital) => void;
}

export function HospitalSelector({ onHospitalSelected }: HospitalSelectorProps) {
  const { selectedHospital, setSelectedHospital } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChoice, setActiveChoice] = useState<Hospital | null>(selectedHospital);

  const fetchHospitals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/hospitals`);
      if (!res.ok) {
        throw new Error("Unable to fetch hospital directory from server.");
      }
      const data: Hospital[] = await res.json();
      setHospitals(data);
      // If there was a previously saved choice, verify it's still in the active list
      if (selectedHospital) {
        const matching = data.find((h) => h.code === selectedHospital.code);
        if (matching && matching.is_active) {
          setActiveChoice(matching);
        } else {
          setActiveChoice(null);
          setSelectedHospital(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hospital network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleContinue = () => {
    if (!activeChoice) return;
    setSelectedHospital(activeChoice);
    onHospitalSelected(activeChoice);
  };

  return (
    <div className="hospital-selector-container">
      <div className="selector-header">
        <div className="badge-pill secure-badge">
          <ShieldCheck size={14} /> Multi-Hospital Unified Access
        </div>
        <h2>Select Your Healthcare Facility</h2>
        <p className="subtitle">
          Choose your affiliated hospital to proceed to the authorized administrative, clinical, or patient portal.
        </p>
      </div>

      <div className="search-box-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by hospital name, city, or code (e.g. HOSP-001)..."
          className="hospital-search-input"
        />
        {search && (
          <button className="clear-search-btn" onClick={() => setSearch("")} type="button">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="alert-box error">
          <AlertCircle size={18} />
          <div>
            <strong>Connection Notice:</strong> {error}
          </div>
          <button className="retry-btn" onClick={fetchHospitals}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="hospital-loading-state">
          <div className="pulse-loader"></div>
          <p>Connecting to XORA Hospital Network Registry…</p>
        </div>
      ) : filteredHospitals.length === 0 ? (
        <div className="no-hospitals-found">
          <Building2 size={36} className="empty-icon" />
          <p>No active hospitals match &ldquo;{search}&rdquo;.</p>
          <small>Ensure the hospital is active or check spelling.</small>
        </div>
      ) : (
        <div className="hospital-grid">
          {filteredHospitals.map((h) => {
            const isSelected = activeChoice?.code === h.code;
            return (
              <div
                key={h.code}
                onClick={() => setActiveChoice(h)}
                className={`hospital-card ${isSelected ? "selected" : ""} ${!h.is_active ? "inactive" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveChoice(h)}
              >
                <div className="hospital-card-header">
                  <div className="hospital-avatar">
                    <Building2 size={24} />
                  </div>
                  <div className="hospital-code-badge">{h.code}</div>
                </div>

                <div className="hospital-details">
                  <h3 className="hospital-name">{h.name}</h3>
                  <div className="hospital-meta">
                    <span className="location">
                      <MapPin size={14} /> {h.location}
                    </span>
                    <span className="status-pill active">● Active Network</span>
                  </div>
                </div>

                <div className="selection-indicator">
                  {isSelected ? (
                    <span className="selected-tag">
                      <CheckCircle2 size={16} /> Selected
                    </span>
                  ) : (
                    <span className="select-prompt">Click to select</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Hospital Confirmation Card */}
      {activeChoice && (
        <div className="selected-confirmation-bar">
          <div className="selected-info">
            <span className="eyebrow-text">SELECTED FACILITY</span>
            <strong>{activeChoice.name}</strong>
            <span className="sub-meta">
              Code: {activeChoice.code} &bull; {activeChoice.location}
            </span>
          </div>
          <button className="btn-primary continue-btn" onClick={handleContinue} type="button">
            Continue to Portals <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

