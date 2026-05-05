"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";
import { useMonotonicTimer } from "../../../hooks/useMonotonicTimer";
import { useSingleInstance } from "../../../hooks/useSingleInstance";
import { RequireRole } from "../../../components/auth/RequireRole";
import styles from "./page.module.css";

type Mode = "loading" | "starting" | "in-progress" | "submitting" | "completed";

export default function StudentExamPage() {
  return (
    <RequireRole role="student">
      <Suspense fallback={<main className={styles.page}>Preparing exam...</main>}>
        <ExamContent />
      </Suspense>
    </RequireRole>
  );
}

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = Number(searchParams.get("subjectId") || 0);

  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [subject, setSubject] = useState<any>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [online, setOnline] = useState(true);

  const { blocked } = useSingleInstance(`exam-${subjectId}`);

  const durationSeconds = useMemo(() => Number(subject?.duration ?? 1) * 60, [subject?.duration]);

  const handleSubmit = useCallback(async () => {
    if (!examId || mode === "submitting" || mode === "completed") return;
    setMode("submitting");
    try {
      await api.saveExam(
        examId,
        Object.entries(answers).map(([question_id, answer]) => ({ question_id: Number(question_id), answer })),
      );
      await api.submitExam(examId);
      setMode("completed");
      router.replace("/student/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setMode("in-progress");
    }
  }, [examId, mode, answers, router]);

  const remaining = useMonotonicTimer(durationSeconds, () => {
    handleSubmit().catch(() => undefined);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setOnline(navigator.onLine);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setError("Missing subjectId");
      return;
    }
    let mounted = true;
    (async () => {
      setMode("loading");
      try {
        const [subjects, results] = await Promise.all([api.getSubjects(), api.getResults()]);
        if (!mounted) return;
        const s = ((subjects as any[]) ?? []).find((item) => Number(item.id) === subjectId);
        if (!s) throw new Error("Subject not found");
        setSubject(s);

        const inProgress = ((results as any[]) ?? []).find(
          (item) => Number(item.subject_id) === subjectId && item.status === "in-progress",
        );
        if (inProgress) {
          setExamId(Number(inProgress.id));
          try {
            const saved = JSON.parse(inProgress.answers_json || "[]") as Array<{ question_id: number; answer: number | string }>;
            const mapped: Record<number, number | string> = {};
            for (const entry of saved) mapped[entry.question_id] = entry.answer;
            setAnswers(mapped);
          } catch {
            setAnswers({});
          }
          setShowResume(true);
        } else {
          await startExam();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exam");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [subjectId]);

  useEffect(() => {
    if (mode !== "in-progress" || !examId) return;
    const autosave = setInterval(() => {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({ question_id: Number(question_id), answer }));
      api.saveExam(examId, payload).catch((err) => {
        console.error("Auto-save failed", err);
      });
    }, 30000);
    return () => clearInterval(autosave);
  }, [mode, examId, answers]);

  useEffect(() => {
    if (mode !== "in-progress") return;
    const onKey = (e: KeyboardEvent) => {
      // Do not handle global keydown if the user is typing in an essay textarea
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;
      
      const key = e.key.toLowerCase();
      const q = questions[currentIndex];
      
      if (q && q.question_type !== "essay" && ["1", "2", "3", "4"].includes(key)) {
        if (q.question_type === "true_false" && ["3", "4"].includes(key)) return;
        setAnswers((prev) => ({ ...prev, [q.id]: Number(key) - 1 }));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((v) => Math.min(questions.length - 1, v + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((v) => Math.max(0, v - 1));
      } else if (key === "f") {
        if (!q) return;
        setFlags((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, questions, currentIndex]);

  async function startExam() {
    setMode("starting");
    const start = await api.startExam(subjectId);
    if (!start) throw new Error("Could not start exam");
    const id = Number((start as any).examId);
    setExamId(id);
    const qs = ((await api.getQuestions(subjectId)) as any[]) ?? [];
    setQuestions(qs);
    setMode("in-progress");
  }

  if (blocked) {
    return (
      <main className={styles.page}>
        <div className={styles.modal}>
          <h2>Another tab has this exam open</h2>
          <p>Please close other tabs before continuing.</p>
        </div>
      </main>
    );
  }

  if (error) return <main className={styles.page}>{error}</main>;
  if (mode === "loading" || mode === "starting") return <main className={styles.page}>Preparing exam...</main>;

  const current = questions[currentIndex];
  const timerClass = remaining > 300 ? styles.green : remaining > 120 ? styles.yellow : styles.red;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <main className={styles.page}>
      {showResume ? (
        <div className={styles.modal}>
          <h3>Continue where you left off?</h3>
          <div className={styles.row}>
            <button
              onClick={async () => {
                const qs = ((await api.getQuestions(subjectId)) as any[]) ?? [];
                setQuestions(qs);
                setShowResume(false);
                setMode("in-progress");
              }}
            >
              Continue
            </button>
            <button
              onClick={async () => {
                setAnswers({});
                setShowResume(false);
                await startExam();
              }}
            >
              Start fresh
            </button>
          </div>
        </div>
      ) : null}

      {showSubmitConfirm ? (
        <div className={styles.modal}>
          <h3>Submit exam?</h3>
          <p>
            Answered: {answeredCount} / {questions.length}
          </p>
          <p>Unanswered: {questions.length - answeredCount}</p>
          <div className={styles.row}>
            <button onClick={() => setShowSubmitConfirm(false)}>Cancel</button>
            <button onClick={() => handleSubmit()}>Confirm submit</button>
          </div>
        </div>
      ) : null}

      <header className={styles.topbar}>
        <h2>{subject?.name || "Exam"}</h2>
        <p className={timerClass}>Time left: {formatTime(remaining)}</p>
        <p>{online ? "Online" : "Offline"}</p>
      </header>

      {current ? (
        <section className={styles.questionCard}>
          <h3>
            Q{currentIndex + 1}. {current.question_text}
          </h3>
          {current.question_type === "essay" ? (
            <textarea
              style={{ width: "100%", minHeight: "150px", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", resize: "vertical", marginTop: "1rem", fontSize: "1rem" }}
              placeholder="Write your answer here..."
              value={(answers[current.id] as string) || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
            />
          ) : (
            <div className={styles.options}>
              {safeOptions(current.options_json).slice(0, current.question_type === "true_false" ? 2 : 4).map((option, idx) => (
                <button
                  key={idx}
                  className={answers[current.id] === idx ? styles.optionActive : styles.option}
                  onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: idx }))}
                >
                  {current.question_type === "true_false" ? "" : `${String.fromCharCode(65 + idx)}. `}{option}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <aside className={styles.grid}>
        {questions.map((q, idx) => {
          const cls =
            idx === currentIndex
              ? styles.current
              : answers[q.id] !== undefined
                ? styles.answered
                : flags[q.id]
                  ? styles.flagged
                  : styles.unanswered;
          return (
            <button key={q.id} className={cls} onClick={() => setCurrentIndex(idx)}>
              {idx + 1}
            </button>
          );
        })}
      </aside>

      <div className={styles.row}>
        <button onClick={() => setCurrentIndex((v) => Math.max(0, v - 1))}>Prev</button>
        <button onClick={() => current && setFlags((prev) => ({ ...prev, [current.id]: !prev[current.id] }))}>
          Flag
        </button>
        <button onClick={() => setCurrentIndex((v) => Math.min(questions.length - 1, v + 1))}>Next</button>
        <button onClick={() => setShowSubmitConfirm(true)} disabled={mode === "submitting"}>
          {mode === "submitting" ? "Submitting..." : "Submit"}
        </button>
      </div>
    </main>
  );
}

function safeOptions(optionsJson: string): string[] {
  try {
    const parsed = JSON.parse(optionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
