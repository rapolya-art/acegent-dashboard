"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useLead, useLeadCalls, updateLead, deleteLead } from "@/lib/hooks/use-leads";
import { useAgents } from "@/lib/hooks/use-agents";
import {
  LeadStatusBadge,
  LEAD_STATUSES,
  leadStatusLabels,
} from "@/components/leads/lead-status-badge";
import { CallLeadDialog } from "@/components/leads/call-lead-dialog";
import type { LeadStatus } from "@/lib/types";

const sentimentColors: Record<string, string> = {
  positive: "text-success",
  neutral: "text-muted-foreground",
  negative: "text-danger",
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { organization } = useOrganization();
  const { lead, loading, setLead } = useLead(id);
  const { calls, loading: callsLoading } = useLeadCalls(id);
  const { agents } = useAgents(organization?.id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    company: "",
    position: "",
    tags: "",
    notes: "",
  });

  function startEdit() {
    if (!lead) return;
    setEditForm({
      name: lead.name || "",
      email: lead.email || "",
      company: lead.company || "",
      position: lead.position || "",
      tags: lead.tags.join(", "),
      notes: lead.notes || "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!lead) return;
    setSaving(true);

    const tags = editForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { lead: updated, error } = await updateLead(lead.id, {
      name: editForm.name || null,
      email: editForm.email || null,
      company: editForm.company || null,
      position: editForm.position || null,
      tags,
      notes: editForm.notes || null,
    });

    if (!error && updated) {
      setLead(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return;
    const { lead: updated } = await updateLead(lead.id, { status });
    if (updated) setLead(updated);
  }

  async function handleDelete() {
    if (!lead) return;
    const { error } = await deleteLead(lead.id);
    if (!error) router.push("/dashboard/leads");
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
        Завантаження...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="glass rounded-xl">
        <EmptyState
          icon={Phone}
          title="Лід не знайдено"
          description="Цей лід більше не існує."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/dashboard/leads")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Ліди
      </button>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-3">
          {/* Lead card */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">
                  {lead.name || lead.phone}
                </h1>
                <p className="font-mono text-sm text-muted-foreground">
                  {lead.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={startEdit}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Редагувати
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-danger hover:text-danger"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Зберегти
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Ім&apos;я</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                    <Input
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Компанія</label>
                    <Input
                      value={editForm.company}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, company: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Посада</label>
                    <Input
                      value={editForm.position}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, position: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Теги (через кому)</label>
                  <Input
                    value={editForm.tags}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, tags: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Нотатки</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {lead.email && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">Email:</span>
                    <span className="text-white">{lead.email}</span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">Компанія:</span>
                    <span className="text-white">{lead.company}</span>
                  </div>
                )}
                {lead.position && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">Посада:</span>
                    <span className="text-white">{lead.position}</span>
                  </div>
                )}
                {lead.tags.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">Теги:</span>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-white/5 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {lead.notes && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20">Нотатки:</span>
                    <span className="text-white whitespace-pre-wrap">{lead.notes}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20">Джерело:</span>
                  <span className="text-white">{lead.source || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Call history */}
          <div className="glass rounded-xl p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Історія дзвінків
            </h2>
            {callsLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            ) : calls.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Дзвінків поки немає
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Дата</th>
                      <th className="px-3 py-2">Агент</th>
                      <th className="px-3 py-2">Тривалість</th>
                      <th className="px-3 py-2">Статус</th>
                      <th className="px-3 py-2">Sentiment</th>
                      <th className="px-3 py-2">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => {
                      const date = new Date(call.started_at);
                      const duration = call.duration_seconds
                        ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, "0")}`
                        : "—";
                      return (
                        <tr
                          key={call.id}
                          className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            <Link
                              href={`/dashboard/calls/${call.id}`}
                              className="hover:text-brand"
                            >
                              {date.toLocaleString("uk-UA", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {(call.agents as { name: string } | undefined)?.name || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-white">
                            {duration}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="secondary"
                              className={
                                call.status === "completed"
                                  ? "bg-success/20 text-success"
                                  : call.status === "failed"
                                    ? "bg-danger/20 text-danger"
                                    : "bg-white/10 text-white/60"
                              }
                            >
                              {call.status}
                            </Badge>
                          </td>
                          <td
                            className={`px-3 py-2 text-xs ${sentimentColors[call.sentiment || "neutral"]}`}
                          >
                            {call.sentiment || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {call.outcome || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Status card */}
          <div className="glass rounded-xl p-6">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Статус
            </h3>
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {leadStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 flex flex-wrap gap-1">
              {LEAD_STATUSES.map((s) => (
                <LeadStatusBadge key={s} status={s} />
              )).map((badge, i) => {
                const s = LEAD_STATUSES[i];
                const isCurrent = s === lead.status;
                return (
                  <div
                    key={s}
                    className={isCurrent ? "ring-1 ring-brand rounded-full" : "opacity-30"}
                  >
                    {badge}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions card */}
          <div className="glass rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Дії</h3>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Агент для дзвінка
              </label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть агента" />
                </SelectTrigger>
                <SelectContent>
                  {agents
                    .filter((a) => a.status === "active")
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!selectedAgentId}
              onClick={() => setShowCallDialog(true)}
            >
              <Phone className="mr-2 h-4 w-4" />
              Зателефонувати
            </Button>
          </div>

          {/* Meta */}
          <div className="glass rounded-xl p-6 space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Створено:</span>
              <span>{new Date(lead.created_at).toLocaleString("uk-UA")}</span>
            </div>
            <div className="flex justify-between">
              <span>Оновлено:</span>
              <span>{new Date(lead.updated_at).toLocaleString("uk-UA")}</span>
            </div>
            <div className="flex justify-between">
              <span>Дзвінків:</span>
              <span>{calls.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Call dialog */}
      {lead && (
        <CallLeadDialog
          open={showCallDialog}
          onOpenChange={setShowCallDialog}
          lead={lead}
          agents={agents}
          defaultAgentId={selectedAgentId}
          onCallStarted={(campaignId) =>
            router.push(`/dashboard/campaigns/${campaignId}`)
          }
        />
      )}
    </div>
  );
}
