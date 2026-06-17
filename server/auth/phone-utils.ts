/** Normalize Ghana phone numbers to E.164 (+233…) for lookup and SMS. */
export function normalizeGhanaPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  if (digits.startsWith("+233")) return digits;
  if (digits.startsWith("233") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return digits;
}

/** Digits-only form for indexed lookup (e.g. 233XXXXXXXXX). */
export function phoneNormalizedKey(phone: string): string {
  return normalizeGhanaPhone(phone).replace(/\D/g, "");
}

/** Internal email for staff accounts (not used for login). */
export function staffInternalEmail(businessId: string, phoneKey: string): string {
  return `staff.${phoneKey}.${businessId.slice(0, 8)}@ventrapos.internal`;
}

export function isStaffInternalEmail(email: string): boolean {
  return email.endsWith("@ventrapos.internal");
}
