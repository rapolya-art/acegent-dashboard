"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Loader2 } from "lucide-react";
import type { Agent, Lead } from "@/lib/types";

interface CallLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  agents: Agent[];
  defaultAgentId?: string;
  onCallStarted?: (campaignId: string) => void;
}

export function CallLeadDialog({
  open,
  onOpenChange,
  lead,
  agents,
  defaultAgentId,
  onCallStarted,
}: CallLeadDialogProps) {
  const [agentId, setAgentId] = useState<string>(defaultAgentId || "");
  useEffect(() => { if (defaultAgentId) setAgentId(defaultAgentId); }, [defaultAgentId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCall() {
    if (!agentId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leads/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          agent_id: agentId,
          organization_id: lead.organization_id,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to initiate call");
        return;
      }

      const body = await res.json();
      onOpenChange(false);
      onCallStarted?.(body.campaign_id);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  const activeAgents = agents.filter((a) => a.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Зателефонувати
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-sm font-medium text-white">
              {lead.name || lead.phone}
            </p>
            <p className="text-xs text-muted-foreground">{lead.phone}</p>
            {lead.company && (
              <p className="text-xs text-muted-foreground">{lead.company}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Агент для дзвінка
            </label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть агента" />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Скасувати
          </Button>
          <Button onClick={handleCall} disabled={!agentId || loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Phone className="mr-2 h-4 w-4" />
            )}
            Зателефонувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
