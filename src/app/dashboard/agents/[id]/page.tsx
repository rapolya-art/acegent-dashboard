"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Bot,
  Calendar,
  CalendarCheck,
  Check,
  DollarSign,
  Loader2,
  Pause,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAgent,
  useAgentTools,
  updateAgent,
  updateAgentTool,
  createAgentTool,
  deleteAgentTool,
} from "@/lib/hooks/use-agents";
import type { Voice } from "@/app/api/elevenlabs/voices/route";
import type { AgentTool } from "@/lib/types";

const AVAILABLE_TOOLS = [
  {
    name: "check_slots",
    label: "Перевірка слотів",
    description: "Перевіряє розклад та показує вільні слоти для запису",
    icon: Calendar,
  },
  {
    name: "book",
    label: "Запис на прийом",
    description: "Бронює час у розкладі та надсилає SMS-підтвердження",
    icon: CalendarCheck,
  },
  {
    name: "price",
    label: "Ціни на послуги",
    description: "Відповідає на запитання про вартість послуг",
    icon: DollarSign,
  },
];

const TOOL_ICONS: Record<string, typeof Calendar> = Object.fromEntries(
  AVAILABLE_TOOLS.map((t) => [t.name, t.icon])
);
const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  AVAILABLE_TOOLS.map((t) => [t.name, t.label])
);
const TOOL_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  AVAILABLE_TOOLS.map((t) => [t.name, t.description])
);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { agent, loading } = useAgent(id);
  const { tools, loading: toolsLoading, setTools } = useAgentTools(id);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when agent loads
  useEffect(() => {
    if (agent) {
      setForm({
        system_prompt: agent.system_prompt || "",
        first_message: agent.first_message || "",
        tts_voice_id: agent.tts_voice_id,
      });
    }
  }, [agent]);

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!agent) return;
    setSaving(true);
    setError(null);

    const { error: err } = await updateAgent(agent.id, {
      system_prompt: form.system_prompt as string,
      first_message: form.first_message as string,
      tts_voice_id: form.tts_voice_id as string,
    });

    setSaving(false);

    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleToggleTool(tool: AgentTool) {
    const newEnabled = !tool.enabled;
    setTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, enabled: newEnabled } : t))
    );
    const { error: err } = await updateAgentTool(tool.id, newEnabled);
    if (err) {
      setTools((prev) =>
        prev.map((t) =>
          t.id === tool.id ? { ...t, enabled: !newEnabled } : t
        )
      );
    }
  }

  async function handleAddTool(name: string) {
    if (!agent) return;
    const desc = TOOL_DESCRIPTIONS[name] || "";
    const { tool: created, error: err } = await createAgentTool(agent.id, name, desc);
    if (created) {
      setTools((prev) => [...prev, created]);
    }
    if (err) {
      setError(err);
    }
  }

  async function handleDeleteTool(toolId: string) {
    setTools((prev) => prev.filter((t) => t.id !== toolId));
    const { error: err } = await deleteAgentTool(toolId);
    if (err) {
      setError(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Завантаження...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад до агентів
        </Link>
        <EmptyState icon={Bot} title="Агент не знайдений" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до агентів
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
            <Bot className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{agent.name}</h2>
            <Badge
              variant="secondary"
              className={
                agent.status === "active"
                  ? "bg-success/20 text-success"
                  : "bg-warning/20 text-warning"
              }
            >
              {agent.status === "active" ? "Активний" : agent.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <span className="flex items-center gap-1 text-sm text-success">
              <Check className="h-4 w-4" />
              Збережено
            </span>
          )}
          <Button
            className="gap-2 bg-brand hover:bg-brand-dark"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="prompt">Промпт</TabsTrigger>
          <TabsTrigger value="voice">Голос</TabsTrigger>
          <TabsTrigger value="tools">Інструменти</TabsTrigger>
          <TabsTrigger value="metrics">Метрики</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="mt-4 space-y-4">
          <div className="glass rounded-xl p-5">
            <Label className="mb-2 block text-sm font-semibold text-white">
              Системний промпт
            </Label>
            <textarea
              className="h-64 w-full rounded-lg border border-border bg-white/5 p-4 font-mono text-sm text-white placeholder:text-muted-foreground focus:border-brand/50 focus:outline-none"
              value={(form.system_prompt as string) ?? ""}
              onChange={(e) => set("system_prompt", e.target.value)}
            />
          </div>
          <div className="glass rounded-xl p-5">
            <Label className="mb-2 block text-sm font-semibold text-white">
              Перше повідомлення (привітання)
            </Label>
            <Input
              value={(form.first_message as string) ?? ""}
              onChange={(e) => set("first_message", e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="voice" className="mt-4">
          <VoicePicker
            selectedVoiceId={(form.tts_voice_id as string) ?? ""}
            onSelect={(voiceId) => set("tts_voice_id", voiceId)}
          />
        </TabsContent>

        <TabsContent value="tools" className="mt-4 space-y-4">
          {/* Active tools */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Активні інструменти
            </h3>
            {toolsLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            ) : tools.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Немає налаштованих інструментів. Додайте зі списку нижче.
              </p>
            ) : (
              <div className="space-y-3">
                {tools.map((tool) => {
                  const Icon = TOOL_ICONS[tool.name] || Calendar;
                  return (
                    <div
                      key={tool.id}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all ${
                        tool.enabled
                          ? "border-brand bg-brand/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          tool.enabled
                            ? "bg-brand/20 text-brand"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-white">
                          {TOOL_LABELS[tool.name] || tool.name}
                        </span>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleTool(tool)}
                        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                          tool.enabled ? "bg-brand" : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            tool.enabled ? "translate-x-4" : ""
                          }`}
                        />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteTool(tool.id)}
                        className="shrink-0 rounded-lg p-2 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add tools */}
          {(() => {
            const existingNames = tools.map((t) => t.name);
            const available = AVAILABLE_TOOLS.filter(
              (t) => !existingNames.includes(t.name)
            );
            if (available.length === 0) return null;
            return (
              <div className="glass rounded-xl p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">
                  Додати інструмент
                </h3>
                <div className="space-y-3">
                  {available.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => handleAddTool(tool.name)}
                        className="flex w-full items-center gap-4 rounded-xl border border-dashed border-white/10 p-4 text-left transition-all hover:border-brand/40 hover:bg-brand/5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/30">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-white/70">
                            {tool.label}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-lg bg-brand/10 p-2 text-brand">
                          <Plus className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="metrics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground">Всього дзвінків</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {agent.total_calls.toLocaleString()}
              </p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground">Успішність</p>
              <p className="mt-1 text-3xl font-bold text-success">
                {Math.round(agent.success_rate)}%
              </p>
            </div>
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Середня тривалість
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatDuration(agent.avg_duration_seconds)}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Voice Picker (reused pattern from wizard) ─── */

function VoicePicker({
  selectedVoiceId,
  onSelect,
}: {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/elevenlabs/voices")
      .then((r) => r.json())
      .then((d) => setVoices(d.voices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const playPreview = useCallback(
    async (voice: Voice) => {
      if (playingId === voice.voice_id) {
        stopAudio();
        return;
      }
      stopAudio();
      setLoadingPreview(voice.voice_id);
      try {
        const url = voice.preview_url || `/api/elevenlabs/preview?voice_id=${voice.voice_id}`;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.oncanplaythrough = () => {
          setLoadingPreview(null);
          setPlayingId(voice.voice_id);
          audio.play();
        };
        audio.onended = () => {
          setPlayingId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setLoadingPreview(null);
          setPlayingId(null);
          audioRef.current = null;
        };
        audio.load();
      } catch {
        setLoadingPreview(null);
      }
    },
    [playingId, stopAudio]
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const females = voices.filter((v) => v.gender === "female");
  const males = voices.filter((v) => v.gender === "male");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Голос агента</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Натисніть кнопку відтворення для прослуховування. Зміни зберігаються кнопкою &quot;Зберегти&quot;.
        </p>
      </div>

      {/* Female voices */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">Жіночі голоси</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {females.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              selected={selectedVoiceId === voice.voice_id}
              playing={playingId === voice.voice_id}
              loadingPreview={loadingPreview === voice.voice_id}
              onSelect={() => onSelect(voice.voice_id)}
              onPlay={() => playPreview(voice)}
            />
          ))}
        </div>
      </div>

      {/* Male voices */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground">Чоловічі голоси</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {males.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              selected={selectedVoiceId === voice.voice_id}
              playing={playingId === voice.voice_id}
              loadingPreview={loadingPreview === voice.voice_id}
              onSelect={() => onSelect(voice.voice_id)}
              onPlay={() => playPreview(voice)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VoiceCard({
  voice,
  selected,
  playing,
  loadingPreview,
  onSelect,
  onPlay,
}: {
  voice: Voice;
  selected: boolean;
  playing: boolean;
  loadingPreview: boolean;
  onSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
        selected
          ? "border-brand bg-brand/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
          playing
            ? "bg-brand text-white"
            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
        }`}
      >
        {loadingPreview ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">
            {voice.name}
          </span>
          {voice.tag === "default" && (
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] text-brand border-brand/30"
            >
              default
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {voice.description}
        </p>
      </div>
      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
