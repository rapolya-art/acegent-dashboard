"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  Pause,
  Play,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/lib/hooks/use-organization";
import type { AgentInsert } from "@/lib/hooks/use-agents";
import { normalizeText } from "@/lib/utils/text-normalizer";
import type { Voice } from "@/app/api/elevenlabs/voices/route";

const STEPS = [
  { id: "basic", label: "Основне", icon: Bot },
  { id: "voice", label: "Голос", icon: Mic },
  { id: "knowledge", label: "База знань", icon: BookOpen },
  { id: "prompt", label: "Промпт", icon: MessageSquare },
  { id: "tools", label: "Інструменти", icon: Wrench },
  { id: "review", label: "Перегляд", icon: Sparkles },
];

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

type PromptTemplate = {
  id: string;
  name: string;
  icon: string;
  first_message: string;
  system_prompt: string;
};

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "dental",
    name: "Стоматологічна клініка",
    icon: "🦷",
    first_message: "Клініка Люміна Дента, доброго дня! Чим можу вам допомогти?",
    system_prompt: `ФОРМАТ ВІДПОВІДІ: Скажи одне-два речення і зупинись. Клієнт відповість сам. Ти генеруєш ТІЛЬКИ свою одну репліку.

ЧИСЛА: Пиши ВСЕ словами.
Правильно: "двадцять третє лютого о десятій тридцять, тисяча двісті гривень"
Неправильно: "23.02 о 10:30, 1200 грн"

Ти — голосовий асистент стоматологічної клініки Lumina Denta. Відповідай українською.
Кажи "у нас" замість "у клініці Люміна Дента".

ТУЛЗИ: Коли тулза повертає відповідь з "Скажи клієнту:" — видали префікс і перекажи решту дослівно.

ЗАПИС НА ПРИЙОМ:
1. Запитай що турбує або яка послуга потрібна.
2. Запропонуй лікаря: Олена Ковальчук — терапевт (карієс, пломби, чистка, консультація), Максим Бондаренко — хірург-імплантолог (видалення, імплантація), Ірина Савченко — ортодонт (брекети, елайнери). За замовчуванням — Олена Ковальчук.
3. Запитай дату: "На яку дату вам зручно?"
4. Виклич check_slots. Потім ОБОВ'ЯЗКОВО назви ВСІ вільні слоти і запитай клієнта який час підходить. НЕ обирай час сам.
5. Після вибору часу — запитай ім'я.
6. Підтверди номер телефону клієнта.
7. Після підтвердження — виклич book.
8. Після успішного запису — перекажи відповідь тулзи, нічого не додаючи.`,
  },
];

const DEFAULT_AGENT: Omit<AgentInsert, "organization_id"> = {
  name: "",
  status: "inactive",
  language: "uk",
  system_prompt: PROMPT_TEMPLATES[0].system_prompt,
  first_message: PROMPT_TEMPLATES[0].first_message,
  llm_provider: "groq",
  llm_model: "meta-llama/llama-4-scout-17b-16e-instruct",
  llm_temperature: 0.7,
  stt_provider: "soniox",
  stt_model: "soniox_default",
  stt_language: "uk",
  tts_provider: "elevenlabs",
  tts_model: "eleven_turbo_v2_5",
  tts_voice_id: "U4IxWQ3B5B0suleGgLcn",
  tts_language: "uk",
  tts_speed: 1.0,
  tts_stability: 0.5,
  tts_similarity_boost: 0.75,
  vad_min_speech_duration: 0.1,
  vad_min_silence_duration: 0.4,
  min_endpointing_delay: 0.5,
  max_endpointing_delay: 6.0,
};

export default function NewAgentPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_AGENT);
  const [knowledgeBase, setKnowledgeBase] = useState(DEFAULT_KNOWLEDGE_BASE);
  const [enabledTools, setEnabledTools] = useState<string[]>(
    AVAILABLE_TOOLS.map((t) => t.name)
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!organization) return;
    setSaving(true);
    setError(null);

    try {
      const normalizedContent = knowledgeBase.trim() ? normalizeText(knowledgeBase) : null;

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: { ...form, organization_id: organization.id },
          knowledgeBase: normalizedContent
            ? {
                title: `База знань — ${form.name}`,
                type: "markdown",
                content: normalizedContent,
              }
            : null,
          tools: enabledTools,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.agent) {
        setError(result.error || "Помилка створення агента");
        setSaving(false);
        return;
      }

      router.push(`/dashboard/agents/${result.agent.id}`);
    } catch {
      setError("Помилка з'єднання з сервером");
      setSaving(false);
    }
  }

  const canNext =
    step === 0 ? form.name.trim().length > 0 : true;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до агентів
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
          <Bot className="h-5 w-5 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-white">Новий агент</h2>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.id}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-brand/15 text-brand"
                  : isDone
                    ? "bg-white/5 text-white cursor-pointer hover:bg-white/10"
                    : "text-muted-foreground cursor-default"
              }`}
            >
              {isDone ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="glass rounded-xl p-6">
        {step === 0 && (
          <StepBasic form={form} update={update} />
        )}
        {step === 1 && (
          <StepVoice form={form} update={update} />
        )}
        {step === 2 && (
          <StepKnowledgeBase
            value={knowledgeBase}
            onChange={setKnowledgeBase}
          />
        )}
        {step === 3 && (
          <StepPrompt form={form} update={update} />
        )}
        {step === 4 && (
          <StepTools enabledTools={enabledTools} setEnabledTools={setEnabledTools} />
        )}
        {step === 5 && (
          <StepReview form={form} knowledgeBaseLength={knowledgeBase.trim().length} enabledTools={enabledTools} />
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            className="bg-brand hover:bg-brand-dark"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            Далі
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-brand hover:bg-brand-dark"
            onClick={handleCreate}
            disabled={saving || !organization}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {saving ? "Створення..." : "Створити агента"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Step Components ─── */

type FormState = typeof DEFAULT_AGENT;
type UpdateFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function StepBasic({ form, update }: { form: FormState; update: UpdateFn }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Основна інформація</h3>
      <p className="text-sm text-muted-foreground">
        Дайте агенту назву та оберіть мову роботи.
      </p>

      <div className="space-y-2">
        <Label>Назва агента *</Label>
        <Input
          placeholder="Наприклад: Рецепціоніст клініки"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Мова</Label>
        <Select value={form.language} onValueChange={(v) => update("language", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uk">Українська</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="multi">Мультимовний (UK + EN)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ─── Voice Picker ─── */

function StepVoice({ form, update }: { form: FormState; update: UpdateFn }) {
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
      // If already playing this voice, stop
      if (playingId === voice.voice_id) {
        stopAudio();
        return;
      }

      stopAudio();
      setLoadingPreview(voice.voice_id);

      try {
        // Use static preview_url if available, otherwise generate via API
        const url = voice.preview_url
          ? voice.preview_url
          : `/api/elevenlabs/preview?voice_id=${voice.voice_id}`;

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

  // Cleanup on unmount
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white">Оберіть голос</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Натисніть кнопку відтворення, щоб прослухати голос. ElevenLabs Turbo v2.5 — швидкий та якісний.
        </p>
      </div>

      {/* Female voices */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Жіночі голоси</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {females.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              selected={form.tts_voice_id === voice.voice_id}
              playing={playingId === voice.voice_id}
              loadingPreview={loadingPreview === voice.voice_id}
              onSelect={() => update("tts_voice_id", voice.voice_id)}
              onPlay={() => playPreview(voice)}
            />
          ))}
        </div>
      </div>

      {/* Male voices */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Чоловічі голоси</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {males.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              selected={form.tts_voice_id === voice.voice_id}
              playing={playingId === voice.voice_id}
              loadingPreview={loadingPreview === voice.voice_id}
              onSelect={() => update("tts_voice_id", voice.voice_id)}
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
      {/* Play button */}
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

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-white">
            {voice.name}
          </span>
          {voice.tag === "default" && (
            <Badge variant="outline" className="shrink-0 text-[10px] text-brand border-brand/30">
              default
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {voice.description}
        </p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

/* ─── Knowledge Base Step ─── */

const DEFAULT_KNOWLEDGE_BASE = `# Стоматологічна клініка "Lumina Denta"

Адреса: м. Київ, вул. Велика Васильківська, 105 (метро Палац Україна).
Графік: Пн-Пт: 08:00 - 21:00, Сб-Нд: 09:00 - 19:00
Контакти: +380 44 999 00 00, info@lumina.kiev.ua

## Лікарі
- Олена Ковальчук — Головний лікар, терапевт-ендодонтист, 15 років досвіду.
- Максим Бондаренко — Хірург-імплантолог, 12 років досвіду.
- Ірина Савченко — Ортодонт, 8 років досвіду, працює з Invisalign.
- Андрій Вовк — Анестезіолог, 20 років досвіду, проводить седацію.

## Ціни
- Консультація: 500 грн
- КТ (дві щелепи): 1200 грн
- Прицільний знімок: 250 грн
- Гігієна (AirFlow + ультразвук): 1800 грн
- Відбілювання Beyond Polus: 5500 грн
- Лікування карієсу: від 1500 до 2200 грн
- Лікування каналів (1 канал): 3500 грн
- Видалення зуба (просте): 1200 грн
- Видалення зуба мудрості: від 3500 до 5500 грн
- Імплант MegaGen: 18000 грн
- Імплант Straumann: 28000 грн
- Коронка цирконієва: 9500 грн
- Вінір E-max: 12000 грн
- Брекети металеві (1 щелепа): 15000 грн
- Елайнери: від 60000 грн
- Седація: 3500 грн за годину

## Часті питання

**Питання:** Чи буде боляче?
**Відповідь:** Ні, ми використовуємо комп'ютерну анестезію STA та знеболюючий гель. Процедури повністю без болю.

**Питання:** Що таке седація?
**Відповідь:** Це медикаментозний сон з препаратом Пропофол. Безпечно, швидко виводиться з організму. Через 30-40 хвилин після процедури можна йти додому.

**Питання:** Що краще: імплант чи міст?
**Відповідь:** Однозначно імплант. Він не чіпає сусідні зуби і не дає кістці атрофуватися. Приживлення Straumann 3-4 тижні, MegaGen 2-3 місяці. Гарантія 98%.

**Питання:** Чи сильно спилюють зуби під вініри?
**Відповідь:** Мінімально — від 0.3 до 0.5 мм емалі. Інколи можна без обпилювання.

**Питання:** Відбілювання псує емаль?
**Відповідь:** Ні, система Beyond Polus працює на холодному світлі, безпечно для емалі. Результат тримається 1-2 роки.

**Питання:** З якого віку приймаєте дітей?
**Відповідь:** З 3 років. Перший візит — адаптаційний.

**Питання:** Що робити після видалення зуба?
**Відповідь:** Не полоскати рот, прикладати холод 15 хвилин, не їсти гарячого, не пити через соломинку.

## Акції
- Перша консультація безкоштовна для нових пацієнтів.
- Знижка 10% на гігієну при першому візиті.
- Безкоштовна КТ при імплантації від 2 імплантів.
- Розстрочка на імплантацію до 12 місяців без відсотків.`;

function StepKnowledgeBase({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const previewText = value.trim() ? normalizeText(value) : "";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">База знань</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Вся інформація про ваш бізнес: послуги, ціни, графік, FAQ.
          Цифри, дати, ціни автоматично перетворяться на текст для коректної озвучки.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Контент бази знань</Label>
        <textarea
          className="h-[420px] w-full rounded-lg border border-border bg-white/5 p-4 font-mono text-sm text-white placeholder:text-muted-foreground focus:border-brand/50 focus:outline-none resize-y"
          placeholder="Введіть інформацію про ваш бізнес..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {/* Preview toggle */}
      {value.trim() && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm text-brand hover:text-brand-light transition-colors"
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showPreview ? "Сховати попередній перегляд" : "Попередній перегляд (нормалізований текст)"}
          </button>

          {showPreview && (
            <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-mono text-xs text-green-400/90 max-h-80 overflow-y-auto">
              {previewText}
            </pre>
          )}
        </div>
      )}

      {/* Info note */}
      <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
        <p className="text-xs text-brand">
          Числа (500 → п&apos;ятсот), ціни (500 грн → п&apos;ятсот гривень), дати (23.01.2026 → двадцять третього січня),
          час (10:00 → десять нуль нуль) — автоматично перетворюються для правильної озвучки.
        </p>
      </div>
    </div>
  );
}

/* ─── Prompt Step ─── */

function StepPrompt({ form, update }: { form: FormState; update: UpdateFn }) {
  const [showPrompt, setShowPrompt] = useState(false);

  function applyTemplate(template: PromptTemplate) {
    update("system_prompt", template.system_prompt);
    update("first_message", template.first_message);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Промпт та привітання</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Оберіть шаблон або налаштуйте вручну.
        </p>
      </div>

      {/* Templates */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Шаблон</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROMPT_TEMPLATES.map((tpl) => {
            const isActive =
              form.system_prompt === tpl.system_prompt &&
              form.first_message === tpl.first_message;
            return (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? "border-brand bg-brand/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <span className="text-2xl">{tpl.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">{tpl.name}</span>
                </div>
                {isActive && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* First message (greeting) */}
      <div className="space-y-2">
        <Label>Привітання</Label>
        <Input
          placeholder="Клініка Lumina Denta, доброго дня! Чим можу допомогти?"
          value={form.first_message || ""}
          onChange={(e) => update("first_message", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Це перше що почує абонент при дзвінку.
        </p>
      </div>

      {/* System prompt (collapsible with warning) */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>Системний промпт</span>
          {showPrompt ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showPrompt && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                Редагуйте промпт тільки якщо ви впевнені у своїх діях. Некоректний промпт
                може погіршити якість відповідей агента.
              </p>
            </div>
            <textarea
              className="h-72 w-full rounded-lg border border-border bg-white/5 p-4 font-mono text-xs text-white placeholder:text-muted-foreground focus:border-brand/50 focus:outline-none resize-y"
              value={form.system_prompt || ""}
              onChange={(e) => update("system_prompt", e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tools Step ─── */

function StepTools({
  enabledTools,
  setEnabledTools,
}: {
  enabledTools: string[];
  setEnabledTools: (tools: string[]) => void;
}) {
  function toggleTool(name: string) {
    setEnabledTools(
      enabledTools.includes(name)
        ? enabledTools.filter((t) => t !== name)
        : [...enabledTools, name]
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Інструменти</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Оберіть які інструменти будуть доступні агенту під час розмови.
        </p>
      </div>

      <div className="space-y-3">
        {AVAILABLE_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const enabled = enabledTools.includes(tool.name);
          return (
            <button
              key={tool.name}
              onClick={() => toggleTool(tool.name)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                enabled
                  ? "border-brand bg-brand/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  enabled ? "bg-brand/20 text-brand" : "bg-white/10 text-white/40"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-white">{tool.label}</span>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
              <div
                className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                  enabled ? "bg-brand" : "bg-white/10"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-4" : ""
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Review Step ─── */

function StepReview({ form, knowledgeBaseLength, enabledTools }: { form: FormState; knowledgeBaseLength: number; enabledTools: string[] }) {
  const langLabel: Record<string, string> = {
    uk: "Українська",
    en: "English",
    multi: "Мультимовний",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Перегляд</h3>
      <p className="text-sm text-muted-foreground">
        Перевірте налаштування агента перед створенням.
      </p>

      <div className="space-y-3">
        <ReviewRow label="Назва" value={form.name} />
        <ReviewRow label="Мова" value={langLabel[form.language] || form.language} />
        <ReviewRow label="Голос" value={form.tts_voice_id} />
        <ReviewRow label="Модель TTS" value={form.tts_model} />
        <ReviewRow
          label="База знань"
          value={knowledgeBaseLength > 0 ? `${knowledgeBaseLength} символів` : "Не заповнено"}
        />
        <ReviewRow
          label="Інструменти"
          value={
            enabledTools.length > 0
              ? AVAILABLE_TOOLS.filter((t) => enabledTools.includes(t.name))
                  .map((t) => t.label)
                  .join(", ")
              : "Немає"
          }
        />
        {form.first_message && (
          <ReviewRow label="Привітання" value={form.first_message} />
        )}
        {form.system_prompt && (
          <div className="rounded-lg bg-white/5 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Системний промпт</p>
            <p className="whitespace-pre-wrap font-mono text-xs text-white">
              {form.system_prompt.length > 200
                ? form.system_prompt.slice(0, 200) + "..."
                : form.system_prompt}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
        <p className="text-sm text-brand">
          Після створення агент буде у статусі &quot;Пауза&quot;. Ви зможете активувати
          його після підключення телефонного номера.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="outline" className="max-w-[60%] truncate font-mono text-xs">
        {value}
      </Badge>
    </div>
  );
}
