import Link from "next/link";
import { IconEnvelope } from "@/app/components/auth/auth-icons";
import { inputBase } from "@/app/components/auth/auth-input-classes";

type ForgotPasswordRequestFormProps = {
  email: string;
  setEmail: (v: string) => void;
  isSubmitting?: boolean;
  apiError?: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function ForgotPasswordRequestForm({
  email,
  setEmail,
  isSubmitting,
  apiError,
  onSubmit,
}: ForgotPasswordRequestFormProps) {
  return (
    <div className="flex flex-1 flex-col justify-center bg-background px-6 pb-12 pt-8 sm:px-10 lg:justify-start lg:px-16 lg:pb-16 lg:pt-14 xl:px-24">
      <div className="mx-auto w-full max-w-[420px]">
        {/* Mobile Brand Header */}
        <div className="mb-10 flex flex-col lg:hidden">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground"
          >
            VentraPOS
          </Link>
          <div className="mt-1.5 h-1 w-8 rounded-full bg-gradient-to-r from-[#006c49] to-[#059669]" />
        </div>

        <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Account recovery
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Reset your password
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Enter the email you use for VentraPOS. We&apos;ll send a link to reset
          your password.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 sm:mt-9" noValidate>
          {apiError && (
            <div className="rounded-xl bg-red-500/10 p-4 text-[13px] font-medium text-red-600 dark:text-red-400">
              {apiError}
            </div>
          )}
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconEnvelope className="size-[1.125rem]" />
            </span>
            <label htmlFor="forgot-email" className="sr-only">
              Work email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputBase}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!email.trim() || isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            {isSubmitting ? (
              <>
                <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
