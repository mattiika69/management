import "server-only";

function cleanOrigin(value: string | undefined) {
  return value?.trim().replace(/\/$/, "") || "";
}

export function isLocalhostUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

function productionOrigin() {
  const configuredOrigin = cleanOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin && !isLocalhostUrl(configuredOrigin)) {
    return configuredOrigin;
  }

  const projectProductionUrl = cleanOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (projectProductionUrl) {
    return `https://${projectProductionUrl.replace(/^https?:\/\//, "")}`;
  }

  const deploymentUrl = cleanOrigin(process.env.VERCEL_URL);
  if (deploymentUrl) {
    return `https://${deploymentUrl.replace(/^https?:\/\//, "")}`;
  }

  return "";
}

export function canonicalSiteOrigin(request: Request) {
  const requestOrigin = cleanOrigin(new URL(request.url).origin);
  const safeProductionOrigin = productionOrigin();

  if (safeProductionOrigin) {
    return safeProductionOrigin;
  }

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    if (requestOrigin && !isLocalhostUrl(requestOrigin)) {
      return requestOrigin;
    }

    throw new Error("Public site URL is not configured.");
  }

  return requestOrigin || "http://localhost:3000";
}
