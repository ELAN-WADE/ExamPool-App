"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function TeacherDashboardPage() {
  return (
    <RequireRole role="teacher">
      <TeacherDashboard />
    </RequireRole>
  );
}

function TeacherDashboard() {
  const [subjects,       setSubjects]       = useState<any[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = (await api.getSubjects()) as any[];
        const subs = data ?? [];
        setSubjects(subs);

        // Fetch question counts in parallel for each subject
        const counts: Record<number, number> = {};
        await Promise.all(
          subs.map(async (s: any) => {
            try {
              const qs = (await api.getQuestions(Number(s.id))) as any[];
              counts[Number(s.id)] = Array.isArray(qs) ? qs.length : 0;
            } catch {
              counts[Number(s.id)] = 0;
            }
          })
        );
        setQuestionCounts(counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load subjects");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;

  if (error) return (
    <div className={styles.errorState}>
      <span style={{ fontSize: "2rem" }}>⚠️</span>
      <p>{error}</p>
    </div>
  );

  if (subjects.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span style={{ fontSize: "3rem" }}>📚</span>
        <h2>No Subjects Assigned</h2>
        <p>You don&apos;t have any subjects yet. Contact your operator to get assigned.</p>
      </div>
    );
  }

  const published = subjects.filter((s) => s.is_published).length;
  const drafts    = subjects.filter((s) => !s.is_published).length;

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">My Subjects</h1>
        <div className={styles.pills}>
          <span className={styles.pill}><span className={styles.pillNum}>{subjects.length}</span> Total</span>
          <span className={styles.pill}><span className={styles.pillNum} style={{ color: "var(--color-success)" }}>{published}</span> Live</span>
          <span className={styles.pill}><span className={styles.pillNum} style={{ color: "var(--color-muted)" }}>{drafts}</span> Draft</span>
        </div>
      </div>

      <div className={styles.grid}>
        {subjects.map((s: any) => {
          const qCount = questionCounts[Number(s.id)] ?? "…";
          return (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.subjectIcon}>📘</div>
                <span className={`badge ${s.is_published ? "badge-success" : "badge-muted"}`}>
                  {s.is_published ? "Live" : "Draft"}
                </span>
              </div>
              <h3 className={styles.subjectName}>{s.name}</h3>
              <code className={styles.code}>{s.code}</code>
              <div className={styles.meta}>
                <div className={styles.metaRow}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {s.exam_datetime ? new Date(s.exam_datetime).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBA"}
                </div>
                <div className={styles.metaRow}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {s.duration} min
                </div>
                <div className={styles.metaRow}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                  Term: {s.term}
                </div>
                {/* Question count + marks */}
                <div className={styles.metaRow} style={{ marginTop: "0.35rem", gap: "0.75rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "var(--color-surface-2)", borderRadius: "6px", padding: "0.2rem 0.55rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    {qCount} {typeof qCount === "number" && qCount === 1 ? "Question" : "Questions"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "var(--color-surface-2)", borderRadius: "6px", padding: "0.2rem 0.55rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    {s.total_score ?? 0} Marks
                  </span>
                  {s.is_published && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#d97706", fontSize: "0.78rem" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                      Locked
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.cardActions}>
                <Link href={`/teacher/questions?subjectId=${s.id}${!s.is_published ? "&action=create" : ""}`} className={`btn btn-primary ${styles.actionBtn}`}>
                  {s.is_published ? "View Questions" : "Manage Questions"}
                </Link>
                <Link href="/teacher/results" className={`btn btn-ghost ${styles.actionBtn}`}>
                  View Results
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
