"use client";

import { useEffect, useState, useCallback } from "react";
import type { CalendarIntegration } from "@/lib/types";

export function useCalendarIntegrations(orgId: string | undefined) {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/integrations/calendar?org_id=${orgId}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to fetch integrations");
      } else {
        const data = await res.json();
        setIntegrations(data || []);
      }
    } catch (e) {
      setError("Failed to fetch integrations");
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  async function addIntegration(params: {
    apiKey: string;
    agentId: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    if (!orgId) return { success: false, error: "No organization" };

    try {
      const res = await fetch("/api/integrations/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          agent_id: params.agentId,
          api_key: params.apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to add integration" };
      }

      await fetchIntegrations();
      return { success: true };
    } catch (e) {
      return { success: false, error: "Не вдалось підключитися до Calendly" };
    }
  }

  async function removeIntegration(id: string) {
    await fetch(`/api/integrations/calendar?id=${id}`, { method: "DELETE" });
    await fetchIntegrations();
  }

  function startGoogleOAuth(agentId: string | null) {
    const params = new URLSearchParams({
      org_id: orgId || "",
      agent_id: agentId || "",
    });
    window.location.href = `/api/integrations/google/auth?${params.toString()}`;
  }

  return { integrations, loading, error, addIntegration, startGoogleOAuth, removeIntegration, refetch: fetchIntegrations };
}
