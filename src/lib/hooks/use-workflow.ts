"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Workflow, WorkflowNode, WorkflowEdge } from "@/lib/types";

// ── Fetch workflow by ID ──
export function useWorkflow(workflowId: string | undefined) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()
      .then(({ data }) => {
        setWorkflow(data);
        setLoading(false);
      });
  }, [workflowId]);

  return { workflow, loading, setWorkflow };
}

// ── Fetch workflow for an agent ──
export function useAgentWorkflow(agentId: string | undefined) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("workflows")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setWorkflow(data?.[0] || null);
        setLoading(false);
      });
  }, [agentId]);

  return { workflow, loading, setWorkflow };
}

// ── Fetch nodes for a workflow ──
export function useWorkflowNodes(workflowId: string | undefined) {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("workflow_nodes")
      .select("*")
      .eq("workflow_id", workflowId)
      .then(({ data }) => {
        setNodes(data || []);
        setLoading(false);
      });
  }, [workflowId]);

  return { nodes, loading, setNodes };
}

// ── Fetch edges for a workflow ──
export function useWorkflowEdges(workflowId: string | undefined) {
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("workflow_edges")
      .select("*")
      .eq("workflow_id", workflowId)
      .then(({ data }) => {
        setEdges(data || []);
        setLoading(false);
      });
  }, [workflowId]);

  return { edges, loading, setEdges };
}

// ── Create workflow ──
export async function createWorkflow(
  agentId: string,
  orgId: string,
  name: string
): Promise<{ workflow: Workflow | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert({
      agent_id: agentId,
      organization_id: orgId,
      name,
    })
    .select()
    .single();

  if (error) return { workflow: null, error: error.message };
  return { workflow: data, error: null };
}

// ── Save workflow nodes + edges (bulk upsert: delete all, insert all) ──
export async function saveWorkflowGraph(
  workflowId: string,
  nodes: Omit<WorkflowNode, "created_at">[],
  edges: Omit<WorkflowEdge, "created_at">[],
  viewport: { x: number; y: number; zoom: number }
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Delete existing nodes & edges
  const { error: delEdges } = await supabase
    .from("workflow_edges")
    .delete()
    .eq("workflow_id", workflowId);
  if (delEdges) return { error: delEdges.message };

  const { error: delNodes } = await supabase
    .from("workflow_nodes")
    .delete()
    .eq("workflow_id", workflowId);
  if (delNodes) return { error: delNodes.message };

  // Insert new nodes
  if (nodes.length > 0) {
    const { error: insNodes } = await supabase
      .from("workflow_nodes")
      .insert(nodes);
    if (insNodes) return { error: insNodes.message };
  }

  // Insert new edges
  if (edges.length > 0) {
    const { error: insEdges } = await supabase
      .from("workflow_edges")
      .insert(edges);
    if (insEdges) return { error: insEdges.message };
  }

  // Update viewport
  await supabase
    .from("workflows")
    .update({ viewport, updated_at: new Date().toISOString() })
    .eq("id", workflowId);

  return { error: null };
}

// ── Deploy workflow (set as active) ──
export async function deployWorkflow(
  workflowId: string,
  agentId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Set workflow status to active
  const { error: wfErr } = await supabase
    .from("workflows")
    .update({ status: "active" })
    .eq("id", workflowId);
  if (wfErr) return { error: wfErr.message };

  // Set agent's active_workflow_id
  const { error: agentErr } = await supabase
    .from("agents")
    .update({ active_workflow_id: workflowId })
    .eq("id", agentId);
  if (agentErr) return { error: agentErr.message };

  return { error: null };
}
