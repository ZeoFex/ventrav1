import { z } from "zod";

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

export type PasswordChecks = {
  minLen: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export type PasswordRequirementKey = keyof PasswordChecks;

export function getPasswordChecks(
  password: string,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH
): PasswordChecks {
  return {
    minLen: password.length >= minLength,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(
  passwordOrChecks: string | PasswordChecks,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH
): boolean {
  const checks =
    typeof passwordOrChecks === "string"
      ? getPasswordChecks(passwordOrChecks, minLength)
      : passwordOrChecks;
  return Object.values(checks).every(Boolean);
}

export function getPasswordRuleRows(minLength = DEFAULT_PASSWORD_MIN_LENGTH) {
  return [
    { key: "minLen" as const, label: `At least ${minLength} characters` },
    { key: "upper" as const, label: "One uppercase letter" },
    { key: "lower" as const, label: "One lowercase letter" },
    { key: "number" as const, label: "One number" },
    { key: "special" as const, label: "One special character" },
  ];
}

export function createPasswordSchema(minLength = DEFAULT_PASSWORD_MIN_LENGTH) {
  return z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters`)
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character");
}
