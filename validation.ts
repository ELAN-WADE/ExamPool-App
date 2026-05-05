/** Shared input validation for HTTP handlers (keeps server.ts readable). */

export const MIN_PASSWORD_LENGTH = 6;

export function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Normalize for storage and lookup (SQLite comparisons are case-sensitive by default). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

/** Exam duration in minutes per schema: 1–360 inclusive. */
export function isValidSubjectDuration(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= 360;
}

export function isValidExamDateTime(isoOrDate: string): boolean {
  const t = Date.parse(isoOrDate);
  return Number.isFinite(t);
}

export function isValidRoleParam(role: string): role is "student" | "teacher" | "operator" {
  return role === "student" || role === "teacher" || role === "operator";
}

export function isPositiveIntId(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}
