import "server-only";

type NylasErrorBody = {
  request_id?: string;
  error?: {
    type?: string;
    message?: string;
  };
  message?: string;
};

export function getNylasApiBaseUrl() {
  const explicit = process.env.NYLAS_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const region = process.env.NYLAS_API_REGION?.trim().toLowerCase() || "us";
  return region === "eu" ? "https://api.eu.nylas.com" : "https://api.us.nylas.com";
}

export function getNylasClientId() {
  const clientId = process.env.NYLAS_CLIENT_ID?.trim();
  if (!clientId) throw new Error("Nylas client id is not configured.");
  return clientId;
}

export function getNylasApiKey() {
  const apiKey = process.env.NYLAS_API_KEY?.trim();
  if (!apiKey) throw new Error("Nylas API key is not configured.");
  return apiKey;
}

export function getNylasCalendarId() {
  return process.env.NYLAS_CALENDAR_ID?.trim() || "primary";
}

export async function nylasFetchJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getNylasApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getNylasApiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & NylasErrorBody;
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || "Nylas request failed.");
  }
  return body;
}
