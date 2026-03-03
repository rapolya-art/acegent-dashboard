"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgent, useAgentTools } from "@/lib/hooks/use-agents";
import {
  useAgentWorkflow,
  useWorkflowNodes,
  useWorkflowEdges,
  createWorkflow,
  saveWorkflowGraph,
  deployWorkflow,
} from "@/lib/hooks/use-workflow";
import { useOrganization } from "@/lib/hooks/use-organization";
import WorkflowBuilder from "@/components/workflow/workflow-builder";
import type { WorkflowNode, WorkflowEdge } from "@/lib/types";

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agentId } = use(params);
  const router = useRouter();
  const { agent, loading: agentLoading } = useAgent(agentId);
  const { tools: agentTools, loading: toolsLoading } = useAgentTools(agentId);
  const { organization } = useOrganization();
  const { workflow, loading: wfLoading, setWorkflow } = useAgentWorkflow(agentId);
  const { nodes, loading: nodesLoading } = useWorkflowNodes(workflow?.id);
  const { edges, loading: edgesLoading } = useWorkflowEdges(workflow?.id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = agentLoading || toolsLoading || wfLoading || nodesLoading || edgesLoading;
  const toolNames = agentTools.filter((t) => t.enabled).map((t) => t.name);

  const handleCreateWorkflow = useCallback(async () => {
    if (!agent || !organization) return;
    setCreating(true);
    setError(null);
    const { workflow: wf, error: err } = await createWorkflow(
      agent.id,
      organization.id,
      `${agent.name} workflow`
    );
    if (err) {
      setError(err);
    } else if (wf) {
      setWorkflow(wf);
    }
    setCreating(false);
  }, [agent, organization, setWorkflow]);

  const handleSave = useCallback(
    async (
      saveNodes: Omit<WorkflowNode, "created_at">[],
      saveEdges: Omit<WorkflowEdge, "created_at">[],
      viewport: { x: number; y: number; zoom: number }
    ) => {
      if (!workflow) return;
      const { error: err } = await saveWorkflowGraph(
        workflow.id,
        saveNodes,
        saveEdges,
        viewport
      );
      if (err) {
        setError(err);
      }
    },
    [workflow]
  );

  const handleDeploy = useCallback(async () => {
    if (!workflow || !agent) return;
    const { error: err } = await deployWorkflow(workflow.id, agent.id);
    if (err) {
      setError(err);
    } else {
      setWorkflow({ ...workflow, status: "active" });
    }
  }, [workflow, agent, setWorkflow]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8">
        <p className="text-white/60">Агент не знайдений</p>
      </div>
    );
  }

  // No workflow yet — show create button
  if (!workflow) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Link
          href={`/dashboard/agents/${agentId}`}
          className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до агента
        </Link>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">
            Workflow для &quot;{agent.name}&quot;
          </h2>
          <p className="mt-1 text-sm text-white/40">
            Створіть workflow щоб визначити граф розмови агента
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          onClick={handleCreateWorkflow}
          disabled={creating}
          className="gap-2 bg-brand hover:bg-brand-dark"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Створити Workflow
        </Button>
      </div>
    );
  }

  // Workflow exists — show builder
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Back link */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
        <Link
          href={`/dashboard/agents/${agentId}`}
          className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          {agent.name}
        </Link>
        <span className="text-xs text-white/20">/</span>
        <span className="text-xs font-medium text-white/70">{workflow.name}</span>
        {error && (
          <span className="ml-auto text-xs text-red-400">{error}</span>
        )}
      </div>

      {/* Builder */}
      <div className="flex-1">
        <WorkflowBuilder
          workflow={workflow}
          initialNodes={nodes}
          initialEdges={edges}
          availableTools={toolNames}
          onSave={handleSave}
          onDeploy={handleDeploy}
        />
      </div>
    </div>
  );
}
