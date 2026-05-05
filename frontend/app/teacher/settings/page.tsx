"use client";

import { useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { ChangePasswordModal } from "../../../components/auth/ChangePasswordModal";
import { useAuth } from "../../../hooks/useAuth";

export default function TeacherSettingsPage() {
  return (
    <RequireRole role="teacher">
      <TeacherSettings />
    </RequireRole>
  );
}

function TeacherSettings() {
  const { user } = useAuth();
  const [showPwModal, setShowPwModal] = useState(false);

  return (
    <>
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      <div className="pageHeader">
        <h1 className="pageTitle">Account Settings</h1>
      </div>

      {/* Profile card */}
      <div className="card" style={{ maxWidth: 520, marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.1rem", marginBottom: "1.25rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", fontWeight: 700, color: "#fff",
          }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? "T"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{user?.name ?? "—"}</div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{user?.email ?? "—"}</div>
            <span className="badge badge-success" style={{ marginTop: "0.35rem" }}>Teacher</span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
            <div style={{ color: "var(--color-muted)" }}>Role</div>
            <div style={{ fontWeight: 500 }}>Teacher</div>
            <div style={{ color: "var(--color-muted)" }}>Email</div>
            <div style={{ fontWeight: 500 }}>{user?.email ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Security section */}
      <div className="card" style={{ maxWidth: 520 }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Security
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: "0.2rem" }}>Password</div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>Update your login password</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPwModal(true)}>
            Change Password
          </button>
        </div>
      </div>
    </>
  );
}
