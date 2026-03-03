"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useAgents } from "@/lib/hooks/use-agents";
import { createCampaign, importContacts } from "@/lib/hooks/use-campaigns";

export default function NewCampaignPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { agents } = useAgents(organization?.id);

  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [contactsText, setContactsText] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState("1");
  const [callsPerMinute, setCallsPerMinute] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!organization?.id || !name || !agentId) {
      setError("Заповніть всі обов'язкові поля");
      return;
    }

    setSaving(true);
    setError(null);

    // Find agent's active workflow
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

    // Parse and import contacts
    if (contactsText.trim()) {
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

        {/* Contacts */}
        <div className="space-y-2">
          <Label>
            Контакти{" "}
            <span className="text-xs text-muted-foreground">
              (по одному на рядок: номер, ім&apos;я)
            </span>
          </Label>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            rows={8}
            placeholder={"+380501234567, Іван Петренко\n+380671234567, Марія Коваленко"}
            value={contactsText}
            onChange={(e) => setContactsText(e.target.value)}
          />
          {contactsText.trim() && (
            <p className="text-xs text-muted-foreground">
              {contactsText.trim().split("\n").filter((l) => l.trim()).length}{" "}
              контактів
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-3">
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
  );
}
