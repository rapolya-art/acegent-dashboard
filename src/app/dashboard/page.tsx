"use client";

import { Phone, Clock, CheckCircle, Timer } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useCallStats, useCalls } from "@/lib/hooks/use-calls";
import Link from "next/link";

const sentimentColors: Record<string, string> = {
  positive: "bg-success/20 text-success",
  neutral: "bg-blue-500/20 text-blue-400",
  negative: "bg-danger/20 text-danger",
};

const sentimentLabels: Record<string, string> = {
  positive: "Позитивний",
  neutral: "Нейтральний",
  negative: "Негативний",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { organization } = useOrganization();
  const { stats, loading: statsLoading } = useCallStats(organization?.id);
  const { calls: recentCalls, loading: callsLoading } = useCalls(organization?.id, { limit: 10 });

  const loading = statsLoading || callsLoading;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Дзвінки сьогодні"
          value={loading ? "..." : String(stats.calls_today)}
          icon={Phone}
        />
        <StatCard
          title="Середня тривалість"
          value={loading ? "..." : formatDuration(stats.avg_duration_seconds)}
          icon={Clock}
        />
        <StatCard
          title="Успішність"
          value={loading ? "..." : `${stats.success_rate}%`}
          icon={CheckCircle}
        />
        <StatCard
          title="Хвилин використано"
          value={loading ? "..." : `${stats.minutes_used} / ${stats.minutes_limit}`}
          change={stats.minutes_limit > 0 ? `${Math.round((stats.minutes_used / stats.minutes_limit) * 100)}% від ліміту` : undefined}
          changeType="neutral"
          icon={Timer}
        />
      </div>

      {/* Recent Calls */}
      <div className="glass rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Останні дзвінки
        </h3>
        {recentCalls.length === 0 ? (
          <EmptyState
            icon={Phone}
            title="Немає дзвінків"
            description="Дзвінки з'являться тут після першого вхідного виклику до вашого агента."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">Час</th>
                  <th className="pb-3 pr-4">Номер</th>
                  <th className="pb-3 pr-4">Тривалість</th>
                  <th className="pb-3 pr-4">Sentiment</th>
                  <th className="pb-3">Результат</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr
                    key={call.id}
                    className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      <Link href={`/dashboard/calls/${call.id}`} className="hover:text-brand">
                        {new Date(call.started_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-mono text-white">
                      {call.caller_phone || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {call.duration_seconds ? formatDuration(call.duration_seconds) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {call.sentiment ? (
                        <Badge variant="secondary" className={sentimentColors[call.sentiment]}>
                          {sentimentLabels[call.sentiment]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {call.outcome || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
