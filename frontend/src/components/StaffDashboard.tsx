import React, { FormEvent, useEffect, useState } from "react";
import { Summary } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  HeartPulse,
  LogOut,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

export function StaffDashboard() {
  const { user, logout, apiFetch } = useAuth();
  const role = user?.role || "doctor";
  const hospitalCode = user?.hospital_id || "HOSP-001";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [module, setModule] = useState("Overview");
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const roleTitle = role.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Allowed modules by role
  const modules =
    role === "hospital_admin"
      ? ["Overview", "Patients", "Doctors", "Appointments", "Treatments", "Lab Reports", "Prescriptions", "Invoices"]
      : role === "doctor"
      ? ["Overview", "Patients", "Appointments", "Treatments", "Lab Reports", "Prescriptions"]
      : role === "nurse"
      ? ["Overview", "Patients", "Appointments"]
      : role === "lab_technician"
      ? ["Overview", "Patients", "Lab Reports"]
      : role === "pharmacist"
      ? ["Overview", "Prescriptions"]
      : role === "billing_staff"
      ? ["Overview", "Invoices"]
      : ["Overview", "Patients", "Appointments"];

  const endpoints: Record<string, string> = {
    Patients: "patients",
    Doctors: "doctors",
    Appointments: "appointments",
    Treatments: "treatments",
    "Lab Reports": "lab-reports",
    Prescriptions: "prescriptions",
    Invoices: "invoices",
  };

  const fields: Record<string, string[]> = {
    Patients: ["patient_code", "full_name", "gender", "phone", "email", "blood_group"],
    Doctors: ["full_name", "specialization", "phone", "email"],
    Appointments: ["patient_id", "doctor_id", "scheduled_at", "reason"],
    Treatments: ["treatment_code", "patient_id", "doctor_id", "diagnosis", "description", "start_date"],
    "Lab Reports": ["patient_id", "test_name", "result", "report_date"],
    Prescriptions: ["patient_id", "doctor_id", "medication", "dosage", "instructions", "prescribed_date"],
    Invoices: ["patient_id", "description", "amount", "invoice_date"],
  };

  const defaults: Record<string, Record<string, string>> = {
    Patients: {
      patient_code: "PT" + Date.now().toString().slice(-8),
      full_name: "",
      gender: "Male",
      phone: "",
      email: "",
      blood_group: "O+",
    },
    Doctors: { full_name: "", specialization: "General Medicine", phone: "", email: "" },
    Appointments: {
      patient_id: "1",
      doctor_id: "1",
      scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      reason: "",
    },
    Treatments: {
      treatment_code: "TRT" + Date.now().toString().slice(-8),
      patient_id: "1",
      doctor_id: "1",
      diagnosis: "",
      description: "",
      start_date: new Date().toISOString().slice(0, 10),
    },
    "Lab Reports": {
      patient_id: "1",
      test_name: "",
      result: "",
      report_date: new Date().toISOString().slice(0, 10),
    },
    Prescriptions: {
      patient_id: "1",
      doctor_id: "1",
      medication: "",
      dosage: "",
      instructions: "",
      prescribed_date: new Date().toISOString().slice(0, 10),
    },
    Invoices: {
      patient_id: "1",
      description: "",
      amount: "1000",
      invoice_date: new Date().toISOString().slice(0, 10),
    },
  };

  useEffect(() => {
    apiFetch("/api/v1/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!endpoints[module]) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    apiFetch(`/api/v1/${endpoints[module]}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Failed to load data.");
        return d;
      })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [module]);

  const createItem = async (e: FormEvent) => {
    e.preventDefault();
    const endpoint = endpoints[module];
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const body: any = {};
    for (const [k, v] of form.entries()) {
      body[k] = v;
    }
    ["patient_id", "doctor_id", "amount"].forEach((k) => {
      if (body[k] !== undefined) body[k] = Number(body[k]);
    });

    try {
      const res = await apiFetch(`/api/v1/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Creation failed.");

      setNotice(`${module.slice(0, -1)} recorded successfully.`);
      setShowForm(false);
      const res2 = await apiFetch(`/api/v1/${endpoint}`);
      setItems(await res2.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save record.");
    }
  };

  const cards = [
    ["Patients", summary?.patients ?? "—", Users],
    ["Doctors", summary?.doctors ?? "—", Stethoscope],
    ["Appointments", summary?.appointments ?? "—", Activity],
    ["Active Treatments", summary?.active_treatments ?? "—", ClipboardList],
  ];

  const filtered = items.filter((it) =>
    JSON.stringify(it).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo side-logo">
          <span>X7</span>
          <div>
            <b>MEDICORE</b>
            <small>HEALTHCARE OS</small>
          </div>
        </div>

        <div className="hospital-tag-side">
          <Building2 size={14} />
          <span>Facility: {hospitalCode}</span>
        </div>

        <div className="nav-label">WORKSPACE MODULES</div>

        {modules.map((m) => (
          <button
            className={`nav-button ${module === m ? "active" : ""}`}
            onClick={() => {
              setModule(m);
              setShowForm(false);
              setNotice("");
            }}
            key={m}
          >
            {m === "Patients" ? (
              <Users size={17} />
            ) : m === "Doctors" ? (
              <Stethoscope size={17} />
            ) : m === "Appointments" ? (
              <Activity size={17} />
            ) : m === "Treatments" ? (
              <ClipboardList size={17} />
            ) : m === "Prescriptions" ? (
              <Pill size={17} />
            ) : m === "Invoices" ? (
              <FileText size={17} />
            ) : (
              <HeartPulse size={17} />
            )}{" "}
            {m}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="avatar-chip">
              {user?.full_name ? user.full_name[0] : "U"}
            </div>
            <div>
              <strong>{user?.full_name}</strong>
              <small>{roleTitle}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              X7 MEDICORE / {hospitalCode} &bull; {roleTitle.toUpperCase()}
            </span>
            <h1>{module === "Overview" ? `${roleTitle} Workspace` : module}</h1>
          </div>

          <div className="top-user-pill">
            <Building2 size={16} />
            <div className="user-info-text">
              <b>{user?.full_name}</b>
              <small>{hospitalCode}</small>
            </div>
          </div>
        </header>

        {module === "Overview" ? (
          <div className="overview-container">
            <section className="welcome-card staff-welcome">
              <div>
                <span className="eyebrow">AUTHORIZED CLINICAL CONSOLE</span>
                <h2>Welcome back, {user?.full_name}</h2>
                <p>
                  You are signed into <strong>{hospitalCode}</strong>. Manage medical records, scheduled appointments, and patient care workflows.
                </p>
              </div>
              <HeartPulse size={48} className="banner-art" />
            </section>

            <section className="stats-row">
              {cards.map(([label, value, Icon]: any) => (
                <article className="stat-card" key={label}>
                  <div>
                    <span>{label}</span>
                    <Icon size={20} />
                  </div>
                  <strong>{value}</strong>
                  <small>Hospital database summary</small>
                </article>
              ))}
              <article className="stat-card">
                <div>
                  <span>Total Invoiced</span>
                  <FileText size={20} />
                </div>
                <strong>₹{Number(summary?.invoices_total || 0).toLocaleString("en-IN")}</strong>
                <small>Facility billing</small>
              </article>
            </section>

            <section className="panel-box">
              <div className="panel-header">
                <div>
                  <h2>Department Operations</h2>
                  <p>Open any functional module to review or record entries.</p>
                </div>
              </div>
              <div className="module-buttons-grid">
                {modules
                  .filter((x) => x !== "Overview")
                  .map((m) => (
                    <button
                      className="module-card-btn"
                      onClick={() => setModule(m)}
                      key={m}
                    >
                      <span className="btn-icon">
                        <Activity size={18} />
                      </span>
                      <div className="btn-text">
                        <b>{m}</b>
                        <small>Access records & entries</small>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="panel-box data-panel">
            <div className="panel-header">
              <div>
                <h2>{module} Records</h2>
                <p>Authorized entries belonging to {hospitalCode}.</p>
              </div>

              <div className="header-actions">
                <div className="table-search-box">
                  <Search size={16} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search records…"
                  />
                </div>

                {/* Add New Button for authorized roles */}
                {role !== "billing_staff" || module === "Invoices" ? (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowForm(!showForm);
                      setError("");
                    }}
                  >
                    <Plus size={16} /> Record New {module.slice(0, -1)}
                  </button>
                ) : null}
              </div>
            </div>

            {notice && <div className="alert-message success">{notice}</div>}
            {error && <div className="alert-message error">{error}</div>}

            {/* Create Form */}
            {showForm && (
              <form className="record-entry-form" onSubmit={createItem}>
                <h3>Create New {module.slice(0, -1)}</h3>
                <div className="form-grid">
                  {(fields[module] || []).map((field) => (
                    <div className="form-field" key={field}>
                      <label>{field.replaceAll("_", " ")}</label>
                      <input
                        name={field}
                        type={
                          ["patient_id", "doctor_id", "amount"].includes(field)
                            ? "number"
                            : field.includes("date") || field === "scheduled_at"
                            ? "datetime-local"
                            : "text"
                        }
                        defaultValue={defaults[module]?.[field] || ""}
                        required={
                          ![
                            "phone",
                            "email",
                            "address",
                            "description",
                            "instructions",
                            "reason",
                            "gender",
                            "blood_group",
                          ].includes(field)
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="form-actions-bar">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Record
                  </button>
                </div>
              </form>
            )}

            {/* Records Table */}
            {loading ? (
              <p className="empty-message">Loading records from {hospitalCode}…</p>
            ) : filtered.length === 0 ? (
              <p className="empty-message">No records found. Record a new entry or try another search.</p>
            ) : (
              <div className="table-responsive">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      {Object.keys(filtered[0])
                        .filter((k) => !["hospital_id"].includes(k))
                        .map((k) => (
                          <th key={k}>{k.replaceAll("_", " ")}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={item.id || i}>
                        {Object.keys(item)
                          .filter((k) => k !== "hospital_id")
                          .map((k) => (
                            <td key={k}>{String(item[k] ?? "—")}</td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
