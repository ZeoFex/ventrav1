import type { MutableRefObject } from "react";

type StaffLoginOtpFormProps = {
  phone: string;
  smsSent?: boolean;
  devOtp?: string | null;
  otp: string[];
  otpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  resendSeconds: number;
  otpComplete: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  onOtpDigit: (index: number, value: string) => void;
  onOtpPaste: (e: React.ClipboardEvent<HTMLFormElement>) => void;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
};

function maskPhone(phone: string): string {
  const normalized = phone.trim().startsWith("0")
    ? `+233${phone.trim().slice(1)}`
    : phone.trim();
  if (normalized.length < 8) return normalized;
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

export function StaffLoginOtpForm({
  phone,
  smsSent = true,
  devOtp,
  otp,
  otpRefs,
  resendSeconds,
  otpComplete,
  isSubmitting,
  apiError,
  onOtpDigit,
  onOtpPaste,
  onVerify,
  onResend,
  onBack,
}: StaffLoginOtpFormProps) {
  return (
    <div className="flex flex-1 flex-col justify-center bg-background px-6 pb-12 pt-8 sm:px-10 lg:justify-start lg:px-16 lg:pb-16 lg:pt-14 xl:px-24">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-10 flex flex-col lg:hidden">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground">
            VentraPOS
          </div>
          <div className="mt-1.5 h-1 w-8 rounded-full bg-gradient-to-r from-[#006c49] to-[#059669]" />
        </div>

        <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Staff verification
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Enter the code
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {smsSent ? (
            <>
              We sent a 6-digit code via SMS to{" "}
              <span className="font-medium text-foreground">{maskPhone(phone)}</span> to confirm
              it&apos;s you.
            </>
          ) : (
            <>
              Enter the verification code for{" "}
              <span className="font-medium text-foreground">{maskPhone(phone)}</span>.
              SMS is not configured — use the code shown below (development only).
            </>
          )}
        </p>

        {devOtp && (
          <div
            className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
            role="status"
          >
            <span className="font-semibold">Development code:</span>{" "}
            <span className="font-mono text-base tracking-widest">{devOtp}</span>
          </div>
        )}

        <form
          onSubmit={onVerify}
          onPaste={onOtpPaste}
          className="mt-8 space-y-6 sm:mt-9"
        >
          <div>
            <p
              id="staff-otp-label"
              className="mb-3 text-[13px] font-medium text-muted-foreground"
            >
              One-time code
            </p>
            <div
              className="flex justify-between gap-2 sm:gap-3"
              role="group"
              aria-labelledby="staff-otp-label"
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1}`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onOtpDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  className="aspect-square w-full max-w-[3.25rem] rounded-xl border border-[#bfc9c3]/35 bg-surface-card text-center text-xl font-semibold tabular-nums text-foreground outline-none transition-[box-shadow,border-color] focus:border-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/25 dark:border-white/[0.12] dark:bg-[#171717] sm:max-w-none sm:flex-1"
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onResend}
            disabled={resendSeconds > 0}
            className="text-left text-[14px] font-medium text-[#006c49] transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline dark:text-[#6ffbbe]"
          >
            {resendSeconds > 0
              ? `Resend code in ${resendSeconds}s`
              : "Resend code"}
          </button>

          {apiError && (
            <p
              className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-600 dark:border-red-400/25 dark:bg-red-400/[0.08] dark:text-red-400"
              role="alert"
            >
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={!otpComplete || isSubmitting}
            className="w-full rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying…
              </span>
            ) : (
              "Verify & sign in"
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mt-8 w-full text-center text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
