import "server-only";

type RoezanMessageInput = {
  phone: string;
  message: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  media?: string[];
};

export type RoezanSendResult = {
  ok: boolean;
  status: number;
  data: unknown;
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
  };
};

function parseRateLimit(value: string | null) {
  return value ? Number(value) : null;
}

export async function sendRoezanMessage(input: RoezanMessageInput) {
  const apiKey = process.env.ROEZAN_API_KEY;

  if (!apiKey) {
    throw new Error("ROEZAN_API_KEY is not configured.");
  }

  const baseUrl = (
    process.env.ROEZAN_API_BASE_URL ?? "https://app.roezan.com"
  ).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/integrations/message/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      phone: input.phone,
      message: input.message,
      firstName: input.firstName ?? "",
      lastName: input.lastName ?? "",
      email: input.email ?? "",
      media: input.media ?? [],
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  const result: RoezanSendResult = {
    ok: response.ok,
    status: response.status,
    data,
    rateLimit: {
      limit: parseRateLimit(response.headers.get("ratelimit-limit")),
      remaining: parseRateLimit(response.headers.get("ratelimit-remaining")),
      reset: parseRateLimit(response.headers.get("ratelimit-reset")),
    },
  };

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String(data.message)
        : `Roezan request failed with status ${response.status}.`;
    throw Object.assign(new Error(message), { result });
  }

  return result;
}
