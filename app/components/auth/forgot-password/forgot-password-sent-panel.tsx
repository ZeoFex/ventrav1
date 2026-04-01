import Link from "next/link";

type ForgotPasswordSentPanelProps = {
  email: string;
  maskedEmail: string;
  resendSeconds: number;
  onResend: () => void;
  onUseDifferentEmail: () => void;
};

export function ForgotPasswordSentPanel({
  email,
  maskedEmail,
  resendSeconds,
  onResend,
  onUseDifferentEmail,
}: ForgotPasswordSentPanelProps) {
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
          Check your inbox
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Link sent
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground" title={email}>
            {maskedEmail}
          </span>
          , you&apos;ll receive an email with a link to reset your password.
          Check spam or promotions if you don&apos;t see it within a few minutes.
        </p>

        <div className="mt-8 rounded-xl border border-[#bfc9c3]/25 bg-surface-card/80 px-4 py-4 dark:border-white/[0.1] dark:bg-[#171717]/80">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The link expires after a short time for your security. Request a new
            one below if needed.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onResend}
            disabled={resendSeconds > 0}
            className="text-left text-[14px] font-medium text-[#006c49] transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline dark:text-[#6ffbbe]"
          >
            {resendSeconds > 0
              ? `Resend email in ${resendSeconds}s`
              : "Resend email"}
          </button>
          <button
            type="button"
            onClick={onUseDifferentEmail}
            className="text-left text-[14px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:text-right"
          >
            Use a different email
          </button>
        </div>

        <Link
          href="/login"
          className="mt-10 flex w-full items-center justify-center rounded-full border border-[#bfc9c3]/35 bg-transparent py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-elevated dark:border-white/[0.12]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
