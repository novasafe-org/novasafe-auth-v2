/**
 * Pure password-strength scorer used by the signup password step.
 *
 * Score is a small integer 0..5 — purely a UX hint, the backend enforces
 * the real minimum length (8 chars).
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  /** True if password matches a curated breach-y blacklist (very common). */
  breached: boolean;
}

const COMMON_BLACKLIST = new Set<string>([
  "password",
  "12345678",
  "qwerty12",
  "letmein!",
  "iloveyou",
  "trustno1",
  "passw0rd",
]);

const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"] as const;

export function scorePassword(value: string): PasswordStrength {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (value.length >= 14) score++;

  const clamped = Math.min(5, score) as PasswordStrength["score"];
  return {
    score: clamped,
    label: LABELS[clamped] ?? LABELS[0],
    breached: COMMON_BLACKLIST.has(value.toLowerCase()),
  };
}
