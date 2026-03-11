"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/lib/hooks/use-organization";
import { createLead } from "@/lib/hooks/use-leads";

export default function NewLeadPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    phone: "",
    name: "",
    email: "",
    company: "",
    position: "",
    tags: "",
    notes: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!organization || !form.phone) return;
    setSaving(true);
    setError(null);

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error: err } = await createLead(organization.id, {
      phone: form.phone,
      name: form.name || undefined,
      email: form.email || undefined,
      company: form.company || undefined,
      position: form.position || undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: form.notes || undefined,
    });

    if (err) {
      setError(err);
      setSaving(false);
      return;
    }

    router.push("/dashboard/leads");
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <h1 className="text-2xl font-bold text-white">Новий лід</h1>

      <div className="glass rounded-xl p-6 space-y-4 max-w-xl">
        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">
            Телефон *
          </label>
          <Input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+380501234567"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Ім&apos;я
            </label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Іван Петренко"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Email
            </label>
            <Input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="ivan@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Компанія
            </label>
            <Input
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Lumina Denta"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">
              Посада
            </label>
            <Input
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              placeholder="Директор"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">
            Теги <span className="text-xs">(через кому)</span>
          </label>
          <Input
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            placeholder="Стоматологія, Київ, Hot"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-muted-foreground">
            Нотатки
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Додаткова інформація про ліда..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={!form.phone || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити лід
          </Button>
        </div>
      </div>
    </div>
  );
}
