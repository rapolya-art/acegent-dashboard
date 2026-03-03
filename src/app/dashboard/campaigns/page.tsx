"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Megaphone, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useCampaigns } from "@/lib/hooks/use-campaigns";

const statusColors: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  scheduled: "bg-blue-500/20 text-blue-400",
  running: "bg-success/20 text-success",
  paused: "bg-warning/20 text-warning",
  completed: "bg-brand/20 text-brand",
  cancelled: "bg-danger/20 text-danger",
};

const statusLabels: Record<string, string> = {
  draft: "Чернетка",
  scheduled: "Заплановано",
  running: "Активна",
  paused: "Пауза",
  completed: "Завершено",
  cancelled: "Скасовано",
};

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const { organization } = useOrganization();
  const { campaigns, loading } = useCampaigns(organization?.id);

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук кампаній..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Нова кампанія
          </Button>
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
          Завантаження...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={Megaphone}
            title="Немає кампаній"
            description="Створіть першу кампанію для автоматичного обдзвону клієнтів."
          />
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Назва</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Контакти</th>
                  <th className="px-4 py-3">Дзвінки</th>
                  <th className="px-4 py-3">Відповіли</th>
                  <th className="px-4 py-3">Помилки</th>
                  <th className="px-4 py-3">Створено</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => {
                  const date = new Date(campaign.created_at);
                  const progress =
                    campaign.total_contacts > 0
                      ? Math.round(
                          (campaign.calls_made / campaign.total_contacts) * 100
                        )
                      : 0;

                  return (
                    <tr
                      key={campaign.id}
                      className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/campaigns/${campaign.id}`}
                          className="font-medium text-white hover:text-brand"
                        >
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={statusColors[campaign.status] || ""}
                        >
                          {statusLabels[campaign.status] || campaign.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {campaign.total_contacts}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white">
                            {campaign.calls_made}
                          </span>
                          {campaign.total_contacts > 0 && (
                            <div className="h-1.5 w-16 rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-success">
                        {campaign.calls_answered}
                      </td>
                      <td className="px-4 py-3 font-mono text-danger">
                        {campaign.calls_failed}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {date.toLocaleDateString("uk-UA")}
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
