"use client";

import { use, useState } from "react";
import { ArrowLeft, Play, Download, Clock, Phone, Bot, Copy, Check, UserCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useCall, useTranscript } from "@/lib/hooks/use-calls";

const speakerStyles: Record<string, string> = {
  agent: "bg-brand/10 border-brand/20",
  caller: "bg-white/5 border-white/10",
  system: "bg-warning/5 border-warning/20 font-mono text-xs",
};

const speakerLabels: Record<string, string> = {
  agent: "Агент",
  caller: "Клієнт",
  system: "Система",
};

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

function formatTime(seconds: number | null): string {
  if (seconds === null) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-white"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Скопійовано" : "Копіювати посилання"}
    </Button>
  );
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { call, loading: callLoading } = useCall(id);
  const { segments, loading: transcriptLoading } = useTranscript(id);

  if (callLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Завантаження...
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/calls" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Назад до дзвінків
        </Link>
        <EmptyState icon={Phone} title="Дзвінок не знайдено" />
      </div>
    );
  }

  const date = new Date(call.started_at);
  const agentName = (call.agents as unknown as { name: string })?.name || "—";

  return (
    <div className="space-y-4">
      <Link href="/dashboard/calls" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Назад до дзвінків
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Transcript (left, 3/5) */}
        <div className="glass col-span-3 rounded-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Транскрипція</h3>
          {transcriptLoading ? (
            <p className="text-sm text-muted-foreground">Завантаження...</p>
          ) : segments.length === 0 ? (
            <EmptyState icon={Phone} title="Немає транскрипції" description="Транскрипція буде доступна після обробки дзвінка." />
          ) : (
            <div className="space-y-3">
              {segments.map((seg) => (
                <div key={seg.id} className="flex gap-3">
                  <span className="mt-1 w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {formatTime(seg.start_time)}
                  </span>
                  <div className={`flex-1 rounded-lg border p-3 ${speakerStyles[seg.speaker] || speakerStyles.caller}`}>
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      {speakerLabels[seg.speaker] || seg.speaker}
                    </span>
                    <p className="text-sm text-white">{seg.text}</p>
                    {seg.tool_call && (
                      <p className="mt-1 font-mono text-xs text-brand">{seg.tool_call}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel (2/5) */}
        <div className="col-span-2 space-y-4">
          {/* Audio Player */}
          {call.recording_url && (
            <div className="glass rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Запис</h3>
                <CopyLinkButton url={call.recording_url} />
              </div>
              <audio controls className="w-full" src={call.recording_url}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Call Metadata */}
          <div className="glass rounded-xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Деталі</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> Номер
                </span>
                <span className="font-mono text-white">{call.caller_phone || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" /> Агент
                </span>
                <span className="text-white">{agentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Тривалість
                </span>
                <span className="font-mono text-white">{formatDuration(call.duration_seconds)}</span>
              </div>
              {call.lead_id && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <UserCircle className="h-3.5 w-3.5" /> Лід
                  </span>
                  <Link href={`/dashboard/leads/${call.lead_id}`} className="text-brand hover:underline">
                    Переглянути
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Дата</span>
                <span className="text-white">
                  {date.toLocaleDateString("uk-UA")}, {date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Статус</span>
                <Badge variant="secondary" className="bg-success/20 text-success">
                  {statusLabels[call.status] || call.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Sentiment */}
          {call.sentiment && (
            <div className="glass rounded-xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Аналіз sentiment</h3>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={sentimentColors[call.sentiment]}>
                  {sentimentLabels[call.sentiment]}
                </Badge>
                {call.sentiment_score !== null && (
                  <span className="text-sm text-muted-foreground">
                    Score: {call.sentiment_score.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {call.summary && (
            <div className="glass rounded-xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">AI-підсумок</h3>
              <p className="text-sm text-muted-foreground">{call.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
