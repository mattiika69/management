"use client";

import { FormEvent, useState } from "react";

type ProfileValues = {
  displayName: string;
  email: string;
  phoneNumber: string;
  timezone: string;
  jobTitle: string;
  department: string;
};

type Status = "idle" | "saving" | "saved" | "error";

export function ProfileSettingsForm({
  initialValues,
}: {
  initialValues: ProfileValues;
}) {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(body.error ?? "Profile could not be saved.");
      return;
    }

    setStatus("saved");
    setMessage("Changes saved.");
  }

  return (
    <form onSubmit={saveProfile} className="grid gap-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#8a35ff] text-[24px] font-bold text-white">
          {(values.displayName || values.email || "H").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#344054]">Profile Photo</p>
          <p className="mt-1 text-[11px] font-medium text-[#98a2b3]">JPG, PNG or GIF. Max 2MB</p>
          <button type="button" className="mt-3 h-8 rounded-[7px] bg-[#f2f4f7] px-3 text-[12px] font-semibold text-[#475467]">
            Upload Photo
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Display Name
          <input
            className="settings-field w-full"
            value={values.displayName}
            onChange={(event) => setValues({ ...values, displayName: event.currentTarget.value })}
            required
          />
        </label>
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Email Address
          <input className="settings-field w-full" value={values.email} disabled />
          <span className="text-[11px] font-medium text-[#98a2b3]">Email cannot be changed here</span>
        </label>
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Phone Number
          <input
            className="settings-field w-full"
            value={values.phoneNumber}
            onChange={(event) => setValues({ ...values, phoneNumber: event.currentTarget.value })}
            placeholder="+1 (555) 000-0000"
          />
        </label>
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Timezone
          <select
            className="settings-field w-full"
            value={values.timezone}
            onChange={(event) => setValues({ ...values, timezone: event.currentTarget.value })}
          >
            <option value="America/New_York">America/New York</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los Angeles</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Job Title
          <input
            className="settings-field w-full"
            value={values.jobTitle}
            onChange={(event) => setValues({ ...values, jobTitle: event.currentTarget.value })}
            placeholder="CEO, Sales Manager, etc."
          />
        </label>
        <label className="grid gap-2 text-[13px] font-semibold text-[#344054]">
          Department
          <select
            className="settings-field w-full"
            value={values.department}
            onChange={(event) => setValues({ ...values, department: event.currentTarget.value })}
          >
            <option value="">Select department</option>
            <option value="Leadership">Leadership</option>
            <option value="Operations">Operations</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Client Success">Client Success</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#e4e7ec] pt-4">
        {message ? (
          <p
            className={`text-[12px] font-semibold ${
              status === "error" ? "text-red-600" : "text-emerald-700"
            }`}
            role="status"
          >
            {message}
          </p>
        ) : null}
        <button type="submit" disabled={status === "saving"} className="settings-button-teal min-w-[130px]">
          {status === "saving" ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
