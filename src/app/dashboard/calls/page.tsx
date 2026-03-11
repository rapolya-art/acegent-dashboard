"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useCalls } from "@/lib/hooks/use-calls";

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

const statusColors: Record<string, string> = {
  completed: "bg-success/20 text-success",
  missed: "bg-warning/20 text-warning",
  failed: "bg-danger/20 text-danger",
  in_progress: "bg-brand/20 text-brand",
};

const statusLabels: Record<string, string> = {
  completed: "Завершено",
  missed: "Пропущено",
  failed: "Помилка",
  in_progress: "В процесі",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [status, setStatus] = useState("all");
  const { organization } = useOrganization();
  const { calls, loading } = useCalls(organization?.id, {
    search: search || undefined,
    sentiment: sentiment !== "all" ? sentiment : undefined,
    status: status !== "all" ? status : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за номером..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sentiment} onValueChange={setSentiment}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі</SelectItem>
            <SelectItem value="positive">Позитивний</SelectItem>
            <SelectItem value="neutral">Нейтральний</SelectItem>
            <SelectItem value="negative">Негативний</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі</SelectItem>
            <SelectItem value="completed">Завершено</SelectItem>
            <SelectItem value="missed">Пропущено</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
          Завантаження...
        </div>
      ) : calls.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={Phone}
            title="Немає дзвінків"
            description="Дзвінки з'являться тут після першого вхідного виклику до вашого агента."
          />
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Дата / Час</th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">Номер</th>
                  <th className="px-4 py-3">Лід</th>
                  <th className="px-4 py-3">Агент</th>
                  <th className="px-4 py-3">Тривалість</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Результат</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const date = new Date(call.started_at);
                  return (
                    <tr
                      key={call.id}
                      className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/calls/${call.id}`} className="hover:text-brand">
                          <span className="text-xs text-muted-foreground">
                            {date.toLocaleDateString("uk-UA")}
                          </span>
                          <br />
                          <span className="font-mono text-xs text-white">
                            {date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {call.direction === "outbound" ? (
                          <PhoneOutgoing className="h-4 w-4 text-brand" />
                        ) : (
                          <PhoneIncoming className="h-4 w-4 text-success" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-white">
                        <Link href={`/dashboard/calls/${call.id}`} className="hover:text-brand">
                          {call.caller_phone || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {call.lead_id && call.leads ? (
                          <Link href={`/dashboard/leads/${call.lead_id}`} className="hover:text-brand">
                            {call.leads.name || call.leads.phone}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(call.agents as unknown as { name: string })?.name || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={statusColors[call.status] || ""}>
                          {statusLabels[call.status] || call.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {call.sentiment ? (
                          <Badge variant="secondary" className={sentimentColors[call.sentiment]}>
                            {sentimentLabels[call.sentiment]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {call.outcome || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
