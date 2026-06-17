import { z } from "zod";

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

/** User-facing validation copy (not credentials). */
const RULE_MESSAGES = {
  minLength: (min: number) => `At least ${min} characters`,
  uppercase: "One uppercase letter",
  lowercase: "One lowercase letter",
  number: "One number",
  special: "One special character",
} as const;

export type PasswordChecks = {
  minLen: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export type PasswordRequirementKey = keyof PasswordChecks;

export function getPasswordChecks(
  value: string,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH
): PasswordChecks {
  return {
    minLen: value.length >= minLength,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
  };
}

export function isPasswordValid(
  inputOrChecks: string | PasswordChecks,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH
): boolean {
  const checks =
    typeof inputOrChecks === "string"
      ? getPasswordChecks(inputOrChecks, minLength)
      : inputOrChecks;
  return Object.values(checks).every(Boolean);
}

export function getPasswordRuleRows(minLength = DEFAULT_PASSWORD_MIN_LENGTH) {
  return [
    { key: "minLen" as const, label: RULE_MESSAGES.minLength(minLength) },
    { key: "upper" as const, label: RULE_MESSAGES.uppercase },
    { key: "lower" as const, label: RULE_MESSAGES.lowercase },
    { key: "number" as const, label: RULE_MESSAGES.number },
    { key: "special" as const, label: RULE_MESSAGES.special },
  ];
}

export function createPasswordSchema(minLength = DEFAULT_PASSWORD_MIN_LENGTH) {
  return z
    .string()
    .min(minLength, RULE_MESSAGES.minLength(minLength))
    .max(128)
    .regex(/[A-Z]/, RULE_MESSAGES.uppercase)
    .regex(/[a-z]/, RULE_MESSAGES.lowercase)
    .regex(/\d/, RULE_MESSAGES.number)
    .regex(/[^A-Za-z0-9]/, RULE_MESSAGES.special);
}
