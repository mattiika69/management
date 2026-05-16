"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type Field = {
  name: string;
  label: string;
  kind: "text" | "email" | "number" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

type Column = {
  key: string;
  label: string;
};

type Row = Record<string, unknown> & { id: string };

function labelValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replaceAll("_", " ");
}

export function ManagementEcosystemWorkspace({
  title,
  description,
  apiPath,
  createdKey,
  fields,
  columns,
  initialRows,
}: {
  title: string;
  description: string;
  apiPath: string;
  createdKey: string;
  fields: Field[];
  columns: Column[];
  initialRows: Row[];
}) {
  const emptyForm = Object.fromEntries(fields.map((field) => [field.name, field.options?.[0]?.value ?? ""]));
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as Record<string, Row | Row[] | string | undefined>;
    setSaving(false);

    if (!response.ok || !body[createdKey]) {
      setMessage(typeof body.error === "string" ? body.error : "Record could not be saved.");
      return;
    }

    setRows((current) => [body[createdKey] as Row, ...current]);
    setForm(emptyForm);
    setMessage("Saved.");
  }

  return (
    <section className="mx-auto w-full max-w-[1500px]">
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <form onSubmit={addRecord} className="app-card-pad">
          <h2 className="text-[17px] font-bold text-[#101828]">{title}</h2>
          <p className="mt-2 text-[13px] leading-6 text-[#667085]">{description}</p>
          <div className="mt-4 grid gap-3">
            {fields.map((field) => (
              <label key={field.name} className="app-label">
                {field.label}
                {field.kind === "select" ? (
                  <select
                    className="app-field normal-case"
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.kind === "textarea" ? (
                  <textarea
                    className="app-textarea min-h-[116px] normal-case"
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : (
                  <input
                    className="app-field normal-case"
                    type={field.kind}
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </label>
            ))}
          </div>
          <button disabled={saving} className="app-button-primary mt-5 w-full">
            {saving ? "Saving..." : "Save"}
          </button>
          {message ? <p className="mt-3 text-[12px] font-semibold text-[#475467]">{message}</p> : null}
        </form>

        <section className="app-card overflow-hidden">
          <div className="app-table-head grid gap-3 border-b border-[#e4e7ec] px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.length ? (
            rows.map((row) => (
              <div key={row.id} className="grid min-h-12 items-center gap-3 border-b border-[#edf0f5] px-4 py-3 text-[13px] text-[#475467] last:border-b-0 hover:bg-[#f8fafc]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {columns.map((column) => (
                  <span key={column.key} className="min-w-0 truncate capitalize">
                    {labelValue(row[column.key])}
                  </span>
                ))}
              </div>
            ))
          ) : (
            <p className="px-4 py-10 text-center text-[13px] font-medium text-[#667085]">No records yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
