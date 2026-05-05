"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

type Toast = { type: "success" | "error"; text: string } | null;
type Subject = {
  id: number; name: string; code: string; term: string;
  duration: number; total_score: number; exam_datetime: string;
  is_published: number; teacher_id: number; created_at: string;
  description?: string; class?: string; session?: string; mode?: string;
};
type User = { id: number; name: string; email: string; role: string; is_active: number };

const emptyForm = { name: "", code: "", term: "", duration: "", exam_datetime: "", teacher_id: "", description: "", class: "", session: "", mode: "exam" };

export default function OperatorSubjectsPage() {
  return (
    <RequireRole role="operator">
      <SubjectsContent />
    </RequireRole>
  );
}

function SubjectsContent() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<Toast>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Subject | null>(null);
  const [deleting, setDeleting]     = useState<Subject | null>(null);
  const [form, setForm]             = useState<typeof emptyForm>(emptyForm);
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api.getSubjects(), api.getUsers()]);
      setSubjects((s as Subject[]) ?? []);
      setUsers((u as User[]) ?? []);
    } catch {
      showToast("error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const teachers = useMemo(() => users.filter((u) => u.role === "teacher" && u.is_active), [users]);

  const teacherMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const t of users) m[t.id] = t.name;
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.term.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit   = (s: Subject) => {
    setEditing(s);
    setForm({
      name:           s.name,
      code:           s.code,
      term:           s.term,
      duration:       String(s.duration),
      exam_datetime:  s.exam_datetime ?? "",
      teacher_id:     String(s.teacher_id),
      description:    s.description ?? "",
      class:          s.class ?? "",
      session:        s.session ?? "",
      mode:           s.mode ?? "exam",
    });
    setModalOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.term || !form.duration || !form.exam_datetime || !form.teacher_id) {
      showToast("error", "Please complete all required fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:          form.name,
        code:          form.code,
        term:          form.term,
        duration:      Number(form.duration),
        exam_datetime: form.exam_datetime,
        teacher_id:    Number(form.teacher_id),
        description:   form.description || null,
        class:         form.class || null,
        session:       form.session || null,
        mode:          form.mode || "exam",
      };
      if (editing) {
        await api.updateSubject(editing.id, payload);
        showToast("success", `Subject "${form.name}" updated & teacher assigned.`);
      } else {
        await api.createSubject(payload);
        showToast("success", `Subject "${form.name}" created.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (s: Subject) => {
    try {
      await api.updateSubject(s.id, { is_published: s.is_published ? 0 : 1 });
      showToast("success", s.is_published ? `"${s.name}" unpublished.` : `"${s.name}" published.`);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Toggle failed.");
    }
  };

  const remove = async (s: Subject) => {
    try {
      await api.deleteSubject(s.id);
      showToast("success", `Subject "${s.name}" deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed.");
    }
  };

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;

  return (
    <>
      {/* Toast */}
      {toast && <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>{toast.text}</div>}

      {/* Header */}
      <div className="pageHeader">
        <h1 className="pageTitle">Subjects</h1>
        <button className={`btn btn-primary ${styles.createBtn}`} onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Assign Subject
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statPill}><span className={styles.statNum}>{subjects.length}</span> Total</div>
        <div className={styles.statPill}><span className={styles.statNum}>{subjects.filter((s) => s.is_published).length}</span> Published</div>
        <div className={styles.statPill}><span className={styles.statNum}>{subjects.filter((s) => !s.is_published).length}</span> Draft</div>
        <div className={styles.statPill}><span className={styles.statNum}>{teachers.length}</span> Teachers</div>
      </div>

      {/* Search */}
      <div className={`searchBar ${styles.search}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input placeholder="Search subjects…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className={`card ${styles.tableCard}`}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: "2.5rem" }}>📚</span>
            <p>{search ? "No subjects match your search." : "No subjects yet. Create one to get started."}</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Term</th>
                <th>Teacher</th>
                <th>Duration</th>
                <th>Exam Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.subjectName}>{s.name}</div>
                  </td>
                  <td><code className={styles.code}>{s.code}</code></td>
                  <td>{s.term}</td>
                  <td>
                    <div className={styles.teacherCell}>
                      <div className={styles.teacherAvatar}>{(teacherMap[s.teacher_id] ?? "?").charAt(0)}</div>
                      <span>{teacherMap[s.teacher_id] ?? <em style={{ color: "var(--color-danger)", fontSize: "0.8rem" }}>Unassigned</em>}</span>
                    </div>
                  </td>
                  <td>{s.duration} min</td>
                  <td className={styles.dateCell}>{s.exam_datetime ? new Date(s.exam_datetime).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td>
                    <span className={`badge ${s.is_published ? "badge-success" : "badge-muted"}`}>
                      {s.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit / Reassign Teacher">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Edit
                      </button>
                      <button
                        className={`btn btn-sm ${s.is_published ? styles.unpublishBtn : styles.publishBtn}`}
                        onClick={() => togglePublish(s)}
                        title={s.is_published ? "Unpublish" : "Publish"}
                      >
                        {s.is_published ? "Unpublish" : "Publish"}
                      </button>
                      <button className="btn btn-sm" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }} onClick={() => setDeleting(s)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing ? "Edit Subject & Assign Teacher" : "Create Subject"}</h2>
            <form onSubmit={submit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className="field">
                  <label>Subject Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
                </div>
                <div className="field">
                  <label>Subject Code *</label>
                  <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH101" required />
                </div>
                <div className="field">
                  <label>Term *</label>
                  <input className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="e.g. 2026-T1" required />
                </div>
                <div className="field">
                  <label>Duration (minutes) *</label>
                  <input className="input" type="number" min={1} max={360} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 60" required />
                </div>
              </div>

              <div className="field">
                <label>Exam Date & Time *</label>
                <input className="input" type="datetime-local" value={form.exam_datetime} onChange={(e) => setForm({ ...form, exam_datetime: e.target.value })} required />
              </div>

              {/* Extra v3 fields */}
              <div className={styles.formGrid}>
                <div className="field">
                  <label>Class / Grade</label>
                  <input className="input" value={(form as any).class ?? ""} onChange={(e) => setForm({ ...form, class: e.target.value } as any)} placeholder="e.g. Grade 10A" />
                </div>
                <div className="field">
                  <label>Session</label>
                  <input className="input" value={(form as any).session ?? ""} onChange={(e) => setForm({ ...form, session: e.target.value } as any)} placeholder="e.g. 2026/2027" />
                </div>
                <div className="field">
                  <label>Mode</label>
                  <select className="select" value={(form as any).mode ?? "exam"} onChange={(e) => setForm({ ...form, mode: e.target.value } as any)}>
                    <option value="exam">Exam</option>
                    <option value="test">Test</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <input className="input" value={(form as any).description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value } as any)} placeholder="Brief subject description (optional)" />
              </div>

              {/* ── ASSIGN TEACHER ── */}
              <div className={`field ${styles.teacherField}`}>
                <label>Assign Teacher *</label>
                {teachers.length === 0 ? (
                  <div className={styles.noTeacher}>⚠️ No active teachers found. Please add a teacher first in <strong>Users</strong>.</div>
                ) : (
                  <select className="select" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required>
                    <option value="">— Select a teacher —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || teachers.length === 0}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleting && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <h2>Delete Subject?</h2>
            <p style={{ color: "var(--color-muted)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
              You are about to delete <strong style={{ color: "var(--color-text)" }}>"{deleting.name}"</strong>. This will also delete all its questions. This action cannot be undone.
            </p>
            <div className={styles.formActions} style={{ marginTop: "1.5rem" }}>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
