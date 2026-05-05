"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { useAuth } from "../hooks/useAuth";
import styles from "./page.module.css";

function normalizePath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

function LoginContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, login, isLoading, setupRequired } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // This is the line that was causing the build error
  const successMessage = searchParams.get("message");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => setServerOnline(r.status !== 500))
      .catch(() => setServerOnline(false));
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (setupRequired) {
      if (normalizePath(pathname) !== "/setup") router.replace("/setup/");
      return;
    }
    if (!isAuthenticated || !user) return;
    if (user.role === "student") router.replace("/student/dashboard/");
    else if (user.role === "teacher") router.replace("/teacher/dashboard/");
    else router.replace("/operator/dashboard/");
  }, [isLoading, isAuthenticated, user, router, setupRequired, pathname]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Exampool LAN</h1>
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <form onSubmit={onSubmit} className={styles.form}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>
        <p>
          No account? <Link href="/register">Register</Link>
        </p>
        <p className={styles.status}>
          <span className={`${styles.dot} ${serverOnline ? styles.green : styles.red}`} /> Server status:{" "}
          {serverOnline === null ? "Checking..." : serverOnline ? "Online" : "Offline"}
        </p>
      </div>
    </main>
  );
}

// 2. The main page now just wraps the content in a Suspense boundary
export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}