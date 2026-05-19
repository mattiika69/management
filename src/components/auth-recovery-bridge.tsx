"use client";

import { useEffect } from "react";

function recoveryHashTarget() {
  if (typeof window === "undefined" || !window.location.hash.startsWith("#")) {
    return "";
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const tokenHash = params.get("token_hash");

  if (type !== "recovery") return "";
  if (!tokenHash && (!accessToken || !refreshToken)) return "";

  return `/update-password${window.location.hash}`;
}

export function AuthRecoveryBridge() {
  useEffect(() => {
    const target = recoveryHashTarget();
    if (!target || window.location.pathname === "/update-password") return;

    window.location.replace(target);
  }, []);

  return null;
}
