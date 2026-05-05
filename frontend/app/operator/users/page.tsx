"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

type Toast = { type: "success" | "error"; text: string } | null;
type Tab = "all" | "student" | "teacher" | "operator";

const roleBadge: Record<string, string> = {
  student:  "badge-info",
  teacher:  "badge-success",
  operator: "badge-warning",
};

export default function OperatorUsersPage() {
  return (
    <RequireRole role="operator">
      <UsersContent />
    </RequireRole>
  );
}

function UsersContent() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState<Tab>("all");
  const [toast,   setToast]   = useState<Toast>(null);

  const [modal, setModal] = useState<"operator" | "user" | null>(null);
  const [form,  setForm]  = useState<any>({ name: "", email: "", password: "", role: "student", grade: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = (await api.getUsers()) as any[];
      setUsers(data ?? []);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchTab = tab === "all" || u.role === tab;
      const matchQ   = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [users, search, tab]);

  const counts = useMemo(() => ({
    all:      users.length,
    student:  users.filter((u) => u.role === "student").length,
    teacher:  users.filter((u) => u.role === "teacher").length,
    operator: users.filter((u) => u.role === "operator").length,
  }), [users]);

  const openOperator = () => { setForm({ name: "", email: "", password: "" }); setModal("operator"); };
  const openUser     = () => { setForm({ name: "", email: "", password: "", role: "student", grade: "" }); setModal("user"); };

  const createOperator = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createOperator({ name: form.name, email: form.email, password: form.password });
      showToast("success", `Operator "${form.name}" created.`);
      setModal(null);
      await refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to create operator");
    } finally { setSaving(false); }
  };

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.register({
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
        ...(form.role === "student" ? { grade: form.grade } : {}),
      });
      showToast("success", `${form.role === "teacher" ? "Teacher" : "Student"} "${form.name}" created.`);
      setModal(null);
      await refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to create user");
    } finally { setSaving(false); }
  };

  const deactivate = async (u: any) => {
    try {
      await api.deleteUser(u.id);
      showToast("success", `"${u.name}" deactivated.`);
      setConfirmDelete(null);
      await refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Deactivate failed");
    }
  };

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "all",      label: `All (${counts.all})` },
    { key: "student",  label: `Students (${counts.student})` },
    { key: "teacher",  label: `Teachers (${counts.teacher})` },
    { key: "operator", label: `Operators (${counts.operator})` },
  ];

  return (
    <>
      {toast && <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>{toast.text}</div>}

      <div className="pageHeader">
        <h1 className="pageTitle">Users</h1>
        <div className={styles.headerActions}>
          <button className={`btn btn-ghost ${styles.addUserBtn}`} onClick={openUser}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Student / Teacher
          </button>
          <button className={`btn btn-primary`} onClick={openOperator}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Operator
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button key={t.key} className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={`searchBar ${styles.search}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className={`card ${styles.tableCard}`}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: "2.5rem" }}>👥</span>
            <p>{search ? "No users match your search." : "No users in this group."}</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Reg ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{u.name?.charAt(0)?.toUpperCase()}</div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td><code className={styles.code}>{u.reg_id || "—"}</code></td>
                  <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{u.email}</td>
                  <td><span className={`badge ${roleBadge[u.role] ?? "badge-muted"}`}>{u.role}</span></td>
                  <td style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{u.grade || "—"}</td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    {u.is_active ? (
                      <button
                        className="btn btn-sm"
                        style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
                        onClick={() => setConfirmDelete(u)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Operator Modal */}
      {modal === "operator" && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>Add Operator</h2>
            <p className={styles.modalSubtitle}>Operators have full admin access.</p>
            <form onSubmit={createOperator} className={styles.form}>
              <div className="field">
                <label>Full Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" required />
              </div>
              <div className="field">
                <label>Email *</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@school.edu" required />
              </div>
              <div className="field">
                <label>Password *</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required />
              </div>
              <div className={styles.formActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Operator"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student/Teacher Modal */}
      {modal === "user" && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>Add {form.role === "teacher" ? "Teacher" : "Student"}</h2>
            <form onSubmit={createUser} className={styles.form}>
              <div className="field">
                <label>Role</label>
                <div className={styles.roleToggle}>
                  <button type="button" className={`${styles.roleBtn} ${form.role === "student" ? styles.roleBtnActive : ""}`} onClick={() => setForm({ ...form, role: "student" })}>Student</button>
                  <button type="button" className={`${styles.roleBtn} ${form.role === "teacher" ? styles.roleBtnActive : ""}`} onClick={() => setForm({ ...form, role: "teacher" })}>Teacher</button>
                </div>
              </div>
              <div className="field">
                <label>Full Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
              </div>
              <div className="field">
                <label>Email *</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@school.edu" required />
              </div>
              <div className="field">
                <label>Password *</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required />
              </div>
              {form.role === "student" && (
                <div className="field">
                  <label>Grade / Class *</label>
                  <input className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Grade 10A" required />
                </div>
              )}
              <div className={styles.formActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : `Create ${form.role === "teacher" ? "Teacher" : "Student"}`}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      {confirmDelete && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <h2>Deactivate User?</h2>
            <p style={{ color: "var(--color-muted)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--color-text)" }}>{confirmDelete.name}</strong> will be deactivated and unable to login.
            </p>
            <div className={styles.formActions} style={{ marginTop: "1.5rem" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deactivate(confirmDelete)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
