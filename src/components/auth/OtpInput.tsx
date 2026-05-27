import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

/**
 * Auto-advancing N-digit OTP input grid.
 *
 * - Numeric only (`inputMode="numeric"`).
 * - Paste a code into any cell — the rest auto-fill.
 * - `<Backspace>` on an empty cell jumps to the previous cell.
 * - First cell carries `autoComplete="one-time-code"` so iOS/Android show
 *   the SMS-autofill suggestion.
 * - Reports the joined value to `onChange` after every edit.
 */
export interface OtpInputProps {
  length?: number;
  /** Joined string (length === `length` when complete, or shorter while typing). */
  value: string;
  onChange: (value: string) => void;
  /** Called when the user fills the final digit. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export interface OtpInputHandle {
  focus(): void;
  reset(): void;
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    ariaLabel = "Verification code",
    className,
  },
  ref,
) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState<number | null>(null);

  // Hydrate cells from the parent-controlled `value` so paste / external
  // resets stay in sync.
  const cells = (() => {
    const next = Array<string>(length).fill("");
    for (let i = 0; i < Math.min(value.length, length); i++) next[i] = value[i];
    return next;
  })();

  const setAt = useCallback(
    (index: number, ch: string) => {
      const sanitized = ch.replace(/\D/g, "").slice(-1);
      const next = cells.slice();
      next[index] = sanitized;
      const joined = next.join("");
      onChange(joined);
      if (sanitized && index < length - 1) inputs.current[index + 1]?.focus();
      if (joined.length === length && !joined.includes("")) onComplete?.(joined);
    },
    [cells, length, onChange, onComplete],
  );

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !cells[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const raw = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!raw) return;
    event.preventDefault();
    onChange(raw);
    if (raw.length === length) onComplete?.(raw);
    inputs.current[Math.min(raw.length, length - 1)]?.focus();
  }

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputs.current[0]?.focus();
      },
      reset() {
        onChange("");
        inputs.current[0]?.focus();
      },
    }),
    [onChange],
  );

  // If the parent clears `value`, refocus the first cell so the user can
  // immediately retry.
  const wasEmpty = useRef(true);
  useEffect(() => {
    const isEmpty = value.length === 0;
    if (isEmpty && !wasEmpty.current) {
      inputs.current[0]?.focus();
    }
    wasEmpty.current = isEmpty;
  }, [value]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex gap-2 justify-between ${className ?? ""}`}
      onPaste={handlePaste}
    >
      {cells.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={digit}
          disabled={disabled}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused(null)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`${ariaLabel} digit ${i + 1}`}
          className={`h-14 w-12 rounded-xl border text-center text-[20px] font-semibold transition-all bg-input
            outline-none focus:border-primary focus:ring-soft focus:bg-card
            disabled:opacity-60 disabled:cursor-not-allowed
            ${
              digit
                ? "border-primary text-foreground ring-soft bg-card"
                : focused === i
                  ? "border-primary text-foreground"
                  : "border-border text-foreground"
            }`}
        />
      ))}
    </div>
  );
});
