"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, CampaignContact } from "@/lib/types";

// ── Fetch campaigns for an organization ──
export function useCampaigns(orgId: string | undefined) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("campaigns")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCampaigns(data || []);
        setLoading(false);
      });
  }, [orgId]);

  return { campaigns, loading, setCampaigns };
}

// ── Fetch single campaign with contacts ──
export function useCampaign(campaignId: string | undefined) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();

    Promise.all([
      supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single(),
      supabase
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true }),
    ]).then(([campRes, contRes]) => {
      setCampaign(campRes.data);
      setContacts(contRes.data || []);
      setLoading(false);
    });
  }, [campaignId]);

  return { campaign, contacts, loading, setCampaign, setContacts };
}

// ── Create campaign ──
export async function createCampaign(
  orgId: string,
  agentId: string,
  workflowId: string | null,
  name: string
): Promise<{ campaign: Campaign | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: orgId,
      agent_id: agentId,
      workflow_id: workflowId,
      name,
    })
    .select()
    .single();

  if (error) return { campaign: null, error: error.message };
  return { campaign: data, error: null };
}

// ── Import contacts (bulk) ──
export async function importContacts(
  campaignId: string,
  contacts: { phone_number: string; name?: string; variables?: Record<string, unknown> }[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const rows = contacts.map((c) => ({
    campaign_id: campaignId,
    phone_number: c.phone_number,
    name: c.name || null,
    variables: c.variables || {},
  }));

  const { error } = await supabase
    .from("campaign_contacts")
    .insert(rows);

  if (error) return { error: error.message };

  // Update total count
  const { count } = await supabase
    .from("campaign_contacts")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await supabase
    .from("campaigns")
    .update({
      total_contacts: count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { error: null };
}

// ── Start campaign ──
export async function startCampaign(
  campaignId: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/campaigns/${campaignId}/start`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json();
    return { error: body.error || "Failed to start campaign" };
  }
  return { error: null };
}

// ── Pause campaign ──
export async function pauseCampaign(
  campaignId: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/campaigns/${campaignId}/pause`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json();
    return { error: body.error || "Failed to pause campaign" };
  }
  return { error: null };
}
