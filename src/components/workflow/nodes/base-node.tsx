"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeType } from "@/lib/types";
import {
  MessageSquare,
  HelpCircle,
  Search,
  Wrench,
  GitBranch,
  PhoneForwarded,
  PhoneOff,
  Bot,
  Variable,
  ScanSearch,
  MessageCircle,
} from "lucide-react";

const NODE_META: Record<
  WorkflowNodeType,
  { label: string; icon: typeof Bot; color: string }
> = {
  greeting: { label: "Привітання", icon: MessageSquare, color: "#22c55e" },
  question: { label: "Питання", icon: HelpCircle, color: "#3b82f6" },
  rag_lookup: { label: "RAG", icon: Search, color: "#8b5cf6" },
  tool_call: { label: "Тулза", icon: Wrench, color: "#f59e0b" },
  condition: { label: "Умова", icon: GitBranch, color: "#ef4444" },
  transfer: { label: "Переведення", icon: PhoneForwarded, color: "#06b6d4" },
  hangup: { label: "Завершення", icon: PhoneOff, color: "#6b7280" },
  llm_response: { label: "LLM відповідь", icon: Bot, color: "#a855f7" },
  set_variable: { label: "Змінна", icon: Variable, color: "#14b8a6" },
  classifier: { label: "Класифікатор", icon: ScanSearch, color: "#f97316" },
  static_response: { label: "Статична відповідь", icon: MessageCircle, color: "#64748b" },
};

export function getNodeMeta(type: WorkflowNodeType) {
  return NODE_META[type] || NODE_META.llm_response;
}

export interface ClassifierOutput {
  id: string;
  label: string;
}

export interface BaseNodeData {
  label: string;
  type: WorkflowNodeType;
  config: Record<string, unknown>;
  instructions: string | null;
  tools: string[];
  kb_document_ids: string[];
  is_entry: boolean;
  [key: string]: unknown;
}

// Colors for classifier output handles (cycle through)
const CLASSIFIER_COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
  "#64748b", "#eab308",
];

export default function BaseNode({
  data,
  selected,
}: NodeProps & { data: BaseNodeData }) {
  const nodeType = data.type as WorkflowNodeType;
  const meta = getNodeMeta(nodeType);
  const Icon = meta.icon;

  // Classifier outputs from config
  const classifierOutputs: ClassifierOutput[] =
    nodeType === "classifier"
      ? ((data.config?.outputs as ClassifierOutput[]) || [])
      : [];

  return (
    <div
      className={`min-w-[200px] max-w-[280px] rounded-2xl border-2 bg-[#1a1a2e] shadow-lg transition-all ${
        selected ? "border-brand shadow-brand/20" : "border-white/10"
      } ${data.is_entry ? "ring-2 ring-green-500/30" : ""}`}
    >
      {/* Target handle (top) */}
      {nodeType !== "greeting" && !data.is_entry && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !rounded-full !border-2 !border-white/20 !bg-white/60"
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-2"
        style={{ backgroundColor: `${meta.color}20` }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${meta.color}30` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
        </div>
        <span className="truncate text-xs font-semibold text-white/90">
          {data.label || meta.label}
        </span>
        {data.is_entry && (
          <span className="ml-auto rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
            START
          </span>
        )}
      </div>

      {/* Body preview */}
      <div className="px-3 py-2">
        {/* Static response: show message */}
        {nodeType === "static_response" && typeof data.config?.message === "string" && (
          <p className="line-clamp-2 text-[10px] leading-tight text-white/50 italic">
            &quot;{data.config.message}&quot;
          </p>
        )}

        {/* Classifier: show output count */}
        {nodeType === "classifier" && classifierOutputs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {classifierOutputs.map((out, i) => (
              <span
                key={out.id}
                className="rounded-md px-1.5 py-0.5 text-[9px] font-medium"
                style={{
                  backgroundColor: `${CLASSIFIER_COLORS[i % CLASSIFIER_COLORS.length]}20`,
                  color: CLASSIFIER_COLORS[i % CLASSIFIER_COLORS.length],
                }}
              >
                {out.label}
              </span>
            ))}
          </div>
        )}

        {/* Default: instructions preview */}
        {nodeType !== "static_response" && nodeType !== "classifier" && data.instructions && (
          <p className="line-clamp-2 text-[10px] leading-tight text-white/40">
            {data.instructions}
          </p>
        )}
        {nodeType !== "static_response" && nodeType !== "classifier" && !data.instructions && data.config && (
          <p className="text-[10px] text-white/30">{meta.label}</p>
        )}
        {data.tools && data.tools.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {data.tools.map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source handles */}
      {nodeType === "classifier" && classifierOutputs.length > 0 ? (
        /* Classifier: dynamic bottom handles for each output */
        <div className="relative flex justify-center pb-2" style={{ minHeight: 20 }}>
          {classifierOutputs.map((out, i) => {
            const total = classifierOutputs.length;
            const pct = total === 1 ? 50 : 15 + (i * 70) / (total - 1);
            return (
              <Handle
                key={out.id}
                type="source"
                position={Position.Bottom}
                id={out.id}
                className="!h-3 !w-3 !rounded-full !border-2"
                style={{
                  left: `${pct}%`,
                  borderColor: `${CLASSIFIER_COLORS[i % CLASSIFIER_COLORS.length]}80`,
                  backgroundColor: CLASSIFIER_COLORS[i % CLASSIFIER_COLORS.length],
                }}
                title={out.label}
              />
            );
          })}
        </div>
      ) : nodeType === "condition" ? (
        /* Condition node: two bottom handles for true/false branches */
        <div className="relative flex justify-center gap-8 pb-1">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!h-3 !w-3 !rounded-full !border-2 !border-red-500/50 !bg-red-400"
            style={{ left: "35%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!h-3 !w-3 !rounded-full !border-2 !border-green-500/50 !bg-green-400"
            style={{ left: "65%" }}
          />
        </div>
      ) : nodeType !== "hangup" ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !rounded-full !border-2 !border-white/20 !bg-white/60"
        />
      ) : null}
    </div>
  );
}
