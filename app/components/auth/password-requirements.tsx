"use client";

import { useMemo } from "react";
import { CheckMini } from "@/app/components/auth/auth-icons";
import {
  DEFAULT_PASSWORD_MIN_LENGTH,
  getPasswordChecks,
  getPasswordRuleRows,
  isPasswordValid,
} from "@/lib/password-requirements";

type PasswordRequirementsProps = {
  password: string;
  minLength?: number;
  /** Hide until the user starts typing. Default false. */
  showWhenEmpty?: boolean;
  /** Collapse the rule list when all requirements pass (signup-style). Default false. */
  collapseWhenValid?: boolean;
  /** Use a collapsible panel under the field. Default true when collapseWhenValid is false. */
  collapsible?: boolean;
  className?: string;
};

export function PasswordRequirements({
  password,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
  showWhenEmpty = false,
  collapseWhenValid = false,
  collapsible = true,
  className = "",
}: PasswordRequirementsProps) {
  const checks = useMemo(
    () => getPasswordChecks(password, minLength),
    [password, minLength]
  );
  const valid = useMemo(() => isPasswordValid(checks), [checks]);
  const ruleRows = useMemo(() => getPasswordRuleRows(minLength), [minLength]);

  if (!showWhenEmpty && password.length === 0) {
    return null;
  }

  const checklist = (
    <ul className="space-y-1.5" aria-live="polite">
      {ruleRows.map(({ key, label }) => (
        <li
          key={key}
          className="flex items-start gap-2 text-[12px] leading-tight text-muted-foreground"
        >
          <CheckMini passed={checks[key]} />
          <span
            className={
              checks[key] ? "text-[#006c49] dark:text-[#6ffbbe]" : undefined
            }
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );

  const successRow = valid ? (
    <p
      className="mt-2 flex items-center gap-2 text-[12px] font-medium leading-tight text-[#006c49] dark:text-[#6ffbbe]"
      role="status"
      aria-live="polite"
    >
      <CheckMini passed />
      All requirements met
    </p>
  ) : null;

  if (collapseWhenValid) {
    return (
      <div
        className={`mt-2 border-t border-[#bfc9c3]/20 pt-2 dark:border-white/[0.08] ${className}`}
      >
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: valid ? "0fr" : "1fr" }}
        >
          <div className="min-h-0 overflow-hidden" aria-hidden={valid}>
            {checklist}
          </div>
        </div>
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: valid ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">{successRow}</div>
        </div>
      </div>
    );
  }

  const body = (
    <>
      {checklist}
      {successRow}
    </>
  );

  if (!collapsible) {
    return (
      <div
        className={`mt-2 border-t border-[#bfc9c3]/20 pt-2 dark:border-white/[0.08] ${className}`}
      >
        {body}
      </div>
    );
  }

  return (
    <details
      open={password.length > 0}
      className={`group mt-2 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-[#bfc9c3]/30 bg-[#f4f5f7]/80 px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-[#eef0f2] dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
        <span>Password requirements</span>
        <span
          className={`text-[10px] transition-transform group-open:rotate-180 ${valid ? "text-[#006c49] dark:text-[#6ffbbe]" : "opacity-60"}`}
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="mt-2 border-t border-[#bfc9c3]/20 pt-2 dark:border-white/[0.08]">
        {body}
      </div>
    </details>
  );
}
