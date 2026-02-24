"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PhoneNumber } from "@/lib/types";

export function usePhoneNumbers(orgId: string | undefined) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function fetch() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("phone_numbers")
        .select("*, agents(name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      if (err) setError(err.message);
      else setPhoneNumbers(data || []);
      setLoading(false);
    }

    fetch();
  }, [orgId]);

  return { phoneNumbers, loading, error };
}
