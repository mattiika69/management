"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export type EmployeeRow = {
  id: string;
  full_name: string;
  email: string | null;
  role_title: string;
  department: string;
  employment_status: string;
  calendar_email: string | null;
  timezone: string;
};

const emptyForm = {
  fullName: "",
  email: "",
  roleTitle: "",
  department: "",
  employmentStatus: "active",
  calendarEmail: "",
  timezone: "America/New_York",
};

export function EmployeesSettings({
  initialEmployees,
  canManage,
}: {
  initialEmployees: EmployeeRow[];
  canManage: boolean;
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { employee?: EmployeeRow; error?: string };
    setSaving(false);

    if (!response.ok || !body.employee) {
      setMessage(body.error ?? "Employee could not be saved.");
      return;
    }

    setEmployees((current) => [...current, body.employee as EmployeeRow].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setForm(emptyForm);
    setMessage("Employee saved.");
  }

  async function archiveEmployee(id: string) {
    if (!canManage) return;
    const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Employee could not be archived.");
      return;
    }
    setEmployees((current) => current.filter((employee) => employee.id !== id));
    setMessage("Employee archived.");
  }

  return (
    <section className="settings-page">
      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={addEmployee} className="settings-card-pad">
          <h2 className="text-[15px] font-bold text-gray-950">Add Employee</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Name
              <input className="settings-field w-full normal-case" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Full name" required />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Email
              <input className="settings-field w-full normal-case" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Role
              <input className="settings-field w-full normal-case" value={form.roleTitle} onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} placeholder="Sales Manager" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
                Department
                <input className="settings-field w-full normal-case" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} placeholder="Operations" />
              </label>
              <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
                Status
                <select className="settings-field w-full normal-case" value={form.employmentStatus} onChange={(event) => setForm({ ...form, employmentStatus: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="contractor">Contractor</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Calendar Email
              <input className="settings-field w-full normal-case" type="email" value={form.calendarEmail} onChange={(event) => setForm({ ...form, calendarEmail: event.target.value })} placeholder="calendar@company.com" />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase text-gray-600">
              Timezone
              <input className="settings-field w-full normal-case" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
            </label>
          </div>
          <button disabled={!canManage || saving} className="settings-button-dark mt-4 w-full">
            {saving ? "Saving..." : "Add Employee"}
          </button>
          {message ? <p className="mt-3 text-[12px] font-medium text-gray-600">{message}</p> : null}
        </form>

        <section className="settings-card overflow-hidden">
          <div className="settings-table-head grid grid-cols-[1.1fr_1fr_0.8fr_0.7fr_72px] gap-3 border-b border-[#ebe3d8] px-4 py-3">
            <span>Employee</span>
            <span>Role</span>
            <span>Department</span>
            <span>Status</span>
            <span />
          </div>
          {employees.length ? (
            employees.map((employee) => (
              <div key={employee.id} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.7fr_72px] gap-3 border-b border-gray-100 px-4 py-3 text-[12px] text-gray-700 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-950">{employee.full_name}</p>
                  <p className="truncate text-[11px] text-gray-500">{employee.email ?? employee.calendar_email ?? ""}</p>
                </div>
                <span className="truncate">{employee.role_title || "-"}</span>
                <span className="truncate">{employee.department || "-"}</span>
                <span className="capitalize">{employee.employment_status}</span>
                <button type="button" onClick={() => archiveEmployee(employee.id)} className="text-right text-[11px] font-semibold text-red-600">
                  Archive
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-[13px] text-gray-500">No employees added yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
