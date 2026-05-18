"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SaveState = "idle" | "saving" | "saved" | "error";

function displayValue(value: string | null) {
  return value?.replace(/^@/, "") ?? "";
}

export function TelegramUsernameForm({
  connectionId,
  initialUsername,
}: {
  connectionId: string;
  initialUsername: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(displayValue(initialUsername));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const helperText = useMemo(() => {
    if (state === "saved") return "Username saved.";
    if (state === "error") return message || "Could not save username.";
    return "Use your Telegram username, without a phone number.";
  }, [message, state]);

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");

    const response = await fetch("/api/integrations/telegram/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionId,
        username,
      }),
    });
    const body = await response.json() as { error?: string; username?: string };

    if (!response.ok) {
      setState("error");
      setMessage(body.error ?? "Could not save username.");
      return;
    }

    setUsername(displayValue(body.username ?? username));
    setState("saved");
    router.refresh();
  }

  return (
    <form onSubmit={saveUsername} className="grid gap-2 sm:max-w-[360px]">
      <label htmlFor={`telegram-username-${connectionId}`} className="text-[12px] font-bold text-[#344054]">
        Telegram username
      </label>
      <div className="flex rounded-[7px] border border-[#cfd8e6] bg-white focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-blue-600/10">
        <span className="grid h-10 w-10 place-items-center border-r border-[#d9e1ee] text-[13px] font-bold text-[#667085]">
          @
        </span>
        <input
          id={`telegram-username-${connectionId}`}
          value={username}
          onChange={(event) => {
            setUsername(event.target.value.replace(/^@/, ""));
            if (state !== "idle") {
              setState("idle");
              setMessage("");
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-r-[7px] bg-transparent px-3 text-[13px] font-medium text-[#101828] outline-none placeholder:text-[#98a2b3]"
          autoComplete="username"
          placeholder="username"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === "saving"} className="settings-button-dark h-9">
          {state === "saving" ? "Saving..." : "Save username"}
        </button>
        <p
          className={`text-[12px] font-medium ${
            state === "error" ? "text-red-700" : state === "saved" ? "text-emerald-700" : "text-[#667085]"
          }`}
          role={state === "idle" ? undefined : "status"}
        >
          {helperText}
        </p>
      </div>
    </form>
  );
}
