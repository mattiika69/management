const passwordChecks = [
  { label: "8+ length", test: (value: string) => value.length >= 8 },
  { label: "uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "number", test: (value: string) => /\d/.test(value) },
  { label: "symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const passwordPolicyMessage =
  "Password must include: 8+ length, uppercase letter, lowercase letter, number, and symbol.";

export function passwordPolicyFailures(password: string) {
  return passwordChecks
    .filter((check) => !check.test(password))
    .map((check) => check.label);
}

export function isStrongPassword(password: string) {
  return passwordPolicyFailures(password).length === 0;
}

export function cleanPersonName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n<>]/g, "").trim().slice(0, 80);
}

export function cleanOrganizationName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n<>]/g, "").trim().slice(0, 120);
}
