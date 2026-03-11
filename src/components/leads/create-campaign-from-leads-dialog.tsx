"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Loader2 } from "lucide-react";
import type { Agent } from "@/lib/types";

interface CreateCampaignFromLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  agents: Agent[];
  organizationId: string;
}

export function CreateCampaignFromLeadsDialog({
  open,
  onOpenChange,
  leadIds,
  agents,
  organizationId,
}: CreateCampaignFromLeadsDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [callsPerMinute, setCallsPerMinute] = useState(2);
  const [maxRetries, setMaxRetries] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name || !agentId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns/from-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          agent_id: agentId,
          name,
          lead_ids: leadIds,
          max_concurrent_calls: maxConcurrent,
          calls_per_minute: callsPerMinute,
          max_retries: maxRetries,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to create campaign");
        return;
      }

      const body = await res.json();
      onOpenChange(false);
      router.push(`/dashboard/campaigns/${body.campaign.id}`);
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
            <Megaphone className="h-4 w-4" />
            Створити кампанію з {leadIds.length} лідів
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Назва кампанії *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Напр. Обдзвін стоматологій Київ"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Агент *
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Потоків
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Дзвінків/хв
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={callsPerMinute}
                onChange={(e) => setCallsPerMinute(parseInt(e.target.value) || 2)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Ретраїв
              </label>
              <Input
                type="number"
                min={0}
                max={5}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Скасувати
          </Button>
          <Button onClick={handleCreate} disabled={!name || !agentId || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити кампанію
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
