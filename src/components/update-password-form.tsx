"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const passwordPolicyMessage =
  "Password must include: 8+ length, uppercase letter, lowercase letter, number, and symbol.";

type LinkStatus = "checking" | "ready" | "invalid" | "expired";

function hashParams() {
  if (typeof window === "undefined" || !window.location.hash.startsWith("#")) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.slice(1));
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function statusMessage(status: LinkStatus) {
  if (status === "checking") return "Verifying your reset link...";
  if (status === "expired") return "Your reset link has expired. Request a new one.";
  if (status === "invalid") return "Use the link from your reset email to set a new password.";
  return "";
}

export function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function verifyResetLink() {
      const supabase = createClient();
      const searchParams = new URLSearchParams(window.location.search);
      const fragmentParams = hashParams();
      const tokenHash = searchParams.get("token_hash") ?? fragmentParams.get("token_hash");
      const accessToken = fragmentParams.get("access_token");
      const refreshToken = fragmentParams.get("refresh_token");
      const type = searchParams.get("type") ?? fragmentParams.get("type");

      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            throw new Error("missing-reset-session");
          }
        }

        if (!active) return;
        setLinkStatus("ready");
        setMessage("");
        window.history.replaceState(null, "", "/reset-password");
      } catch (error) {
        if (!active) return;
        const lower = error instanceof Error ? error.message.toLowerCase() : "";
        setLinkStatus(lower.includes("expired") ? "expired" : "invalid");
        setMessage(lower.includes("expired") ? statusMessage("expired") : statusMessage("invalid"));
      }
    }

    verifyResetLink();

    return () => {
      active = false;
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (linkStatus !== "ready") {
      setMessage(statusMessage(linkStatus));
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }

    if (!isStrongPassword(password)) {
      setLoading(false);
      setMessage(passwordPolicyMessage);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setMessage("Password could not be updated. Request a new reset link and try again.");
      return;
    }

    setSuccess(true);
    setMessage("Password updated!");
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1400);
  }

  if (success) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-slate-950">Password updated!</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your password has been successfully reset. Redirecting you to sign in...
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={updatePassword} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-950">HyperOptimal</h1>
        <p className="mt-2 text-sm text-slate-500">Set your new password</p>
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">New Password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="New password"
            disabled={linkStatus !== "ready"}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M2.75 12s3.4-6.25 9.25-6.25S21.25 12 21.25 12s-3.4 6.25-9.25 6.25S2.75 12 2.75 12Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
        </span>
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          Use 8+ characters with upper/lowercase, a number, and a symbol.
        </span>
      </label>

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            placeholder="Confirm new password"
            disabled={linkStatus !== "ready"}
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M2.75 12s3.4-6.25 9.25-6.25S21.25 12 21.25 12s-3.4 6.25-9.25 6.25S2.75 12 2.75 12Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || linkStatus !== "ready"}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Updating..." : linkStatus === "checking" ? "Verifying your reset link..." : "Update password"}
      </button>

      {message || linkStatus !== "ready" ? (
        <p
          className={`mt-4 rounded-lg border px-4 py-3 text-center text-sm font-medium ${
            linkStatus === "ready" && !message
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : linkStatus === "ready"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
          role="status"
        >
          {message || statusMessage(linkStatus)}
        </p>
      ) : null}
    </form>
  );
}
