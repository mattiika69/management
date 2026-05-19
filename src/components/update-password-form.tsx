"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LinkStatus = "checking" | "ready" | "error";

function hashParams() {
  if (typeof window === "undefined" || !window.location.hash.startsWith("#")) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.slice(1));
}

export function UpdatePasswordForm() {
  const [message, setMessage] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function verifyResetLink() {
      const supabase = createClient();
      const searchParams = new URLSearchParams(window.location.search);
      const fragmentParams = hashParams();
      const tokenHash =
        searchParams.get("token_hash") ?? fragmentParams.get("token_hash");
      const accessToken = fragmentParams.get("access_token");
      const refreshToken = fragmentParams.get("refresh_token");

      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
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
            throw new Error("Open the password reset link from your email.");
          }
        }

        if (!active) return;
        setLinkStatus("ready");
        setMessage("");
        window.history.replaceState(null, "", "/update-password");
      } catch {
        if (!active) return;
        setLinkStatus("error");
        setMessage("This reset link is invalid or expired. Send yourself a new reset link.");
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
      setMessage("Open the password reset link from your email before setting a new password.");
      return;
    }

    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setMessage("Password could not be updated. Send a new reset link and try again.");
      return;
    }

    setMessage("Password updated.");
    router.push("/management");
    router.refresh();
  }

  return (
    <form
      onSubmit={updatePassword}
      className="border border-[#d9d7cb] bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#171717]">Update password</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d5d55]">
          Choose a new password for your HyperOptimal Management account.
        </p>
      </div>

      <label className="mb-5 block">
        <span className="mb-2 block text-sm font-medium text-[#34342f]">
          New password
        </span>
        <input
          required
          minLength={8}
          name="password"
          type="password"
          autoComplete="new-password"
          className="w-full border border-[#c9c6b8] px-4 py-3 outline-none focus:border-[#0f766e]"
          placeholder="At least 8 characters"
        />
      </label>

      <button
        type="submit"
        disabled={loading || linkStatus !== "ready"}
        className="w-full bg-[#0f766e] px-5 py-3 font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading
          ? "Updating..."
          : linkStatus === "checking"
            ? "Checking reset link..."
            : "Update password"}
      </button>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            linkStatus === "error" ? "text-red-700" : "text-[#0f766e]"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
