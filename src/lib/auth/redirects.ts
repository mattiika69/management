export function safeRelativePath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }
  return trimmed;
}

export function redirectSearchParams(searchParams: URLSearchParams, fallback = "/") {
  return safeRelativePath(
    searchParams.get("redirect") ?? searchParams.get("next"),
    fallback,
  );
}
