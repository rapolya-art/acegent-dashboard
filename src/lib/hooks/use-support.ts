"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportTicket } from "@/lib/types";

export function useTickets(orgId: string | undefined) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function fetch() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (err) setError(err.message);
      else setTickets(data || []);
      setLoading(false);
    }

    fetch();
  }, [orgId]);

  return { tickets, loading, error };
}
