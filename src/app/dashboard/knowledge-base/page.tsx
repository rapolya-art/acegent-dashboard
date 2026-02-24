"use client";

import { useState } from "react";
import { FileText, Upload, CheckCircle, Loader2, AlertCircle, BookOpen, Pencil, Trash2, Eye, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useDocuments, updateDocument, deleteDocument, createDocument } from "@/lib/hooks/use-knowledge-base";
import type { KBDocument } from "@/lib/types";

const statusIcons: Record<string, React.ReactNode> = {
  ready: <CheckCircle className="h-4 w-4 text-success" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-brand" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
};

const statusLabels: Record<string, string> = {
  ready: "Готовий",
  processing: "Обробка...",
  error: "Помилка",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function KnowledgeBasePage() {
  const { organization } = useOrganization();
  const { documents, loading, refetch } = useDocuments(organization?.id);
  const [selected, setSelected] = useState<KBDocument | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create" | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  function openView(doc: KBDocument) {
    setSelected(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content || "");
    setMode("view");
  }

  function openEdit(doc: KBDocument) {
    setSelected(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content || "");
    setMode("edit");
  }

  function openCreate() {
    setSelected(null);
    setEditTitle("");
    setEditContent("");
    setMode("create");
  }

  function closePanel() {
    setSelected(null);
    setMode(null);
  }

  async function handleSave() {
    setSaving(true);
    if (mode === "edit" && selected) {
      await updateDocument(selected.id, { title: editTitle, content: editContent });
    } else if (mode === "create" && organization) {
      await createDocument({
        organization_id: organization.id,
        title: editTitle,
        type: editTitle.endsWith(".md") ? "markdown" : "text",
        content: editContent,
      });
    }
    setSaving(false);
    closePanel();
    refetch();
  }

  async function handleDelete(doc: KBDocument) {
    if (!confirm(`Видалити "${doc.title}"?`)) return;
    await deleteDocument(doc.id);
    if (selected?.id === doc.id) closePanel();
    refetch();
  }

  return (
    <div className="flex gap-4">
      {/* Left: Document List */}
      <div className={`space-y-4 ${mode ? "w-1/2" : "w-full"} transition-all`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Документи бази знань для ваших агентів
          </p>
          <Button className="gap-2 bg-brand hover:bg-brand-dark" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Новий документ
          </Button>
        </div>

        {/* Upload Zone */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <Upload className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Перетягніть файли сюди</p>
            <p className="text-xs text-muted-foreground">.md, .txt, .pdf — макс. 10 MB</p>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Завантаження...</div>
        ) : documents.length === 0 ? (
          <EmptyState icon={BookOpen} title="Немає документів" description="Створіть або завантажте документ для бази знань." />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`glass flex items-center justify-between rounded-xl p-4 transition-all cursor-pointer ${
                  selected?.id === doc.id ? "border-brand/40 ring-1 ring-brand/20" : "hover:border-brand/20"
                }`}
                onClick={() => openView(doc)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                    <FileText className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <h4 className="font-mono text-sm font-medium text-white">{doc.title}</h4>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatBytes(doc.size_bytes)}</span>
                      <span>{doc.chunks} chunks</span>
                      {doc.agents?.name && <span>Агент: {doc.agents.name}</span>}
                      <span>Оновлено: {new Date(doc.updated_at).toLocaleDateString("uk-UA")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="mr-2 flex items-center gap-1.5">
                    {statusIcons[doc.status]}
                    <span className="text-xs text-muted-foreground">{statusLabels[doc.status] || doc.status}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(doc)} title="Редагувати">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} title="Видалити" className="hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: View/Edit Panel */}
      {mode && (
        <div className="glass w-1/2 rounded-xl p-5 space-y-4 sticky top-4 self-start">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {mode === "view" && "Перегляд документа"}
              {mode === "edit" && "Редагування документа"}
              {mode === "create" && "Новий документ"}
            </h3>
            <div className="flex items-center gap-2">
              {mode === "view" && selected && (
                <Button variant="ghost" size="sm" onClick={() => setMode("edit")}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Редагувати
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={closePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {mode === "view" ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Назва</Label>
                <p className="font-mono text-sm text-white">{selected?.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Вміст</Label>
                <pre className="mt-1 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-white/5 p-4 font-mono text-xs text-muted-foreground">
                  {selected?.content || "(вміст не збережено)"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs">Назва файлу</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="document.md"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Вміст</Label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Вміст документа..."
                  className="w-full min-h-[40vh] max-h-[60vh] rounded-lg border border-border bg-white/5 p-4 font-mono text-xs text-white placeholder:text-muted-foreground focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/20 resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="gap-2 bg-brand hover:bg-brand-dark"
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Збереження..." : "Зберегти"}
                </Button>
                <Button variant="ghost" onClick={closePanel}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
