"use client";

import { Save, Play, Rocket, ZoomIn, ZoomOut, Maximize2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WorkflowNodeType } from "@/lib/types";
import { getNodeMeta } from "./nodes/base-node";

const NODE_TYPES_PALETTE: WorkflowNodeType[] = [
  "classifier",
  "llm_response",
  "static_response",
  "greeting",
  "question",
  "tool_call",
  "rag_lookup",
  "condition",
  "set_variable",
  "transfer",
  "hangup",
];

interface WorkflowToolbarProps {
  status: "draft" | "active" | "archived";
  saving: boolean;
  onSave: () => void;
  onDeploy: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAddNode: (type: WorkflowNodeType) => void;
}

export default function WorkflowToolbar({
  status,
  saving,
  onSave,
  onDeploy,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddNode,
}: WorkflowToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/10 bg-[#0f0f1a]/80 px-4 py-3 backdrop-blur">
      {/* Top row: actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              status === "active"
                ? "border-green-500/30 text-green-400"
                : status === "draft"
                  ? "border-yellow-500/30 text-yellow-400"
                  : "border-white/20 text-white/40"
            }
          >
            {status === "active" ? "Активний" : status === "draft" ? "Чернетка" : "Архів"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
            <button
              onClick={onZoomOut}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onFitView}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onZoomIn}
              className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="gap-1.5 border-white/10 text-white/70"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Збереження..." : "Зберегти"}
          </Button>

          <Button
            size="sm"
            onClick={onDeploy}
            className="gap-1.5 bg-brand hover:bg-brand-dark"
          >
            <Rocket className="h-3.5 w-3.5" />
            Деплой
          </Button>
        </div>
      </div>

      {/* Bottom row: node palette */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase text-white/30">
          Додати:
        </span>
        {NODE_TYPES_PALETTE.map((type) => {
          const meta = getNodeMeta(type);
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => onAddNode(type)}
              className="flex items-center gap-1 rounded-lg border border-white/5 px-2 py-1 text-[11px] text-white/60 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
              title={meta.label}
            >
              <Icon className="h-3 w-3" style={{ color: meta.color }} />
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
