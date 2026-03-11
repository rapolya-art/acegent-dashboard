"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus, Call } from "@/lib/types";

// ── Fetch leads for an organization ──
export function useLeads(
  orgId: string | undefined,
  filters?: { search?: string; status?: LeadStatus | "all" }
) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      query = query.or(
        `phone.ilike.%${filters.search}%,name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
      );
    }

    query.then(({ data, count }) => {
      setLeads(data || []);
      setTotal(count || 0);
      setLoading(false);
    });
  }, [orgId, filters?.search, filters?.status]);

  useEffect(() => {
    load();
  }, [load]);

  return { leads, total, loading, setLeads, refetch: load };
}

// ── Fetch single lead ──
export function useLead(leadId: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single()
      .then(({ data }) => {
        setLead(data);
        setLoading(false);
      });
  }, [leadId]);

  return { lead, loading, setLead };
}

// ── Fetch calls for a lead ──
export function useLeadCalls(leadId: string | undefined) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("calls")
      .select("*, agents(name)")
      .eq("lead_id", leadId)
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setCalls(data || []);
        setLoading(false);
      });
  }, [leadId]);

  return { calls, loading };
}

// ── Lead stats (count per status) ──
export function useLeadStats(orgId: string | undefined) {
  const [stats, setStats] = useState<Record<LeadStatus, number>>({
    new: 0,
    contacted: 0,
    qualified: 0,
    appointment: 0,
    won: 0,
    lost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("leads")
      .select("status")
      .eq("organization_id", orgId)
      .then(({ data }) => {
        const counts: Record<string, number> = {
          new: 0,
          contacted: 0,
          qualified: 0,
          appointment: 0,
          won: 0,
          lost: 0,
        };
        (data || []).forEach((row) => {
          if (row.status in counts) counts[row.status]++;
        });
        setStats(counts as Record<LeadStatus, number>);
        setLoading(false);
      });
  }, [orgId]);

  return { stats, loading };
}

// ── Create lead ──
export async function createLead(
  orgId: string,
  data: {
    phone: string;
    name?: string;
    email?: string;
    company?: string;
    position?: string;
    tags?: string[];
    notes?: string;
    custom_fields?: Record<string, unknown>;
    source?: string;
  }
): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: orgId,
      phone: data.phone,
      name: data.name || null,
      email: data.email || null,
      company: data.company || null,
      position: data.position || null,
      tags: data.tags || [],
      notes: data.notes || null,
      custom_fields: data.custom_fields || {},
      source: data.source || "manual",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { lead: null, error: "Лід з таким телефоном вже існує" };
    }
    return { lead: null, error: error.message };
  }
  return { lead, error: null };
}

// ── Update lead ──
export async function updateLead(
  leadId: string,
  data: Partial<Lead>
): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single();

  if (error) return { lead: null, error: error.message };
  return { lead, error: null };
}

// ── Delete lead ──
export async function deleteLead(
  leadId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Bulk import leads ──
export async function bulkImportLeads(
  orgId: string,
  leads: Record<string, unknown>[]
): Promise<{ inserted: number; skipped: number; error: string | null }> {
  const res = await fetch("/api/leads/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: orgId, leads }),
  });

  if (!res.ok) {
    const body = await res.json();
    return { inserted: 0, skipped: 0, error: body.error || "Import failed" };
  }

  const body = await res.json();
  return { inserted: body.inserted, skipped: body.skipped, error: null };
}
