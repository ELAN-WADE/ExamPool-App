const API_BASE = ""; // Same origin

/** Next.js `trailingSlash: true` uses `/setup/`; avoid full-page redirects that reload the SPA while already on setup. */
export function isSetupRoute(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  return p === "/setup";
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher" | "operator";
  grade?: string | null;
};

export type SessionInfo = {
  user: SessionUser | null;
  setupRequired: boolean;
};

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  const role = o.role;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.email === "string" &&
    (role === "student" || role === "teacher" || role === "operator")
  );
}

/** Session probe: never navigates. Used on initial load and /setup so 401/503 do not cause redirect loops. */
export async function getSession(): Promise<SessionInfo> {
  const res = await fetch(API_BASE + "/api/auth/me", {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    const setup = (body as { setup?: boolean }).setup;
    return { user: null, setupRequired: setup !== false };
  }
  if (res.status === 401) return { user: null, setupRequired: false };
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  const body = await res.json().catch(() => ({}));
  const data = "data" in body ? (body as { data: unknown }).data : body;
  const raw = data && typeof data === "object" && "user" in (data as object) ? (data as { user: unknown }).user : data;
  const user = isSessionUser(raw) ? raw : null;
  return { user, setupRequired: false };
}

type FetchAuthBehavior = {
  redirectOn401?: boolean;
  redirectOn503?: boolean;
};

async function fetchWithAuth(url: string, options: RequestInit = {}, behavior: FetchAuthBehavior = {}) {
  const redirectOn401 = behavior.redirectOn401 ?? true;
  const redirectOn503 = behavior.redirectOn503 ?? true;
  const res = await fetch(API_BASE + url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (redirectOn401 && !isSetupRoute()) window.location.href = "/";
    return null;
  }

  if (res.status === 503) {
    if (redirectOn503 && !isSetupRoute()) window.location.href = "/setup/";
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const body = await res.json().catch(() => ({}));
  if ("data" in body) return body.data;
  if ("message" in body) return body;
  return body;
}

export const api = {
  setup: (data: any) => fetchWithAuth("/api/setup", { method: "POST", body: JSON.stringify(data) }),
  register: (data: any) => fetchWithAuth("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => fetchWithAuth("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => getSession().then((s) => s.user),
  logout: () => fetchWithAuth("/api/auth/logout", { method: "POST" }),
  getSubjects: () => fetchWithAuth("/api/subjects"),
  createSubject: (data: any) => fetchWithAuth("/api/subjects", { method: "POST", body: JSON.stringify(data) }),
  updateSubject: (id: number, data: any) =>
    fetchWithAuth(`/api/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubject: (id: number) => fetchWithAuth(`/api/subjects/${id}`, { method: "DELETE" }),
  getQuestions: (subjectId: number) => fetchWithAuth(`/api/subjects/${subjectId}/questions`),
  createQuestion: (data: any) => fetchWithAuth("/api/questions", { method: "POST", body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: any) =>
    fetchWithAuth(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteQuestion: (id: number) => fetchWithAuth(`/api/questions/${id}`, { method: "DELETE" }),
  startExam: (subjectId: number) =>
    fetchWithAuth("/api/exams/start", { method: "POST", body: JSON.stringify({ subject_id: subjectId }) }),
  saveExam: (examId: number, answers: any) =>
    fetchWithAuth(`/api/exams/${examId}/save`, { method: "POST", body: JSON.stringify({ answers }) }),
  submitExam: (examId: number) => fetchWithAuth(`/api/exams/${examId}/submit`, { method: "POST" }),
  getResults: () => fetchWithAuth("/api/exams/results"),
  getUsers: () => fetchWithAuth("/api/users"),
  deleteUser: (id: number) => fetchWithAuth(`/api/users/${id}`, { method: "DELETE" }),
  createOperator: (data: any) => fetchWithAuth("/api/users/operator", { method: "POST", body: JSON.stringify(data) }),
  getAuditLogs: () => fetchWithAuth("/api/audit-logs"),
  exportDb: () => fetchWithAuth("/api/settings/export"),
  importDb: (data: any) => fetchWithAuth("/api/settings/import", { method: "POST", body: JSON.stringify(data) }),
  resetDb: (confirmation: string) =>
    fetchWithAuth("/api/settings/reset", { method: "POST", body: JSON.stringify({ confirm: confirmation }) }),
  /** Get only teachers */
  getTeachers: () => fetchWithAuth("/api/users?role=teacher"),
  /** Update user profile fields */
  updateUser: (id: number, data: any) =>
    fetchWithAuth(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  /** Activate a deactivated user */
  activateUser: (id: number) =>
    fetchWithAuth(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ is_active: true }) }),
  /** Assign (or reassign) a teacher to a subject */
  assignTeacher: (subjectId: number, teacherId: number) =>
    fetchWithAuth(`/api/subjects/${subjectId}`, { method: "PUT", body: JSON.stringify({ teacher_id: teacherId }) }),
  /** Toggle publish state of a subject */
  togglePublish: (subjectId: number, isPublished: boolean) =>
    fetchWithAuth(`/api/subjects/${subjectId}`, { method: "PUT", body: JSON.stringify({ is_published: isPublished ? 1 : 0 }) }),
  /** Get school config */
  getConfig: () => fetchWithAuth("/api/config"),
  /** Update school config */
  updateConfig: (data: any) => fetchWithAuth("/api/config", { method: "PUT", body: JSON.stringify(data) }),
  /** Change authenticated user's password */
  changePassword: (current_password: string, new_password: string) =>
    fetchWithAuth("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
  /** Promote or demote a student's grade */
  updateStudentGrade: (studentId: number, grade: string) =>
    fetchWithAuth(`/api/users/${studentId}/grade`, { method: "PUT", body: JSON.stringify({ grade }) }),
  /** Get per-question exam review detail */
  getExamReview: (examId: number) => fetchWithAuth(`/api/exams/${examId}/review`),
  /** Trigger results CSV download */
  exportResultsCsv: () => {
    // Direct window navigation so the browser handles the file download
    window.open("/api/exams/results/export", "_blank");
  },
};
