import { z } from "zod";

/** Parse server-fn input; surfaces the first Zod message as a plain Error. */
export function parseActionInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.errors[0]?.message ?? "Invalid input";
    throw new Error(message);
  }
  return result.data;
}

/** TanStack Start may serialize Zod issues as a JSON array in `Error.message`. */
function parseZodRpcMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const issues = JSON.parse(trimmed) as Array<{ message?: string }>;
    const first = issues.find((issue) => issue.message?.trim());
    return first?.message?.trim() ?? null;
  } catch {
    return null;
  }
}

const EXPECTED_MESSAGES = [
  "enter a valid email",
  "password is required",
  "invalid input",
  "enter the",
  "google id token",
];

/** User-facing message from a failed auth server action (no console noise). */
export function toAuthActionMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    const fromZod = parseZodRpcMessage(err.message);
    if (fromZod) return fromZod;
    return err.message.trim();
  }
  return fallback;
}

export function isExpectedAuthClientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const fromZod = parseZodRpcMessage(err.message);
  if (fromZod) return true;
  const lower = err.message.toLowerCase();
  return EXPECTED_MESSAGES.some((hint) => lower.includes(hint));
}
