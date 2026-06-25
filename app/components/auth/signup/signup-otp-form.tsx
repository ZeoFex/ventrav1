import type { MutableRefObject } from "react";

type SignupOtpFormProps = {
  email: string;
  phone?: string;
  otpChannel: "email" | "sms";
  otp: string[];
  otpRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  resendSeconds: number;
  otpComplete: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  devOtpHint?: string | null;
  onOtpDigit: (index: number, value: string) => void;
  onOtpPaste: (e: React.ClipboardEvent<HTMLFormElement>) => void;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  onSwitchChannel: (channel: "email" | "sms") => void;
  onBack: () => void;
};

function maskPhone(phone: string): string {
  const normalized = phone.trim().startsWith("0")
    ? `+233${phone.trim().slice(1)}`
    : phone.trim();
  if (normalized.length < 8) return normalized;
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

export function SignupOtpForm({
  email,
  phone,
  otpChannel,
  otp,
  otpRefs,
  resendSeconds,
  otpComplete,
  isSubmitting,
  apiError,
  devOtpHint,
  onOtpDigit,
  onOtpPaste,
  onVerify,
  onResend,
  onSwitchChannel,
  onBack,
}: SignupOtpFormProps) {
  const isSms = otpChannel === "sms";
  const hasPhone = !!phone?.trim();

  return (
    <div className="flex flex-1 flex-col justify-center bg-background px-6 pb-12 pt-8 sm:px-10 lg:justify-start lg:px-16 lg:pb-16 lg:pt-14 xl:px-24">
      <div className="mx-auto w-full max-w-[420px]">
        {/* Mobile Brand Header */}
        <div className="mb-10 flex flex-col lg:hidden">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground">
            VentraPOS
          </div>
          <div className="mt-1.5 h-1 w-8 rounded-full bg-gradient-to-r from-[#006c49] to-[#059669]" />
        </div>

        <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Verification
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Enter the code
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {isSms ? (
            <>
              We sent a 6-digit code via SMS to{" "}
              <span className="font-medium text-foreground">
                {phone ? maskPhone(phone) : "your phone"}
              </span>
              .
            </>
          ) : (
            <>
              We sent a 6-digit code and a one-click verification link to{" "}
              <span className="font-medium text-foreground">
                {email || "your email"}
              </span>
              . Enter the code below or tap the link in your email.
            </>
          )}
        </p>

        {devOtpHint ? (
          <p className="mt-4 rounded-xl border border-[#95d3ba]/40 bg-[#003527]/5 px-4 py-3 text-[13px] leading-relaxed text-[#006c49] dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
            {devOtpHint}
          </p>
        ) : null}

        <form
          onSubmit={onVerify}
          onPaste={onOtpPaste}
          className="mt-8 space-y-6 sm:mt-9"
        >
          <div>
            <p
              id="otp-label"
              className="mb-3 text-[13px] font-medium text-muted-foreground"
            >
              One-time code
            </p>
            <div
              className="flex justify-between gap-2 sm:gap-3"
              role="group"
              aria-labelledby="otp-label"
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

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            </div>

            {/* Channel switch */}
            {isSms ? (
              <button
                type="button"
                onClick={() => onSwitchChannel("email")}
                disabled={resendSeconds > 0}
                className="text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send via email instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSwitchChannel("sms")}
                disabled={!hasPhone || resendSeconds > 0}
                title={!hasPhone ? "Add a phone number on the sign-up form to use SMS verification" : undefined}
                className="text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {hasPhone ? "Send via SMS instead" : "Send via SMS (add a phone number to enable)"}
              </button>
            )}
          </div>

          {apiError && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-600 dark:border-red-400/25 dark:bg-red-400/[0.08] dark:text-red-400" role="alert">
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
              "Verify & continue"
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mt-8 w-full text-center text-[14px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to account details
        </button>
      </div>
    </div>
  );
}
