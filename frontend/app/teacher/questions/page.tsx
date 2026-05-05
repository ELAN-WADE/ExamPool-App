"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function TeacherQuestionsPage() {
  return (
    <RequireRole role="teacher">
      <Suspense fallback={<div className="loadingWrap"><div className="spinner" /></div>}>
        <QuestionsContent />
      </Suspense>
    </RequireRole>
  );
}

function parseOptions(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : ["", "", "", ""];
  } catch {
    return ["", "", "", ""];
  }
}

const OPTION_LABELS = ["A", "B", "C", "D"];

type EditorMode = "list" | "create" | "edit";

function QuestionsContent() {
  const searchParams = useSearchParams();
  const subjectId = Number(searchParams.get("subjectId") || 0);

  const [subjects,       setSubjects]       = useState<any[]>([]);
  const [questions,      setQuestions]      = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [error,          setError]          = useState("");
  const [toast,          setToast]          = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Always start on "list"; useEffect below switches to "create" if action=create
  const [editorMode,      setEditorMode]      = useState<EditorMode>("list");
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editing,         setEditing]         = useState<any | null>(null);
  const [deleting,        setDeleting]        = useState<any | null>(null);
  const [saving,          setSaving]          = useState(false);
  const actionHandled = useRef(false);

  // Editor form fields
  const [questionText,  setQuestionText]  = useState("");
  const [imageUrl,      setImageUrl]      = useState("");
  const [questionType,  setQuestionType]  = useState("objective");
  const [teacherAnswer, setTeacherAnswer] = useState("");
  const [options,       setOptions]       = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [marks,         setMarks]         = useState(1);

  // Subject edit fields
  const [subjDatetime, setSubjDatetime] = useState("");
  const [subjDuration, setSubjDuration] = useState(60);

  const subject  = useMemo(() => subjects.find((s) => Number(s.id) === subjectId), [subjects, subjectId]);
  const isLocked = Boolean(subject?.is_published);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const data = (await api.getSubjects()) as any[];
      setSubjects(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed loading subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!subjectId) return;
    try {
      const data = (await api.getQuestions(subjectId)) as any[];
      setQuestions(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed loading questions");
    } finally {
      setQuestionsReady(true);
    }
  }, [subjectId]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { if (subjectId) loadQuestions(); }, [subjectId, loadQuestions]);

  // KEY FIX: read URL param AFTER hydration and switch to editor
  useEffect(() => {
    if (actionHandled.current) return;
    if (!subjectId) return;
    const action = searchParams.get("action");
    if (action === "create") {
      actionHandled.current = true;
      resetForm();
      setEditorMode("create");
    }
  }, [searchParams, subjectId]);

  function resetForm() {
    setEditing(null);
    setQuestionText("");
    setImageUrl("");
    setQuestionType("objective");
    setTeacherAnswer("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setMarks(1);
  }

  const openCreate = () => {
    if (isLocked) return;
    resetForm();
    setEditorMode("create");
  };

  const openEdit = (q: any) => {
    if (isLocked) return;
    setEditing(q);
    setQuestionText(q.question_text ?? "");
    setImageUrl(q.image_url ?? "");
    setQuestionType(q.question_type ?? "objective");
    setTeacherAnswer(q.teacher_answer ?? "");
    setOptions(parseOptions(q.options_json));
    setCorrectAnswer(Number(q.correct_answer ?? 0));
    setMarks(Number(q.marks ?? 1));
    setEditorMode("edit");
  };

  const openEditSubject = () => {
    if (isLocked || !subject) return;
    setSubjDatetime(subject.exam_datetime ? new Date(subject.exam_datetime).toISOString().slice(0, 16) : "");
    setSubjDuration(subject.duration ?? 60);
    setEditSubjectOpen(true);
  };

  const onSubmitSubject = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSubject(subjectId, {
        exam_datetime: new Date(subjDatetime).toISOString(),
        duration: Number(subjDuration),
      });
      showToast("success", "Subject settings saved.");
      setEditSubjectOpen(false);
      await loadSubjects();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmitQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) { showToast("error", "Question text is required."); return; }
    if (questionType === "objective" && options.some((o) => !o.trim())) {
      showToast("error", "Fill in all 4 options for multiple-choice."); return;
    }
    setSaving(true);
    try {
      const payloadOptions =
        questionType === "true_false" ? ["True", "False", "", ""] :
        questionType === "essay"      ? ["", "", "", ""] : options;
      const payloadCorrect = questionType === "essay" ? 0 : correctAnswer;
      const payload = {
        question_text: questionText,
        image_url: imageUrl || null,
        question_type: questionType,
        teacher_answer: teacherAnswer,
        options: payloadOptions,
        correct_answer: payloadCorrect,
        marks,
      };
      if (editing) {
        await api.updateQuestion(editing.id, payload);
        showToast("success", "Question updated.");
      } else {
        await api.createQuestion({ subject_id: subjectId, order_index: questions.length, ...payload });
        showToast("success", "Question created successfully!");
      }
      await loadQuestions();
      resetForm();
      setEditorMode("list");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteQuestion = async (q: any) => {
    try {
      await api.deleteQuestion(q.id);
      showToast("success", "Question deleted.");
      setDeleting(null);
      if (editorMode === "edit") setEditorMode("list");
      await loadQuestions();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed.");
    }
  };

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;

  if (!subjectId) {
    return (
      <div className={styles.errorState}>
        <span style={{ fontSize: "2.5rem" }}>🔒</span>
        <h2>No Subject Selected</h2>
        <p>Go to your dashboard and click &quot;Manage Questions&quot; on a subject.</p>
        <Link href="/teacher/dashboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // ── FULL-PAGE SPLIT EDITOR ──────────────────────────────────────────────
  if (editorMode === "create" || editorMode === "edit") {
    return (
      <div className={styles.editorContainer}>
        {toast && (
          <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`} style={{ zIndex: 9999 }}>
            {toast.text}
          </div>
        )}

        {/* LEFT: Document */}
        <div className={styles.editorMain}>
          <div className={styles.editorHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button className="btn btn-ghost" onClick={() => { resetForm(); setEditorMode("list"); }}>
                ← Back
              </button>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted)", marginBottom: "0.15rem" }}>
                  {subject?.name ?? "Subject"} · {editorMode === "edit" ? "Editing Question" : "New Question"}
                </div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  {editorMode === "edit" ? "Edit Question" : "Create Question"}
                </h2>
              </div>
            </div>
            {editorMode === "edit" && !isLocked && (
              <button
                className="btn btn-ghost"
                style={{ color: "var(--color-danger)" }}
                onClick={() => setDeleting(editing)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.35rem" }}>
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                Delete
              </button>
            )}
          </div>

          <div className={styles.docBody}>
            <textarea
              className={styles.richTextarea}
              placeholder="Write your question here…"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              autoFocus
            />

            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Question image preview"
                className={styles.imgPreview}
              />
            )}

            <div className={styles.imageUploadField}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <input
                type="url"
                className="input"
                style={{ flex: 1, border: "none", background: "transparent", padding: "0" }}
                placeholder="Optional: Paste image URL to attach a visual"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Settings Inspector */}
        <aside className={styles.editorSidebar}>
          <form
            id="qEditorForm"
            onSubmit={onSubmitQuestion}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}
          >
            <div className={styles.sidebarSection}>
              <div className={styles.sidebarSectionTitle}>Question Settings</div>
              <div className="field">
                <label>Question Type</label>
                <select className="select" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                  <option value="objective">Multiple Choice (A B C D)</option>
                  <option value="true_false">True / False</option>
                  <option value="essay">Essay / Written</option>
                </select>
              </div>
              <div className="field">
                <label>Marks for this Question</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {questionType === "objective" && (
              <div className={styles.sidebarSection}>
                <div className={styles.sidebarSectionTitle}>Answer Options — click a letter to mark correct</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {options.map((o, i) => (
                    <div
                      key={i}
                      className={`${styles.optionRow} ${correctAnswer === i ? styles.optionRowActive : ""}`}
                    >
                      <button
                        type="button"
                        className={`${styles.optionSelectBtn} ${correctAnswer === i ? styles.optionSelectBtnActive : ""}`}
                        onClick={() => setCorrectAnswer(i)}
                        title={`Mark option ${OPTION_LABELS[i]} as correct`}
                      >
                        {OPTION_LABELS[i]}
                      </button>
                      <input
                        className="input"
                        value={o}
                        onChange={(e) => {
                          const next = [...options];
                          next[i] = e.target.value;
                          setOptions(next);
                        }}
                        placeholder={`Option ${OPTION_LABELS[i]}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionType === "true_false" && (
              <div className={styles.sidebarSection}>
                <div className={styles.sidebarSectionTitle}>Correct Answer</div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className={`btn ${correctAnswer === 0 ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setCorrectAnswer(0)}
                    style={{ flex: 1 }}
                  >
                    ✓ True
                  </button>
                  <button
                    type="button"
                    className={`btn ${correctAnswer === 1 ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setCorrectAnswer(1)}
                    style={{ flex: 1 }}
                  >
                    ✗ False
                  </button>
                </div>
              </div>
            )}

            {questionType === "essay" && (
              <div className={styles.sidebarSection}>
                <div className={styles.sidebarSectionTitle}>Model Answer / Grading Rubric</div>
                <textarea
                  className="input"
                  value={teacherAnswer}
                  onChange={(e) => setTeacherAnswer(e.target.value)}
                  placeholder="Write the expected answer or marking rubric here…"
                  rows={6}
                />
              </div>
            )}

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="submit"
                form="qEditorForm"
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.85rem" }}
                disabled={saving}
              >
                {saving ? "Saving…" : (editorMode === "edit" ? "💾 Save Changes" : "✅ Create Question")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%" }}
                onClick={() => { resetForm(); setEditorMode("list"); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </aside>

        {/* Delete confirm dialog */}
        {deleting && (
          <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDeleting(null)}>
            <div className="modal" style={{ maxWidth: 380 }}>
              <h2>Delete Question?</h2>
              <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                This question will be permanently removed and cannot be recovered.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1.5rem" }}>
                <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => onDeleteQuestion(deleting)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.text}
        </div>
      )}

      <div className="pageHeader">
        <div>
          <Link href="/teacher/dashboard" style={{ color: "var(--color-muted)", fontSize: "0.88rem", textDecoration: "none" }}>
            ← Dashboard
          </Link>
          <h1 className="pageTitle" style={{ marginTop: "0.25rem" }}>{subject?.name ?? "Questions"}</h1>
          {subject && <code className={styles.code}>{subject.code} · Term {subject.term}</code>}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {subject && (
            <span className={`badge ${subject.is_published ? "badge-success" : "badge-muted"}`}>
              {subject.is_published ? "Published" : "Draft"}
            </span>
          )}
          <button
            className="btn btn-ghost"
            onClick={openEditSubject}
            disabled={isLocked}
            title={isLocked ? "Unpublish to edit settings" : "Edit subject settings"}
          >
            ⚙️ Settings
          </button>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            disabled={isLocked}
            title={isLocked ? "Unpublish subject to add questions" : "Add a new question"}
          >
            + Add Question
          </button>
        </div>
      </div>

      {isLocked && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "10px", padding: "0.85rem 1.1rem", marginBottom: "1.25rem", color: "#d97706"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <div>
            <strong>Subject is Published — Editing is Locked.</strong>
            <span style={{ fontSize: "0.85rem", marginLeft: "0.5rem", opacity: 0.8 }}>
              Ask the Operator to unpublish before making changes.
            </span>
          </div>
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {questionsReady && questions.length === 0 ? (
        <div className={styles.emptyState}>
          <span style={{ fontSize: "3rem" }}>📝</span>
          <h3>No questions yet</h3>
          <p>Click &quot;Add Question&quot; to open the editor and start building this exam.</p>
          {!isLocked && (
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: "0.75rem" }}>
              + Create First Question
            </button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {questions.map((q: any, idx: number) => {
            const opts = parseOptions(q.options_json);
            return (
              <div key={q.id} className={styles.qCard}>
                <div className={styles.qTop}>
                  <span className={styles.qNum}>Q{idx + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`badge ${q.question_type === "essay" ? "badge-info" : q.question_type === "true_false" ? "badge-warning" : "badge-success"}`}>
                      {q.question_type === "essay" ? "Essay" : q.question_type === "true_false" ? "True/False" : "MCQ"}
                    </span>
                    <span className={styles.qMarks}>{q.marks} {q.marks === 1 ? "mark" : "marks"}</span>
                  </div>
                </div>

                {q.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.image_url}
                    alt={`Q${idx + 1} image`}
                    style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "8px", marginBottom: "0.75rem", border: "1px solid var(--color-border)" }}
                  />
                )}
                <p className={styles.qText}>{q.question_text}</p>

                {q.question_type !== "essay" ? (
                  <div className={styles.optionGrid}>
                    {opts.slice(0, q.question_type === "true_false" ? 2 : 4).map((o, i) => (
                      <div key={i} className={`${styles.option} ${Number(q.correct_answer) === i ? styles.optionCorrect : ""}`}>
                        <span className={styles.optionLabel}>{OPTION_LABELS[i]}</span>
                        <span>{o}</span>
                        {Number(q.correct_answer) === i && (
                          <svg className={styles.checkIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.teacherAnswerBlock}>
                    <strong>Rubric: </strong>
                    <span style={{ color: "var(--color-muted)" }}>{q.teacher_answer || "None provided"}</span>
                  </div>
                )}

                <div className={styles.qActions}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(q)}
                    disabled={isLocked}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: isLocked ? "var(--color-surface-2)" : "var(--color-danger-bg)",
                      color: isLocked ? "var(--color-muted)" : "var(--color-danger)",
                    }}
                    onClick={() => !isLocked && setDeleting(q)}
                    disabled={isLocked}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm (list view) */}
      {deleting && editorMode === "list" && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <h2>Delete Question?</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              This question will be permanently removed.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1.5rem" }}>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => onDeleteQuestion(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Properties */}
      {editSubjectOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setEditSubjectOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <h2>Subject Settings</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "1.5rem" }}>
              Update exam date/time and duration. Other fields are managed by the Operator.
            </p>
            <form onSubmit={onSubmitSubject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="field">
                <label>Exam Date &amp; Time *</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={subjDatetime}
                  onChange={(e) => setSubjDatetime(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Duration (minutes) *</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="360"
                  value={subjDuration}
                  onChange={(e) => setSubjDuration(Number(e.target.value))}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditSubjectOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
