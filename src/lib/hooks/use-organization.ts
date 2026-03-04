"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrganizationMember } from "@/lib/types";

const ORG_STORAGE_KEY = "aceverse_selected_org";

export function useOrganization() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function switchOrg(orgId: string) {
    localStorage.setItem(ORG_STORAGE_KEY, orgId);
    window.location.reload();
  }

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all org memberships with org data
      const { data: memberships, error: memErr } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, slug, plan, minutes_limit, minutes_used, timezone, created_at)")
        .eq("user_id", user.id);

      if (memErr) { setError(memErr.message); setLoading(false); return; }
      if (!memberships || memberships.length === 0) { setLoading(false); return; }

      const orgs = memberships
        .map((m) => m.organizations as unknown as Organization)
        .filter(Boolean);
      setOrganizations(orgs);

      // Pick selected org from localStorage or default to first
      const savedId = typeof window !== "undefined"
        ? localStorage.getItem(ORG_STORAGE_KEY)
        : null;
      const selected = orgs.find((o) => o.id === savedId) ?? orgs[0];
      setOrganization(selected);

      // Fetch members of selected org
      const { data: mems } = await supabase
        .from("organization_members")
        .select("*, user_profiles(*)")
        .eq("organization_id", selected.id);

      if (mems) setMembers(mems);
      setLoading(false);
    }

    fetchAll();
  }, []);

  return { organization, organizations, members, loading, error, switchOrg };
}
