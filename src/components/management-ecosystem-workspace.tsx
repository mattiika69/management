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
    <section className="mx-auto max-w-[1500px]">
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <form onSubmit={addRecord} className="rounded-[6px] border border-gray-300 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-[12px] leading-5 text-gray-500">{description}</p>
          <div className="mt-4 grid gap-3">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
                {field.label}
                {field.kind === "select" ? (
                  <select
                    className="h-9 rounded-[4px] border border-gray-300 px-2 text-[13px] font-medium normal-case text-gray-950"
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
                    className="min-h-[96px] rounded-[4px] border border-gray-300 px-3 py-2 text-[13px] font-medium normal-case text-gray-950"
                    value={form[field.name] ?? ""}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : (
                  <input
                    className="h-9 rounded-[4px] border border-gray-300 px-3 text-[13px] font-medium normal-case text-gray-950"
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
          <button disabled={saving} className="mt-4 h-9 w-full rounded-[5px] bg-gray-950 px-3 text-[13px] font-semibold text-white disabled:bg-gray-400">
            {saving ? "Saving..." : "Save"}
          </button>
          {message ? <p className="mt-3 text-[12px] font-medium text-gray-600">{message}</p> : null}
        </form>

        <section className="overflow-hidden rounded-[6px] border border-gray-300 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase text-gray-600" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.length ? (
            rows.map((row) => (
              <div key={row.id} className="grid gap-3 border-b border-gray-100 px-4 py-3 text-[12px] text-gray-700 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {columns.map((column) => (
                  <span key={column.key} className="min-w-0 truncate capitalize">
                    {labelValue(row[column.key])}
                  </span>
                ))}
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] text-gray-500">No records yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
