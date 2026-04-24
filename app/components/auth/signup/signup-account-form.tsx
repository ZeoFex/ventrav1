import Link from "next/link";
import {
  CheckMini,
  IconBuilding,
  IconEnvelope,
  IconEye,
  IconEyeSlash,
  IconLock,
  IconUser,
} from "@/app/components/auth/auth-icons";
import { inputBase, inputPassword } from "@/app/components/auth/auth-input-classes";
import { CheckCircle2, Phone } from "lucide-react";

export type PasswordChecks = {
  minLen: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

type SignupAccountFormProps = {
  businessName: string;
  setBusinessName: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((s: boolean) => boolean)) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean | ((s: boolean) => boolean)) => void;
  acceptTerms: boolean;
  setAcceptTerms: (v: boolean) => void;
  passwordChecks: PasswordChecks;
  passwordValid: boolean;
  passwordsMatch: boolean;
  confirmHasError: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  isPaid?: boolean;
  selectedPlan?: string;
};

const ruleRows: { key: keyof PasswordChecks; label: string }[] = [
  { key: "minLen", label: "At least 8 characters" },
  { key: "upper", label: "One uppercase letter" },
  { key: "lower", label: "One lowercase letter" },
  { key: "number", label: "One number" },
  { key: "special", label: "One special character" },
];

export function SignupAccountForm({
  businessName,
  setBusinessName,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  acceptTerms,
  setAcceptTerms,
  passwordChecks,
  passwordValid,
  passwordsMatch,
  confirmHasError,
  isSubmitting,
  apiError,
  onSubmit,
  isPaid,
  selectedPlan,
}: SignupAccountFormProps) {
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
          Get started
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Create your account
        </h2>

        {isPaid && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#006c49]/5 p-4 border border-[#006c49]/20 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] dark:border-[#6ffbbe]/20 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wider">
                {selectedPlan} Plan Paid
              </p>
              <p className="text-[12px] opacity-80 mt-0.5">
                Plan will be activated automatically after verification.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4 sm:mt-9" noValidate>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconBuilding className="size-[1.125rem]" />
            </span>
            <label htmlFor="business" className="sr-only">
              Business name
            </label>
            <input
              id="business"
              name="business"
              type="text"
              autoComplete="organization"
              placeholder="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputBase}
              required
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconUser className="size-[1.125rem]" />
            </span>
            <label htmlFor="fullname" className="sr-only">
              Your name
            </label>
            <input
              id="fullname"
              name="fullname"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputBase}
              required
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <IconEnvelope className="size-[1.125rem]" />
            </span>
            <label htmlFor="email" className="sr-only">
              Work email
            </label>
            <input
              id="email"
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

          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Phone className="size-[1.125rem]" />
            </span>
            <label htmlFor="phone" className="sr-only">
              Phone number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputBase}
            />
          </div>

          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IconLock className="size-[1.125rem]" />
              </span>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
            {password.length > 0 && (
              <div className="mt-2 border-t border-[#bfc9c3]/20 pt-2 dark:border-white/[0.08]">
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    gridTemplateRows: passwordValid ? "0fr" : "1fr",
                  }}
                >
                  <div
                    className="min-h-0 overflow-hidden"
                    aria-hidden={passwordValid}
                  >
                    <ul className="space-y-1.5" aria-live="polite">
                      {ruleRows.map(({ key, label }) => (
                        <li
                          key={key}
                          className="flex items-start gap-2 text-[12px] leading-tight text-muted-foreground"
                        >
                          <CheckMini passed={passwordChecks[key]} />
                          <span
                            className={
                              passwordChecks[key]
                                ? "text-[#006c49] dark:text-[#6ffbbe]"
                                : ""
                            }
                          >
                            {label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    gridTemplateRows: passwordValid ? "1fr" : "0fr",
                  }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p
                      className="flex items-center gap-2 text-[12px] font-medium leading-tight text-[#006c49] dark:text-[#6ffbbe]"
                      role="status"
                      aria-live="polite"
                    >
                      <CheckMini passed />
                      All requirements met
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IconLock className="size-[1.125rem]" />
              </span>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputPassword}
                required
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#262626]"
                onClick={() => setShowConfirmPassword((s) => !s)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <IconEyeSlash className="size-5" />
                ) : (
                  <IconEye className="size-5" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p
                className={`mt-1.5 text-[13px] ${confirmHasError
                    ? "text-red-600 dark:text-red-400"
                    : passwordsMatch
                      ? "text-[#006c49] dark:text-[#6ffbbe]"
                      : "text-muted-foreground"
                  }`}
                role="status"
              >
                {confirmHasError
                  ? "Passwords do not match"
                  : passwordsMatch
                    ? "Passwords match"
                    : "Re-enter your password"}
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 pt-1 text-[14px] leading-snug text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-[#bfc9c3]/50 text-[#003527] focus:ring-[#95d3ba] dark:border-white/20"
              required
            />
            <span>
              I agree to the{" "}
              <Link
                href="/legal/terms"
                className="font-medium text-[#006c49] underline-offset-2 hover:underline dark:text-[#6ffbbe]"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="font-medium text-[#006c49] underline-offset-2 hover:underline dark:text-[#6ffbbe]"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {apiError && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-600 dark:border-red-400/25 dark:bg-red-400/[0.08] dark:text-red-400" role="alert">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={!passwordValid || !passwordsMatch || !acceptTerms || isSubmitting}
            className="w-full rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          Already have an account?{" "}
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
