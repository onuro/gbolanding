// Shared by both forms and their endpoints. Keep the visitor's formatting
// while accepting local and international numbers with common separators.
export const phoneMaxLength = 40;

export function validatePhone(
  input: unknown,
): { ok: true; value: string } | { ok: false; error: "required" | "invalid" } {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return { ok: false, error: "required" };

  const digits = value.replace(/\D/g, "");
  if (
    value.length > phoneMaxLength ||
    !/^\+?[0-9() .-]+$/.test(value) ||
    digits.length < 7 ||
    digits.length > 15
  ) {
    return { ok: false, error: "invalid" };
  }

  return { ok: true, value };
}
