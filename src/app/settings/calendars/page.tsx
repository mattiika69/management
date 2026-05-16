import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getOrCreateDefaultOrganization } from "@/lib/auth/organization";
import { settingsTabs } from "@/lib/hyperoptimal/navigation";
import { listWorkspacePeople } from "@/lib/operations/people";
import { createClient } from "@/lib/supabase/server";

type EmployeeRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  role_title: string | null;
  calendar_email: string | null;
};

type CalendarRow = {
  account_email: string;
  display_name: string;
  provider: string;
  sync_enabled: boolean;
};

function roleLabel(role: string | null) {
  const normalized = role?.toLowerCase() ?? "";
  return normalized.includes("owner") ? "Owner" : role || "";
}

function isInternalBypassPerson(input: { name?: string | null; email?: string | null }) {
  const name = input.name?.trim().toLowerCase() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  return name === "auth bypass user" || email === "auth-bypass@hyperoptimal-management.test";
}

function providerLabel(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "microsoft") return "Outlook";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default async function CalendarSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings/calendars");
  }

  const organization = await getOrCreateDefaultOrganization(supabase, user);
  const [employeesResult, calendarsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id,user_id,full_name,email,role_title,calendar_email")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .order("full_name", { ascending: true })
      .returns<EmployeeRow[]>(),
    supabase
      .from("calendar_connections")
      .select("account_email,display_name,provider,sync_enabled")
      .eq("tenant_id", organization.id)
      .is("archived_at", null)
      .returns<CalendarRow[]>(),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (calendarsResult.error) throw new Error(calendarsResult.error.message);

  const workspacePeople = await listWorkspacePeople(supabase, organization.id, user);
  const peopleByKey = new Map(
    (employeesResult.data ?? [])
      .filter((employee) => !isInternalBypassPerson({ name: employee.full_name, email: employee.email }))
      .map((employee) => [
        employee.user_id ?? employee.email ?? employee.id,
        {
          id: employee.id,
          full_name: employee.full_name,
          email: employee.email,
          role_title: employee.role_title,
          calendar_email: employee.calendar_email,
        },
      ]),
  );

  for (const person of workspacePeople) {
    const key = person.userId ?? person.key;
    if (!peopleByKey.has(key)) {
      peopleByKey.set(key, {
        id: person.userId ?? person.key,
        full_name: person.name,
        email: null,
        role_title: person.role,
        calendar_email: null,
      });
    }
  }

  const calendarsByEmail = new Map(
    (calendarsResult.data ?? []).map((calendar) => [calendar.account_email.toLowerCase(), calendar]),
  );
  const employees = Array.from(peopleByKey.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <AppShell
      active="/settings/calendars"
      title="Calendars"
      subtitle="Manage team calendar access."
      tabs={settingsTabs}
    >
      <section className="settings-page">
        <div className="settings-title-rule">
          <h2 className="text-lg font-bold text-[#101828]">Calendars</h2>
        </div>

        <section className="settings-card overflow-hidden">
          <div className="settings-card-header">
            <h3 className="text-[13px] font-bold text-[#101828]">Team Calendar Assignments</h3>
          </div>

          <div className="divide-y divide-[#e4e7ec]">
            {employees.map((employee) => {
              const email = employee.calendar_email || employee.email;
              const calendar = email ? calendarsByEmail.get(email.toLowerCase()) : null;
              const role = roleLabel(employee.role_title);

              return (
                <div key={employee.id} className="grid min-h-[91px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-bold text-[#101828]">{employee.full_name}</p>
                      {role ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          {role}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-[#667085]">
                      {email ?? "No email on file"}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-[#98a2b3]">
                      {calendar
                        ? `${providerLabel(calendar.provider)} connected${calendar.sync_enabled ? "" : " · paused"}`
                        : "No calendar connected"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="app-button-secondary h-9 px-3 text-[11px]">
                      Connect Google
                    </button>
                    <button type="button" className="app-button-secondary h-9 px-3 text-[11px]">
                      Connect Outlook
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-[7px] border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!calendar}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
