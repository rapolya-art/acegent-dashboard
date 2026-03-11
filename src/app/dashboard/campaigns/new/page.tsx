"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useAgents } from "@/lib/hooks/use-agents";
import { useLeads } from "@/lib/hooks/use-leads";
import { createCampaign, importContacts } from "@/lib/hooks/use-campaigns";

type ContactSource = "leads" | "manual";

const leadStatusLabels: Record<string, string> = {
  new: "Новий",
  contacted: "Зв'язались",
  qualified: "Кваліфіковано",
  appointment: "Зустріч",
  won: "Виграно",
  lost: "Втрачено",
};

const leadStatusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-warning/20 text-warning",
  qualified: "bg-brand/20 text-brand",
  appointment: "bg-purple-500/20 text-purple-400",
  won: "bg-success/20 text-success",
  lost: "bg-danger/20 text-danger",
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { agents } = useAgents(organization?.id);
  const { leads, loading: leadsLoading } = useLeads(organization?.id);

  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [contactSource, setContactSource] = useState<ContactSource>("leads");
  const [contactsText, setContactsText] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState("1");
  const [callsPerMinute, setCallsPerMinute] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set()
  );
  const [leadSearch, setLeadSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    leads.forEach((l) => l.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [leads]);

  // Filter leads by search and tag
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (tagFilter !== "all" && !l.tags?.includes(tagFilter)) return false;
      if (leadSearch) {
        const q = leadSearch.toLowerCase();
        const match =
          l.phone?.toLowerCase().includes(q) ||
          l.name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [leads, leadSearch, tagFilter]);

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
  }

  function deselectAll() {
    setSelectedLeadIds(new Set());
  }

  function selectByTag(tag: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      leads.forEach((l) => {
        if (l.tags?.includes(tag)) next.add(l.id);
      });
      return next;
    });
  }

  async function handleCreate() {
    if (!organization?.id || !name || !agentId) {
      setError("Заповніть всі обов'язкові поля");
      return;
    }

    const hasLeads = contactSource === "leads" && selectedLeadIds.size > 0;
    const hasManual = contactSource === "manual" && contactsText.trim();

    if (!hasLeads && !hasManual) {
      setError("Додайте хоча б один контакт");
      return;
    }

    setSaving(true);
    setError(null);

    const agent = agents.find((a) => a.id === agentId);
    const workflowId = agent?.active_workflow_id || null;

    const { campaign, error: createErr } = await createCampaign(
      organization.id,
      agentId,
      workflowId,
      name
    );

    if (createErr || !campaign) {
      setError(createErr || "Failed to create campaign");
      setSaving(false);
      return;
    }

    // Import contacts from leads
    if (hasLeads) {
      const selectedLeads = leads.filter((l) => selectedLeadIds.has(l.id));
      const contacts = selectedLeads.map((l) => ({
        phone_number: l.phone,
        name: l.name || undefined,
        variables: {
          email: l.email,
          company: l.company,
          position: l.position,
          custom_fields: l.custom_fields,
        } as Record<string, unknown>,
        lead_id: l.id,
      }));

      const { error: importErr } = await importContactsWithLeads(
        campaign.id,
        contacts
      );

      if (importErr) {
        setError(`Кампанію створено, але помилка імпорту: ${importErr}`);
        setSaving(false);
        router.push(`/dashboard/campaigns/${campaign.id}`);
        return;
      }
    }

    // Import contacts from textarea
    if (hasManual) {
      const lines = contactsText
        .trim()
        .split("\n")
        .filter((l) => l.trim());
      const contacts = lines.map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        return {
          phone_number: parts[0],
          name: parts[1] || undefined,
        };
      });

      const { error: importErr } = await importContacts(
        campaign.id,
        contacts
      );
      if (importErr) {
        setError(`Кампанію створено, але помилка імпорту: ${importErr}`);
        setSaving(false);
        router.push(`/dashboard/campaigns/${campaign.id}`);
        return;
      }
    }

    setSaving(false);
    router.push(`/dashboard/campaigns/${campaign.id}`);
  }

  const contactCount =
    contactSource === "leads"
      ? selectedLeadIds.size
      : contactsText
          .trim()
          .split("\n")
          .filter((l) => l.trim()).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-white">Нова кампанія</h1>

      <div className="glass space-y-5 rounded-xl p-6">
        {/* Name */}
        <div className="space-y-2">
          <Label>Назва кампанії *</Label>
          <Input
            placeholder="Напр. Нагадування про прийом"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Agent */}
        <div className="space-y-2">
          <Label>Агент *</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Оберіть агента" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Одночасних дзвінків</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Дзвінків за хвилину</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={callsPerMinute}
              onChange={(e) => setCallsPerMinute(e.target.value)}
            />
          </div>
        </div>

        {/* Contact Source Tabs */}
        <div className="space-y-3">
          <Label>Контакти *</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContactSource("leads")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                contactSource === "leads"
                  ? "bg-brand text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              <Users className="h-4 w-4" />
              З бази лідів
            </button>
            <button
              type="button"
              onClick={() => setContactSource("manual")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                contactSource === "manual"
                  ? "bg-brand text-white"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              <FileText className="h-4 w-4" />
              Вручну
            </button>
          </div>
        </div>

        {/* Leads Picker */}
        {contactSource === "leads" && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Пошук за ім'ям, телефоном, компанією..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {allTags.length > 0 && (
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Tag className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Тег" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі теги</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="text-xs"
              >
                Обрати всіх ({filteredLeads.length})
              </Button>
              {selectedLeadIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Зняти вибір
                </Button>
              )}
              {allTags.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  За тегом:
                </span>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => selectByTag(tag)}
                  className="rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Selected count */}
            {selectedLeadIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-2">
                <Users className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium text-brand">
                  Обрано: {selectedLeadIds.size} лідів
                </span>
              </div>
            )}

            {/* Leads list */}
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border">
              {leadsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Завантаження...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {leads.length === 0
                    ? "Немає лідів. Спочатку створіть лідів у розділі Ліди."
                    : "Нічого не знайдено"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 border-b border-border bg-background text-left text-xs text-muted-foreground">
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={
                            filteredLeads.length > 0 &&
                            filteredLeads.every((l) =>
                              selectedLeadIds.has(l.id)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) selectAll();
                            else deselectAll();
                          }}
                          className="rounded border-border"
                        />
                      </th>
                      <th className="px-3 py-2">Ім&apos;я</th>
                      <th className="px-3 py-2">Телефон</th>
                      <th className="px-3 py-2">Компанія</th>
                      <th className="px-3 py-2">Статус</th>
                      <th className="px-3 py-2">Теги</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`cursor-pointer border-b border-border/50 transition-colors ${
                          selectedLeadIds.has(lead.id)
                            ? "bg-brand/5"
                            : "hover:bg-white/[0.02]"
                        }`}
                        onClick={() => toggleLead(lead.id)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleLead(lead.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="px-3 py-2 text-white">
                          {lead.name || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {lead.phone}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {lead.company || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              leadStatusColors[lead.status] || ""
                            }`}
                          >
                            {leadStatusLabels[lead.status] || lead.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {lead.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Manual textarea */}
        {contactSource === "manual" && (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              rows={8}
              placeholder={"+380501234567, Іван Петренко\n+380671234567, Марія Коваленко"}
              value={contactsText}
              onChange={(e) => setContactsText(e.target.value)}
            />
            {contactsText.trim() && (
              <p className="text-xs text-muted-foreground">
                {
                  contactsText
                    .trim()
                    .split("\n")
                    .filter((l) => l.trim()).length
                }{" "}
                контактів
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {contactCount > 0 && `${contactCount} контактів`}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/campaigns")}
            >
              Скасувати
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Створення..." : "Створити кампанію"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import contacts with lead_id linked
async function importContactsWithLeads(
  campaignId: string,
  contacts: {
    phone_number: string;
    name?: string;
    variables?: Record<string, unknown>;
    lead_id: string;
  }[]
): Promise<{ error: string | null }> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const rows = contacts.map((c) => ({
    campaign_id: campaignId,
    phone_number: c.phone_number,
    name: c.name || null,
    variables: c.variables || {},
    lead_id: c.lead_id,
  }));

  const { error } = await supabase.from("campaign_contacts").insert(rows);

  if (error) return { error: error.message };

  // Update total count
  const { count } = await supabase
    .from("campaign_contacts")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await supabase
    .from("campaigns")
    .update({
      total_contacts: count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { error: null };
}
