import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for Supabase admin verification.`);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const requiredTables = [
  "user_profiles",
  "tenants",
  "tenant_memberships",
  "tenant_invitations",
  "admin_audit_log",
  "billing_customers",
  "billing_subscriptions",
  "billing_events",
];

for (const table of requiredTables) {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Required Supabase table check failed for ${table}: ${error.message}`);
  }
}

const { data: admins, error: adminError } = await supabase
  .from("user_profiles")
  .select("email,is_admin")
  .eq("is_admin", true);

if (adminError) {
  throw new Error(`Admin profile check failed: ${adminError.message}`);
}

const adminEmails = (admins ?? [])
  .map((profile) => profile.email?.toLowerCase())
  .filter(Boolean);

if (!adminEmails.includes("matt@1000xleads.com")) {
  throw new Error("matt@1000xleads.com is not marked as an admin in user_profiles.");
}

const unexpectedAdmins = adminEmails.filter(
  (email) => email !== "matt@1000xleads.com",
);

if (unexpectedAdmins.length) {
  throw new Error(
    `Unexpected MVP admin users found: ${unexpectedAdmins.join(", ")}`,
  );
}

console.log("Supabase admin verification passed.");
