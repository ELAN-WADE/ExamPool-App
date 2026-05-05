"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { RequireRole } from "../../../components/auth/RequireRole";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./page.module.css";

export default function StudentDashboardPage() {
  return (
    <RequireRole role="student">
      <DashboardContent />
    </RequireRole>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [subjectsData, resultsData] = await Promise.all([api.getSubjects(), api.getResults()]);
        if (!mounted) return;
        setSubjects((subjectsData as any[]) ?? []);
        setResults((resultsData as any[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const takenIds = useMemo(() => new Set(results.map((r: any) => Number(r.subject_id))), [results]);

  const stats = useMemo(() => {
    const taken = results.filter((r) => r.status === "completed");
    const avg = taken.length === 0 ? 0 : Math.round(
      taken.reduce((acc, curr) => {
        const total = Number(curr.total_score ?? 0);
        if (!total) return acc;
        return acc + (Number(curr.score ?? 0) / total) * 100;
      }, 0) / taken.length,
    );
    return { available: subjects.length, examsTaken: taken.length, avgScore: avg };
  }, [subjects, results]);

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;
  if (error)   return <main className={styles.page}><p className={styles.error}>{error}</p></main>;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Hello, {user?.name?.split(" ")[0] ?? "Student"} 👋</h1>
          <p className={styles.sub}>Here are your available exams</p>
        </div>
        <div className={styles.headerRight}>
          <Link href="/student/results" className={`btn btn-ghost ${styles.resultsLink}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            My Results
          </Link>
          <Link href="/student/settings" className="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41" />
            </svg>
            Settings
          </Link>
          <button
            className="btn btn-ghost"
            style={{ color: "var(--color-danger)" }}
            onClick={async () => { await logout(); window.location.href = "/"; }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📚</span>
          <div><div className={styles.statValue}>{stats.available}</div><div className={styles.statLabel}>Available</div></div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div><div className={styles.statValue}>{stats.examsTaken}</div><div className={styles.statLabel}>Taken</div></div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div><div className={styles.statValue}>{stats.avgScore}%</div><div className={styles.statLabel}>Avg Score</div></div>
        </div>
      </div>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <div className={styles.empty}>
          <span style={{ fontSize: "3rem" }}>📭</span>
          <h2>No Exams Available</h2>
          <p>No exams have been published for your term yet. Check back later.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {subjects.map((s: any) => {
            const examDate  = s.exam_datetime ? new Date(s.exam_datetime) : null;
            const now       = Date.now();
            const start     = examDate ? examDate.getTime() : 0;
            const end       = start + Number(s.duration) * 60_000;
            const isTaken   = takenIds.has(Number(s.id));
            const isOpen    = examDate != null && now >= start && now < end;
            const isClosed  = examDate != null && now >= end;
            const isUpcoming = examDate != null && now < start;

            return (
              <div key={s.id} className={`${styles.card} ${isClosed || isTaken ? styles.cardDim : ""}`}>
                <div className={styles.cardTop}>
                  <span className={styles.subjectIcon}>📘</span>
                  {isTaken    && <span className="badge badge-success">Completed</span>}
                  {!isTaken && isOpen     && <span className="badge badge-warning">Open Now</span>}
                  {!isTaken && isClosed   && <span className="badge badge-danger">Closed</span>}
                  {!isTaken && isUpcoming && <span className="badge badge-info">Upcoming</span>}
                  {!isTaken && !examDate  && <span className="badge badge-muted">TBA</span>}
                </div>
                <h3 className={styles.subjectName}>{s.name}</h3>
                <code className={styles.code}>{s.code}</code>
                <div className={styles.meta}>
                  {examDate && (
                    <div className={styles.metaRow}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {examDate.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  <div className={styles.metaRow}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {s.duration} min
                  </div>
                </div>
                <div className={styles.cardAction}>
                  {isTaken ? (
                    <Link href="/student/results" className={`btn btn-ghost ${styles.fullBtn}`}>View Result</Link>
                  ) : isOpen ? (
                    <Link href={`/student/exam?subjectId=${s.id}`} className={`btn btn-primary ${styles.fullBtn}`}>
                      Start Exam →
                    </Link>
                  ) : (
                    <button className={`btn btn-ghost ${styles.fullBtn}`} disabled style={{ opacity: 0.5 }}>
                      {isClosed ? "Exam Closed" : "Not Open Yet"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
