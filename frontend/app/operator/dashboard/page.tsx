"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireRole } from "../../../components/auth/RequireRole";
import { api } from "../../../lib/api";
import styles from "./page.module.css";

export default function OperatorDashboardPage() {
  return (
    <RequireRole role="operator">
      <OperatorDashboard />
    </RequireRole>
  );
}

function OperatorDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, s, r] = await Promise.all([api.getUsers(), api.getSubjects(), api.getResults()]);
      setUsers((u as any[]) ?? []);
      setSubjects((s as any[]) ?? []);
      setResults((r as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const students  = users.filter((u) => u.role === "student").length;
    const teachers  = users.filter((u) => u.role === "teacher").length;
    const published = subjects.filter((s) => s.is_published).length;
    const avgScore  = results.length
      ? (results.reduce((a: number, r: any) => a + (r.score ?? 0), 0) / results.length).toFixed(1)
      : "—";
    return { students, teachers, subjects: subjects.length, published, exams: results.length, avgScore };
  }, [users, subjects, results]);

  if (loading) {
    return (
      <div className="loadingWrap">
        <div className="spinner" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Students",    value: stats.students,  icon: "👩‍🎓", color: "#4f7cff" },
    { label: "Total Teachers",    value: stats.teachers,  icon: "👩‍🏫", color: "#22c55e" },
    { label: "Total Subjects",    value: stats.subjects,  icon: "📚",   color: "#f59e0b" },
    { label: "Published Subjects",value: stats.published, icon: "✅",   color: "#38bdf8" },
    { label: "Exams Completed",   value: stats.exams,     icon: "📝",   color: "#a78bfa" },
    { label: "Avg. Score",        value: stats.avgScore,  icon: "📊",   color: "#fb923c" },
  ];

  const quickLinks = [
    { href: "/operator/subjects", label: "Manage Subjects",  desc: "Create, assign & publish exams", icon: "📚" },
    { href: "/operator/users",    label: "Manage Users",     desc: "Add teachers, students & operators", icon: "👥" },
    { href: "/operator/settings", label: "System Settings",  desc: "Backup, restore & audit logs", icon: "⚙️" },
  ];

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">Dashboard</h1>
        <span className={styles.dateTag}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      {/* Stats grid */}
      <section className={styles.statsGrid}>
        {statCards.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: s.color + "22", color: s.color }}>{s.icon}</div>
            <div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick links */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickGrid}>
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href} className={styles.quickCard}>
              <span className={styles.quickIcon}>{l.icon}</span>
              <div>
                <div className={styles.quickLabel}>{l.label}</div>
                <div className={styles.quickDesc}>{l.desc}</div>
              </div>
              <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent subjects */}
      {subjects.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Subjects</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Term</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjects.slice(0, 5).map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td><code style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>{s.code}</code></td>
                    <td>{s.term}</td>
                    <td>
                      <span className={`badge ${s.is_published ? "badge-success" : "badge-muted"}`}>
                        {s.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
