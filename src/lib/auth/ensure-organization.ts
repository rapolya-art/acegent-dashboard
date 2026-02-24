import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Ensures that a user has an organization. If not, creates one.
 * Uses service role client to bypass RLS.
 * Should be called server-side after authentication.
 */
export async function ensureOrganization(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const serviceClient = getServiceClient();

  // Check if user already has an organization
  const { data: existing } = await serviceClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) return existing.organization_id;

  // Derive org name from user metadata or email
  const fullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "My Organization";

  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create organization
  const { data: org, error: orgError } = await serviceClient
    .from("organizations")
    .insert({
      name: fullName,
      slug: `${slug}-${Date.now().toString(36)}`,
      plan: "starter",
      minutes_limit: 500,
      minutes_used: 0,
      timezone: "Europe/Kyiv",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("[ensureOrganization] Org creation failed:", orgError);
    return null;
  }

  // Create organization member (owner)
  await serviceClient.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  // Create/update user profile
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null;

  await serviceClient.from("user_profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      is_superadmin: false,
    },
    { onConflict: "id" }
  );

  return org.id;
}
