"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrganizationMember } from "@/lib/types";

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let orgId: string | null = null;

      if (user) {
        // Get org membership for logged-in user
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membership) orgId = membership.organization_id;
      }

      // Fallback: get first org (for single-org setup or no auth)
      if (!orgId) {
        const { data: firstOrg } = await supabase
          .from("organizations")
          .select("*")
          .limit(1)
          .single();

        if (firstOrg) {
          setOrganization(firstOrg);
          orgId = firstOrg.id;
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        if (orgErr) setError(orgErr.message);
        else setOrganization(org);
      }

      // Fetch members
      if (orgId) {
        const { data: mems } = await supabase
          .from("organization_members")
          .select("*, user_profiles(*)")
          .eq("organization_id", orgId);

        if (mems) setMembers(mems);
      }

      setLoading(false);
    }

    fetch();
  }, []);

  return { organization, members, loading, error };
}
