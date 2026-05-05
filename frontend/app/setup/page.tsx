"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import styles from "./page.module.css";

export default function SetupPage() {
  const router = useRouter();
  const { init } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((res) => {
        if (res.status === 403) router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.setup({ name, email, password });
      if (!result) return;
      await init();
      router.replace("/operator/dashboard/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className={styles.page}>Checking setup state...</main>;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>First Run Setup</h1>
        <p>This computer is the exam server.</p>
        <p className={styles.warn}>Keep this password safe — no recovery in offline mode.</p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <form onSubmit={onSubmit} className={styles.form}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Setting up..." : "Create Operator"}
          </button>
        </form>
      </div>
    </main>
  );
}
