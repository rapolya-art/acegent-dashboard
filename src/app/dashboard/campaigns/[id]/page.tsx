"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaign, startCampaign, pauseCampaign } from "@/lib/hooks/use-campaigns";

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

const contactStatusColors: Record<string, string> = {
  pending: "bg-white/10 text-white/50",
  queued: "bg-blue-500/20 text-blue-400",
  calling: "bg-warning/20 text-warning",
  completed: "bg-success/20 text-success",
  failed: "bg-danger/20 text-danger",
  no_answer: "bg-orange-500/20 text-orange-400",
  skipped: "bg-white/10 text-white/30",
};

const contactStatusLabels: Record<string, string> = {
  pending: "Очікує",
  queued: "В черзі",
  calling: "Дзвінок",
  completed: "Завершено",
  failed: "Помилка",
  no_answer: "Без відповіді",
  skipped: "Пропущено",
};

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { campaign, contacts, loading, setCampaign } = useCampaign(id);

  async function handleStart() {
    if (!campaign) return;
    const { error } = await startCampaign(campaign.id);
    if (!error) {
      setCampaign({ ...campaign, status: "running" });
    }
  }

  async function handlePause() {
    if (!campaign) return;
    const { error } = await pauseCampaign(campaign.id);
    if (!error) {
      setCampaign({ ...campaign, status: "paused" });
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
        Завантаження...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="glass rounded-xl p-8 text-center text-sm text-danger">
        Кампанію не знайдено
      </div>
    );
  }

  const progress =
    campaign.total_contacts > 0
      ? Math.round((campaign.calls_made / campaign.total_contacts) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/campaigns")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
          <Badge
            variant="secondary"
            className={`mt-1 ${statusColors[campaign.status] || ""}`}
          >
            {statusLabels[campaign.status] || campaign.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {["draft", "paused"].includes(campaign.status) && (
            <Button size="sm" onClick={handleStart}>
              <Play className="mr-1.5 h-4 w-4" />
              Запустити
            </Button>
          )}
          {campaign.status === "running" && (
            <Button size="sm" variant="outline" onClick={handlePause}>
              <Pause className="mr-1.5 h-4 w-4" />
              Пауза
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs">Контакти</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {campaign.total_contacts}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span className="text-xs">Дзвінки</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {campaign.calls_made}
          </p>
          {campaign.total_contacts > 0 && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs">Відповіли</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-success">
            {campaign.calls_answered}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 text-danger">
            <XCircle className="h-4 w-4" />
            <span className="text-xs">Помилки</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-danger">
            {campaign.calls_failed}
          </p>
        </div>
      </div>

      {/* Contacts table */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Контакти ({contacts.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Ім&apos;я</th>
                <th className="px-4 py-3">Лід</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Спроби</th>
                <th className="px-4 py-3">Остання спроба</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-mono text-white">
                    {contact.phone_number}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {contact.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {contact.lead_id ? (
                      <Link href={`/dashboard/leads/${contact.lead_id}`} className="text-brand hover:underline text-xs">
                        Переглянути
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        contactStatusColors[contact.status] || ""
                      }
                    >
                      {contactStatusLabels[contact.status] ||
                        contact.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {contact.attempts}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {contact.last_attempt_at
                      ? new Date(contact.last_attempt_at).toLocaleString(
                          "uk-UA"
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Немає контактів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
