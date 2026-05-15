"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Status = "idle" | "loading" | "success" | "error";

export function TeamInviteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        role: formData.get("role"),
      }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Invitation failed.");
      return;
    }

    form.reset();
    setStatus("success");
    setMessage("Invitation sent.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Invitations"
        title="Invite a member"
        description="Send a secure link to add a teammate."
      />
      <CardBody>
        <form onSubmit={inviteMember} className="space-y-4">
          <Field label="Email" required>
            <Input
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="teammate@example.com"
            />
          </Field>
          <Field label="Role">
            <Select name="role" defaultValue="member">
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>

          <Button
            type="submit"
            loading={status === "loading"}
            fullWidth
          >
            {status === "loading" ? "Sending invite" : "Send invite"}
          </Button>

          {message ? (
            <div
              role="status"
              className={`rounded-lg border px-3.5 py-2.5 text-[13px] ${
                status === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </div>
          ) : null}
        </form>
      </CardBody>
    </Card>
  );
}
