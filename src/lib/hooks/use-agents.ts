"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Agent, AgentTool } from "@/lib/types";

export type AgentInsert = Omit<
  Agent,
  "id" | "total_calls" | "success_rate" | "avg_duration_seconds" | "created_at" | "updated_at"
>;

export type AgentUpdate = Partial<Omit<Agent, "id" | "organization_id" | "created_at" | "updated_at">>;

export async function createAgent(data: AgentInsert): Promise<{ agent: Agent | null; error: string | null }> {
  const supabase = createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .insert(data)
    .select("*")
    .single();

  if (error) return { agent: null, error: error.message };
  return { agent, error: null };
}

export async function updateAgent(
  agentId: string,
  data: AgentUpdate
): Promise<{ agent: Agent | null; error: string | null }> {
  const supabase = createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .update(data)
    .eq("id", agentId)
    .select("*")
    .single();

  if (error) return { agent: null, error: error.message };
  return { agent, error: null };
}

export function useAgents(orgId: string | undefined) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("agents")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (err) setError(err.message);
    else setAgents(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    fetchAgents();
  }, [orgId, fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }

    async function fetch() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (err) setError(err.message);
      else setAgent(data);
      setLoading(false);
    }

    fetch();
  }, [agentId]);

  return { agent, loading, error };
}

export function useAgentTools(agentId: string | undefined) {
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }

    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("agent_tools")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true });

      setTools(data || []);
      setLoading(false);
    }

    fetch();
  }, [agentId]);

  return { tools, loading, setTools };
}

export async function updateAgentTool(
  toolId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("agent_tools")
    .update({ enabled })
    .eq("id", toolId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function createAgentTool(
  agentId: string,
  name: string,
  description: string
): Promise<{ tool: AgentTool | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_tools")
    .insert({ agent_id: agentId, name, description, enabled: true, parameters: {} })
    .select()
    .single();

  if (error) return { tool: null, error: error.message };
  return { tool: data, error: null };
}

export async function deleteAgentTool(
  toolId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("agent_tools")
    .delete()
    .eq("id", toolId);

  if (error) return { error: error.message };
  return { error: null };
}
