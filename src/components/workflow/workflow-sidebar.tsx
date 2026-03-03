"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getNodeMeta, type BaseNodeData } from "./nodes/base-node";
import type { WorkflowNodeType } from "@/lib/types";
import type { Node } from "@xyflow/react";

interface WorkflowSidebarProps {
  node: Node<BaseNodeData> | null;
  onUpdate: (nodeId: string, data: Partial<BaseNodeData>) => void;
  onClose: () => void;
  availableTools?: string[];
}

export default function WorkflowSidebar({
  node,
  onUpdate,
  onClose,
  availableTools = [],
}: WorkflowSidebarProps) {
  const [label, setLabel] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "");
      setInstructions(node.data.instructions || "");
      setTools(node.data.tools || []);
      setConfig(node.data.config || {});
    }
  }, [node]);

  if (!node) return null;

  const nodeType = node.data.type as WorkflowNodeType;
  const meta = getNodeMeta(nodeType);
  const Icon = meta.icon;

  function save() {
    if (!node) return;
    onUpdate(node.id, { label, instructions, tools, config });
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  function updateConfig(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTool(tool: string) {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  return (
    <div className="flex h-full w-[340px] flex-col border-l border-white/10 bg-[#0f0f1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <span className="text-sm font-semibold text-white">{meta.label}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Label */}
        <div>
          <Label className="mb-1 text-xs text-white/60">Назва ноди</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={meta.label}
          />
        </div>

        {/* Type-specific config */}
        {nodeType === "greeting" && (
          <div>
            <Label className="mb-1 text-xs text-white/60">Повідомлення привітання</Label>
            <textarea
              className="h-20 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand/50 focus:outline-none"
              value={(config.message as string) || ""}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder="Привіт! Чим можу допомогти?"
            />
          </div>
        )}

        {nodeType === "question" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Текст питання</Label>
              <textarea
                className="h-20 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand/50 focus:outline-none"
                value={(config.question_text as string) || ""}
                onChange={(e) => updateConfig("question_text", e.target.value)}
                placeholder="Як вас звати?"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Зберегти в змінну</Label>
              <Input
                value={(config.variable_name as string) || ""}
                onChange={(e) => updateConfig("variable_name", e.target.value)}
                placeholder="patient_name"
              />
            </div>
          </>
        )}

        {nodeType === "tool_call" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Назва тулзи</Label>
              <Input
                value={(config.tool_name as string) || ""}
                onChange={(e) => updateConfig("tool_name", e.target.value)}
                placeholder="check_slots"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Зберегти результат в</Label>
              <Input
                value={(config.result_variable as string) || ""}
                onChange={(e) => updateConfig("result_variable", e.target.value)}
                placeholder="slots_result"
              />
            </div>
          </>
        )}

        {nodeType === "condition" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Змінна</Label>
              <Input
                value={(config.variable as string) || ""}
                onChange={(e) => updateConfig("variable", e.target.value)}
                placeholder="booked"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Оператор</Label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white"
                value={(config.operator as string) || "=="}
                onChange={(e) => updateConfig("operator", e.target.value)}
              >
                <option value="==">дорівнює (==)</option>
                <option value="!=">не дорівнює (!=)</option>
                <option value="contains">містить</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Значення</Label>
              <Input
                value={(config.value as string) || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="true"
              />
            </div>
          </>
        )}

        {nodeType === "hangup" && (
          <div>
            <Label className="mb-1 text-xs text-white/60">Прощальне повідомлення</Label>
            <textarea
              className="h-20 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand/50 focus:outline-none"
              value={(config.farewell_message as string) || ""}
              onChange={(e) => updateConfig("farewell_message", e.target.value)}
              placeholder="Дякую за дзвінок! До побачення."
            />
          </div>
        )}

        {nodeType === "transfer" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Номер для переведення</Label>
              <Input
                value={(config.target_number as string) || ""}
                onChange={(e) => updateConfig("target_number", e.target.value)}
                placeholder="+380..."
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Повідомлення перед переведенням</Label>
              <textarea
                className="h-16 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-brand/50 focus:outline-none"
                value={(config.message_before_transfer as string) || ""}
                onChange={(e) => updateConfig("message_before_transfer", e.target.value)}
              />
            </div>
          </>
        )}

        {nodeType === "set_variable" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Змінна</Label>
              <Input
                value={(config.variable as string) || ""}
                onChange={(e) => updateConfig("variable", e.target.value)}
                placeholder="doctor"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Значення</Label>
              <Input
                value={(config.value as string) || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="Олена Ковальчук"
              />
            </div>
          </>
        )}

        {nodeType === "rag_lookup" && (
          <>
            <div>
              <Label className="mb-1 text-xs text-white/60">Змінна запиту</Label>
              <Input
                value={(config.query_variable as string) || ""}
                onChange={(e) => updateConfig("query_variable", e.target.value)}
                placeholder="user_input"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs text-white/60">Зберегти результат в</Label>
              <Input
                value={(config.result_variable as string) || ""}
                onChange={(e) => updateConfig("result_variable", e.target.value)}
                placeholder="rag_context"
              />
            </div>
          </>
        )}

        {/* Instructions (available for all node types) */}
        <div>
          <Label className="mb-1 text-xs text-white/60">Інструкції для LLM</Label>
          <textarea
            className="h-32 w-full rounded-lg border border-white/10 bg-white/5 p-3 font-mono text-xs text-white placeholder:text-white/30 focus:border-brand/50 focus:outline-none"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Інструкції для цієї стадії розмови..."
          />
        </div>

        {/* Tools selector */}
        {availableTools.length > 0 && (
          <div>
            <Label className="mb-2 text-xs text-white/60">Доступні тулзи</Label>
            <div className="space-y-1.5">
              {availableTools.map((tool) => (
                <label
                  key={tool}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 p-2 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool)}
                    onChange={() => toggleTool(tool)}
                    className="accent-brand"
                  />
                  <span className="text-xs text-white/70">{tool}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Entry node toggle */}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 p-2 hover:bg-white/5">
          <input
            type="checkbox"
            checked={node.data.is_entry}
            onChange={() =>
              onUpdate(node.id, { is_entry: !node.data.is_entry })
            }
            className="accent-green-500"
          />
          <span className="text-xs text-white/70">Стартова нода</span>
        </label>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <Button
          onClick={save}
          className={`w-full ${saved ? "bg-green-600 hover:bg-green-700" : "bg-brand hover:bg-brand-dark"}`}
          size="sm"
        >
          {saved ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Застосовано
            </>
          ) : (
            "Застосувати"
          )}
        </Button>
      </div>
    </div>
  );
}
