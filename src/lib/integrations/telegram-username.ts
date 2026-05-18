const telegramUsernamePattern = /^[A-Za-z0-9_]{5,32}$/;

export function normalizeTelegramUsername(value: unknown) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  const withoutUrl = trimmed
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^t\.me\//i, "");
  const username = withoutUrl.split(/[/?#]/)[0]?.replace(/^@/, "").trim();

  if (!username || !telegramUsernamePattern.test(username)) {
    return "";
  }

  return `@${username}`;
}
