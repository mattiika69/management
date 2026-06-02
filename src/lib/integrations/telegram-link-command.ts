const telegramStartCommandPattern = /^\/start(?:@[A-Za-z0-9_]+)?\s+([A-F0-9]+)$/i;

export function extractTelegramStartCode(text: string | null | undefined) {
  const match = text?.trim().match(telegramStartCommandPattern);
  return match?.[1]?.toUpperCase() ?? null;
}
