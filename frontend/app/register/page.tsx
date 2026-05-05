"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import styles from "./page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.register({
        name,
        email,
        password,
        role,
        ...(role === "student" ? { grade } : {}),
      });
      router.replace("/?message=Account%20created%2C%20please%20login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Register</h1>
        {error ? <p className={styles.error}>{error}</p> : null}
        <form className={styles.form} onSubmit={onSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value as "student" | "teacher")}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          {role === "student" ? (
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade" required />
          ) : null}
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
