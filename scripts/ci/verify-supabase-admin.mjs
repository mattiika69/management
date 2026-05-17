const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required for Supabase admin verification.`);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

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
  try {
    await rest(`${table}?select=*&limit=1`);
  } catch (error) {
    throw new Error(`Required Supabase table check failed for ${table}: ${error.message}`);
  }
}

const admins = await rest("user_profiles?select=email,is_admin&is_admin=eq.true");
const adminEmails = admins
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
