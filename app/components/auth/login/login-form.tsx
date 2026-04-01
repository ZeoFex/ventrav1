import Link from "next/link";
import {
  IconEnvelope,
  IconEye,
  IconEyeSlash,
  IconLock,
} from "@/app/components/auth/auth-icons";
import { inputBase, inputPassword } from "@/app/components/auth/auth-input-classes";

type LoginFormProps = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((s: boolean) => boolean)) => void;
  rememberDevice: boolean;
  setRememberDevice: (v: boolean) => void;
  isSubmitting?: boolean;
  apiError?: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberDevice,
  setRememberDevice,
  isSubmitting,
  apiError,
  onSubmit,
}: LoginFormProps) {
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
          Welcome back
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Sign in to VentraPOS
        </h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Enter your work email and password to continue.
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
            <label htmlFor="login-email" className="sr-only">
              Work email
            </label>
            <input
              id="login-email"
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

          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IconLock className="size-[1.125rem]" />
              </span>
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputPassword}
                required
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#262626]"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <IconEyeSlash className="size-5" />
                ) : (
                  <IconEye className="size-5" />
                )}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-[14px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="size-4 shrink-0 rounded border-[#bfc9c3]/50 text-[#003527] focus:ring-[#95d3ba] dark:border-white/20"
                />
                Remember this device
              </label>
              <Link
                href="/forgot-password"
                className="text-[14px] font-medium text-[#006c49] underline-offset-2 hover:underline dark:text-[#6ffbbe]"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
