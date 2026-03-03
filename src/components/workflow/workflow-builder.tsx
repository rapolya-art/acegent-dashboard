"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import WorkflowToolbar from "./workflow-toolbar";
import WorkflowSidebar from "./workflow-sidebar";
import type { BaseNodeData } from "./nodes/base-node";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
} from "@/lib/types";

// Convert DB WorkflowNode → ReactFlow Node
function toFlowNode(n: WorkflowNode): Node<BaseNodeData> {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.label,
      type: n.type,
      config: n.config,
      instructions: n.instructions,
      tools: n.tools,
      kb_document_ids: n.kb_document_ids,
      is_entry: n.is_entry,
    },
  };
}

// Convert DB WorkflowEdge → ReactFlow Edge
function toFlowEdge(e: WorkflowEdge): Edge {
  const hasCondition = e.condition && Object.keys(e.condition).length > 0;
  const conditionValue = (e.condition as Record<string, string>)?.value;

  // Color edges from condition nodes
  let stroke = "rgba(255,255,255,0.15)";
  if (hasCondition && conditionValue === "true") stroke = "#22c55e";
  else if (hasCondition && conditionValue === "false") stroke = "#ef4444";

  return {
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    sourceHandle: conditionValue || undefined,
    label: e.label || undefined,
    type: hasCondition ? "conditional" : "default",
    data: {
      condition: e.condition,
      priority: e.priority,
      edge_type: e.edge_type,
    },
    style: { stroke, strokeWidth: 2 },
    animated: e.edge_type === "success",
  };
}

// Convert ReactFlow Node → DB WorkflowNode partial
function fromFlowNode(
  n: Node<BaseNodeData>,
  workflowId: string
): Omit<WorkflowNode, "created_at"> {
  return {
    id: n.id,
    workflow_id: workflowId,
    type: (n.type || "llm_response") as WorkflowNodeType,
    label: n.data.label || "",
    position_x: n.position.x,
    position_y: n.position.y,
    config: n.data.config || {},
    instructions: n.data.instructions || null,
    tools: n.data.tools || [],
    kb_document_ids: n.data.kb_document_ids || [],
    is_entry: n.data.is_entry || false,
  };
}

// Convert ReactFlow Edge → DB WorkflowEdge partial
function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function fromFlowEdge(
  e: Edge,
  workflowId: string
): Omit<WorkflowEdge, "created_at"> {
  return {
    id: isUUID(e.id) ? e.id : crypto.randomUUID(),
    workflow_id: workflowId,
    source_node_id: e.source,
    target_node_id: e.target,
    label: (e.label as string) || null,
    condition: (e.data?.condition as Record<string, unknown>) || {},
    priority: (e.data?.priority as number) || 0,
    edge_type: (e.data?.edge_type as WorkflowEdge["edge_type"]) || "default",
  };
}

interface WorkflowBuilderProps {
  workflow: Workflow;
  initialNodes: WorkflowNode[];
  initialEdges: WorkflowEdge[];
  availableTools?: string[];
  onSave: (
    nodes: Omit<WorkflowNode, "created_at">[],
    edges: Omit<WorkflowEdge, "created_at">[],
    viewport: { x: number; y: number; zoom: number }
  ) => Promise<void>;
  onDeploy: () => Promise<void>;
}

function WorkflowBuilderInner({
  workflow,
  initialNodes: dbNodes,
  initialEdges: dbEdges,
  availableTools = [],
  onSave,
  onDeploy,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    dbNodes.map(toFlowNode)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    dbEdges.map(toFlowEdge)
  );
  const [selectedNode, setSelectedNode] = useState<Node<BaseNodeData> | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const reactFlowInstance = useReactFlow();
  const nodeIdCounter = useRef(0);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Auto-set condition for edges from condition node handles
      let condition: Record<string, unknown> = {};
      let label: string | undefined;
      let edgeStyle = { stroke: "rgba(255,255,255,0.15)", strokeWidth: 2 };

      if (connection.sourceHandle === "true" || connection.sourceHandle === "false") {
        const val = connection.sourceHandle;
        condition = { type: "trigger", value: val };
        label = val === "true" ? "Так" : "Ні";
        edgeStyle = {
          stroke: val === "true" ? "#22c55e" : "#ef4444",
          strokeWidth: 2,
        };
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: Object.keys(condition).length > 0 ? "conditional" : "default",
            label,
            style: edgeStyle,
            data: { condition, priority: 0, edge_type: "default" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node as Node<BaseNodeData>);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<BaseNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      // Also update the selected node state
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...data } }
          : prev
      );
    },
    [setNodes]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const viewport = reactFlowInstance.getViewport();
      const dbNodes = nodes.map((n) =>
        fromFlowNode(n as Node<BaseNodeData>, workflow.id)
      );
      const dbEdges = edges.map((e) => fromFlowEdge(e, workflow.id));
      await onSave(dbNodes, dbEdges, viewport);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflow.id, onSave, reactFlowInstance]);

  const handleAddNode = useCallback(
    (type: WorkflowNodeType) => {
      const viewport = reactFlowInstance.getViewport();
      const id = crypto.randomUUID();
      const newNode: Node<BaseNodeData> = {
        id,
        type,
        position: {
          x: (-viewport.x + 400) / viewport.zoom + nodeIdCounter.current * 20,
          y: (-viewport.y + 300) / viewport.zoom + nodeIdCounter.current * 20,
        },
        data: {
          label: "",
          type,
          config: {},
          instructions: null,
          tools: [],
          kb_document_ids: [],
          is_entry: false,
        },
      };
      nodeIdCounter.current++;
      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [setNodes, reactFlowInstance]
  );

  // Delete selected nodes/edges with Backspace/Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        // Don't delete if typing in input/textarea
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
          return;

        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <WorkflowToolbar
          status={workflow.status}
          saving={saving}
          onSave={handleSave}
          onDeploy={onDeploy}
          onZoomIn={() => reactFlowInstance.zoomIn()}
          onZoomOut={() => reactFlowInstance.zoomOut()}
          onFitView={() => reactFlowInstance.fitView({ padding: 0.2 })}
          onAddNode={handleAddNode}
        />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={workflow.viewport}
            fitView={!dbNodes.length}
            deleteKeyCode={null}
            className="bg-[#0a0a14]"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="rgba(255,255,255,0.03)"
            />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-[#0f0f1a] !border-white/10"
              maskColor="rgba(0,0,0,0.7)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Sidebar */}
      {selectedNode && (
        <WorkflowSidebar
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={() => setSelectedNode(null)}
          availableTools={availableTools}
        />
      )}
    </div>
  );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
