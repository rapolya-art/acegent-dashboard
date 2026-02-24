"use client";

import { Bot, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useAgents } from "@/lib/hooks/use-agents";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const statusLabels: Record<string, string> = {
  active: "Активний",
  inactive: "Пауза",
  error: "Помилка",
};

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-warning/20 text-warning",
  error: "bg-danger/20 text-danger",
};

export default function AgentsPage() {
  const { organization } = useOrganization();
  const { agents, loading } = useAgents(organization?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Управління вашими AI-агентами
        </p>
        <Link href="/dashboard/agents/new">
          <Button className="gap-2 bg-brand hover:bg-brand-dark">
            <Plus className="h-4 w-4" />
            Новий агент
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження...</div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Bot} title="Немає агентів" description="Створіть першого AI-агента для обробки дзвінків." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="glass group rounded-xl p-5 transition-all duration-300 hover:border-brand/20"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
                    <Bot className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {agent.language === "uk" ? "Українська" : agent.language}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className={statusColors[agent.status] || ""}>
                  {statusLabels[agent.status] || agent.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Дзвінки</p>
                  <p className="text-lg font-bold text-white">{agent.total_calls}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Успіх</p>
                  <p className="text-lg font-bold text-success">{Math.round(agent.success_rate)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Середн.</p>
                  <p className="text-lg font-bold text-white">{formatDuration(agent.avg_duration_seconds)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/50 pt-4">
                <Badge variant="outline" className="text-xs">{agent.llm_provider}</Badge>
                <Badge variant="outline" className="text-xs">{agent.tts_provider}</Badge>
                <Badge variant="outline" className="text-xs">{agent.stt_provider}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
