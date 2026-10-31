import { Activity, ShieldCheck, Lock, Sparkles, Database } from "lucide-react";

export function BrandShowcasePanel() {
  return (
    <aside className="login-brand-panel" aria-label="XORA Technologies Overview">
      {/* Primary Pure-White Logo Container */}
      <div className="brand-logo-card">
        <img
          src="/xora_logo.svg"
          alt="XORA Technologies"
          className="brand-xora-hero-logo"
          onError={(e) => {
            // Fallback to high-resolution PNG if SVG rendering is restricted
            const img = e.currentTarget;
            if (img.src.indexOf(".svg") !== -1) {
              img.src = "/xora_logo.png";
            }
          }}
        />
      </div>

      <div className="brand-panel-body">
        <div className="brand-badge-pill">
          <Sparkles size={13} />
          <span>TECHNOLOGY PLATFORM</span>
        </div>

        <h3 className="brand-panel-title">Unified Multi-Hospital Medical Intelligence</h3>

        <p className="brand-panel-desc">
          XORA Technologies powers enterprise healthcare networks with permanent patient
          identities, persistent centralized medical histories, and institutional governance.
        </p>

        <div className="brand-feature-stack">
          <div className="brand-feature-row">
            <div className="brand-feat-icon pink">
              <Activity size={18} />
            </div>
            <div className="brand-feat-text">
              <strong>Permanent Patient Identity (GRN)</strong>
              <p>One permanent registration number connects records across every network branch.</p>
            </div>
          </div>

          <div className="brand-feature-row">
            <div className="brand-feat-icon navy">
              <Database size={18} />
            </div>
            <div className="brand-feat-text">
              <strong>PostgreSQL Centralized Core</strong>
              <p>Immutable medical history, clinical diagnoses, vitals, lab results & prescriptions.</p>
            </div>
          </div>

          <div className="brand-feature-row">
            <div className="brand-feat-icon teal">
              <ShieldCheck size={18} />
            </div>
            <div className="brand-feat-text">
              <strong>Institutional Access & Privacy</strong>
              <p>Strict role-based isolation, 256-bit encryption, and audit-logged clinical records.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="brand-panel-foot">
        <div className="brand-foot-system">
          <span className="system-pill">X7 MediCore HMS</span>
          <span className="dot-sep">&bull;</span>
          <span className="version-label">v2.4 Enterprise</span>
        </div>
        <div className="brand-foot-corp">
          <span>Engineered by <strong>XORA Technologies</strong></span>
        </div>
      </div>
    </aside>
  );
}
