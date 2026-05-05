"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function StudentResultsPage() {
  return (
    <RequireRole role="student">
      <ResultsContent />
    </RequireRole>
  );
}

function ResultsContent() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = (await api.getResults()) as any[];
        setResults(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!results.length) return { total: 0, avg: 0, best: 0, pass: 0 };
    const pcts = results.map((r) => {
      const total = Number(r.total_score ?? 0);
      return total > 0 ? Math.round((Number(r.score ?? 0) / total) * 100) : 0;
    });
    const avg  = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const best = Math.max(...pcts);
    const pass = pcts.filter((p) => p >= 50).length;
    return { total: results.length, avg, best, pass };
  }, [results]);

  if (loading) return <div className="loadingWrap"><div className="spinner" /></div>;
  if (error)   return <main className={styles.page}><p className={styles.error}>{error}</p></main>;

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>My Results</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/student/dashboard" className="btn btn-ghost">← Dashboard</Link>
          <Link href="/student/settings" className="btn btn-ghost">⚙️ Settings</Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Exams Taken",  value: stats.total,   icon: "📝", color: "#4f7cff" },
          { label: "Average Score",value: `${stats.avg}%`, icon: "📊", color: "#22c55e" },
          { label: "Best Score",   value: `${stats.best}%`, icon: "🏆", color: "#f59e0b" },
          { label: "Passed",       value: stats.pass,    icon: "✅", color: "#38bdf8" },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statIcon}>{s.icon}</span>
            <div>
              <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <span style={{ fontSize: "3rem" }}>📭</span>
          <h2>No Results Yet</h2>
          <p>You haven't completed any exams yet.</p>
          <Link href="/student/dashboard" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>Go to Dashboard</Link>
        </div>
      ) : (
        <div className={styles.cards}>
          {results.map((r) => {
            const total = Number(r.total_score ?? 0);
            const pct   = total > 0 ? Math.round((Number(r.score ?? 0) / total) * 100) : 0;
            const grade = pct >= 70 ? "A" : pct >= 55 ? "B" : pct >= 40 ? "C" : "F";
            const gradeColor = pct >= 55 ? "var(--color-success)" : pct >= 40 ? "var(--color-warning)" : "var(--color-danger)";
            const gradeClass = pct >= 55 ? "badge-success" : pct >= 40 ? "badge-warning" : "badge-danger";
            return (
              <div key={r.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <div className={styles.gradeCircle} style={{ borderColor: gradeColor, color: gradeColor }}>
                    {grade}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.subjectName}>{r.subject_name || `Subject #${r.subject_id}`}</div>
                  <div className={styles.cardMeta}>
                    <span className={`badge ${gradeClass}`}>{pct}%</span>
                    <span style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>
                      Score: {r.score ?? 0} / {total || "?"}
                    </span>
                    {r.end_time && (
                      <span style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>
                        {new Date(r.end_time).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%`, background: gradeColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className={styles.footer}>ExamPool LAN — Student Report</footer>
    </main>
  );
}
