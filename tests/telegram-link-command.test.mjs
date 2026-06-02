import assert from "node:assert/strict";
import { test } from "node:test";
import { extractTelegramStartCode } from "../src/lib/integrations/telegram-link-command.ts";

test("extracts Telegram link codes from private and group start commands", () => {
  assert.equal(extractTelegramStartCode("/start ABC123"), "ABC123");
  assert.equal(extractTelegramStartCode("/start@HyperOptimalBot abc123"), "ABC123");
  assert.equal(extractTelegramStartCode("  /start@hyperoptimal_bot 00ffAA  "), "00FFAA");
});

test("ignores non-start Telegram messages", () => {
  assert.equal(extractTelegramStartCode("/help ABC123"), null);
  assert.equal(extractTelegramStartCode("/start"), null);
  assert.equal(extractTelegramStartCode("hello /start ABC123"), null);
  assert.equal(extractTelegramStartCode(null), null);
});
