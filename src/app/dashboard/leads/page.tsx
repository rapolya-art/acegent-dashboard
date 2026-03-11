"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Plus,
  Upload,
  Phone,
  Pencil,
  Trash2,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useLeads, useLeadStats, deleteLead, updateLead } from "@/lib/hooks/use-leads";
import { useAgents } from "@/lib/hooks/use-agents";
import { LeadStatusBadge, LEAD_STATUSES, leadStatusLabels } from "@/components/leads/lead-status-badge";
import { LeadPipelineBar } from "@/components/leads/lead-pipeline-bar";
import { CallLeadDialog } from "@/components/leads/call-lead-dialog";
import { CreateCampaignFromLeadsDialog } from "@/components/leads/create-campaign-from-leads-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lead, LeadStatus } from "@/lib/types";

export default function LeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [callLead, setCallLead] = useState<Lead | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);

  const { organization } = useOrganization();
  const { leads, loading, refetch } = useLeads(organization?.id, {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { stats } = useLeadStats(organization?.id);
  const { agents } = useAgents(organization?.id);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteLead(id);
    if (!error) refetch();
  }

  async function handleBulkStatusChange(status: LeadStatus) {
    const promises = Array.from(selectedIds).map((id) =>
      updateLead(id, { status })
    );
    await Promise.all(promises);
    setSelectedIds(new Set());
    refetch();
  }

  async function handleBulkDelete() {
    const promises = Array.from(selectedIds).map((id) => deleteLead(id));
    await Promise.all(promises);
    setSelectedIds(new Set());
    refetch();
  }

  return (
    <div className="space-y-4">
      {/* Pipeline bar */}
      <LeadPipelineBar
        counts={stats}
        activeStatus={statusFilter !== "all" ? statusFilter : null}
        onStatusClick={(s) => setStatusFilter(s || "all")}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук лідів..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {leadStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link href="/dashboard/leads/import">
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-4 w-4" />
            Імпорт CSV
          </Button>
        </Link>
        <Link href="/dashboard/leads/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Додати лід
          </Button>
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
          Завантаження...
        </div>
      ) : leads.length === 0 ? (
        <div className="glass rounded-xl">
          <EmptyState
            icon={Users}
            title="Немає лідів"
            description="Додайте лідів вручну або імпортуйте з CSV файлу."
          />
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3">Ім&apos;я</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Компанія</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Теги</th>
                  <th className="px-4 py-3">Створено</th>
                  <th className="px-4 py-3 w-24">Дії</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const date = new Date(lead.created_at);
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-border/50 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium text-white hover:text-brand"
                        >
                          {lead.name || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {lead.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lead.company || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                          {lead.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{lead.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {date.toLocaleDateString("uk-UA")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCallLead(lead)}
                            className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-brand"
                            title="Зателефонувати"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/dashboard/leads/${lead.id}`)
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
                            title="Редагувати"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-danger"
                            title="Видалити"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-sidebar px-4 py-3 shadow-2xl">
          <span className="text-sm text-muted-foreground">
            Обрано: <span className="font-medium text-white">{selectedIds.size}</span>
          </span>
          <Button
            size="sm"
            onClick={() => setShowCampaignDialog(true)}
          >
            <Megaphone className="mr-1.5 h-3.5 w-3.5" />
            Створити кампанію
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Змінити статус
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LEAD_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleBulkStatusChange(s)}
                >
                  {leadStatusLabels[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="text-danger hover:text-danger"
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Видалити
          </Button>
        </div>
      )}

      {/* Call dialog */}
      {callLead && (
        <CallLeadDialog
          open={!!callLead}
          onOpenChange={(open) => !open && setCallLead(null)}
          lead={callLead}
          agents={agents}
          onCallStarted={(campaignId) =>
            router.push(`/dashboard/campaigns/${campaignId}`)
          }
        />
      )}

      {/* Campaign from leads dialog */}
      {organization && (
        <CreateCampaignFromLeadsDialog
          open={showCampaignDialog}
          onOpenChange={setShowCampaignDialog}
          leadIds={Array.from(selectedIds)}
          agents={agents}
          organizationId={organization.id}
        />
      )}
    </div>
  );
}
