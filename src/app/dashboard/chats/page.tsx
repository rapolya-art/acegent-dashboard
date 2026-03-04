"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { ConversationItem, type Conversation } from "@/components/chats/ConversationItem";
import { MessageBubble, type Message } from "@/components/chats/MessageBubble";
import { AISuggestionCard } from "@/components/chats/AISuggestionCard";
import { ReplyBox } from "@/components/chats/ReplyBox";

// ── Supabase client (browser — for Realtime) ────────────────────────────────

const supabase = createClient();

// ── AI suggestion parser ──────────────────────────────────────────────────────

function extractSuggestion(msg: Message): string | null {
  if (!msg.private) return null;
  const prefix = "💡 Suggested reply:\n\n";
  if (!msg.content.startsWith(prefix)) return null;
  return msg.content.replace(prefix, "").trim();
}

type Tab = "open" | "resolved" | "escalated";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [allConvs, setAllConvs] = useState<Record<Tab, Conversation[]>>({ open: [], resolved: [], escalated: [] });
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [counts, setCounts] = useState<Record<Tab, number>>({ open: 0, resolved: 0, escalated: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load helpers ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [openRes, resolvedRes, escalatedRes, countsRes] = await Promise.all([
      fetch("/api/conversations?status=open"),
      fetch("/api/conversations?status=resolved"),
      fetch("/api/conversations?status=escalated"),
      fetch("/api/conversations/counts"),
    ]);
    const [openData, resolvedData, escalatedData] = await Promise.all([
      openRes.ok ? openRes.json() : [],
      resolvedRes.ok ? resolvedRes.json() : [],
      escalatedRes.ok ? escalatedRes.json() : [],
    ]);
    setAllConvs({ open: openData, resolved: resolvedData, escalated: escalatedData });
    if (countsRes.ok) setCounts(await countsRes.json());
    setInitialLoading(false);
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Realtime: conversations changes → reload all lists + counts ───────────

  useEffect(() => {
    const ch = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => { loadAll(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  // ── Load messages for active conversation ────────────────────────────────

  const loadMessages = useCallback(async (convId: number) => {
    setMsgLoading(true);
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) {
      const data: Message[] = await res.json();
      setMessages(data);
    }
    setMsgLoading(false);
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    setMessages([]);
    setDismissed(new Set());
    loadMessages(activeConv.id);
  }, [activeConv, loadMessages]);

  // ── Realtime: new messages in active conversation ─────────────────────────

  useEffect(() => {
    if (!activeConv) return;
    const ch = supabase
      .channel(`messages-${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        ({ new: msg }) => {
          setMessages((prev) => {
            // Deduplicate: skip if already present by id or by optimistic match
            if (prev.some((m) => m.id === (msg as Message).id)) return prev;
            // Remove optimistic message with same content
            const filtered = prev.filter(
              (m) => !(m.id > 1e12 && m.content === (msg as Message).content && m.message_type === (msg as Message).message_type)
            );
            return [...filtered, msg as Message];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeConv]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Resolve conversation ─────────────────────────────────────────────────

  async function resolveConversation() {
    if (!activeConv) return;
    await fetch(`/api/conversations/${activeConv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    setAllConvs((prev) => ({ ...prev, escalated: prev.escalated.filter((c) => c.id !== activeConv.id), open: prev.open.filter((c) => c.id !== activeConv.id) }));
    setActiveConv(null);
    setTab("resolved");
    loadAll();
  }

  function handleSent(text: string) {
    if (!activeConv) return;
    const optimistic: Message = {
      id: Date.now(),
      conversation_id: activeConv.id,
      content: text,
      message_type: "outgoing",
      private: false,
      sender_type: "agent",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => {
      if (prev.some((m) => m.content === text && m.message_type === "outgoing" && Date.now() - new Date(m.created_at).getTime() < 5000)) {
        return prev;
      }
      return [...prev, optimistic];
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const contact = activeConv?.contacts;
  const contactName = contact?.name ?? "Невідомий";
  const isResolved = activeConv?.status === "resolved";
  const isEscalated = activeConv?.status === "escalated";

  return (
    <div className="flex h-[calc(100vh-112px)] gap-4 -m-6 mt-0 px-6 pb-6">

      {/* ── Left panel: conversation list ── */}
      <div className="glass flex w-80 flex-shrink-0 flex-col rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("open")}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === "open"
                ? "text-white border-b-2 border-brand -mb-px"
                : "text-muted-foreground hover:text-white"
            )}
          >
            Відкриті
            {counts.open > 0 && (
              <span className="ml-1.5 rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] text-brand">
                {counts.open}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === "resolved"
                ? "text-white border-b-2 border-brand -mb-px"
                : "text-muted-foreground hover:text-white"
            )}
          >
            Вирішені
            {counts.resolved > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {counts.resolved}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("escalated")}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === "escalated"
                ? "text-white border-b-2 border-amber-500 -mb-px"
                : "text-muted-foreground hover:text-white"
            )}
          >
            Ескаловані
            {counts.escalated > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                {counts.escalated}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {initialLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Завантаження...</div>
          ) : allConvs[tab].length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                {tab === "open" ? "Немає відкритих розмов" : tab === "resolved" ? "Немає вирішених розмов" : "Немає ескалованих розмов"}
              </p>
            </div>
          ) : (
            allConvs[tab].map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={activeConv?.id === conv.id}
                onClick={() => setActiveConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: chat thread ── */}
      <div className="glass flex flex-1 flex-col rounded-xl overflow-hidden">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {contact?.avatar_url && <AvatarImage src={contact.avatar_url} alt={contactName} />}
                <AvatarFallback className="bg-brand/20 text-sm font-bold text-brand">
                  {contactName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{contactName}</p>
                <p className="text-xs text-muted-foreground">
                  {contact?.username ? `@${contact.username} · ` : ""}
                  <span className="capitalize">{activeConv.channel}</span>
                  {" · "}
                  <span className={isResolved ? "text-muted-foreground" : isEscalated ? "text-amber-400" : "text-green-400"}>
                    {isResolved ? "вирішена" : isEscalated ? "ескальована" : "відкрита"}
                  </span>
                </p>
              </div>
              {!isResolved && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resolveConversation}
                  className="gap-1.5 flex-shrink-0"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Вирішено
                </Button>
              )}
              {isEscalated && (
                <div className="flex items-center gap-1.5 flex-shrink-0 text-amber-400 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Потрібна увага
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {msgLoading && messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Завантаження...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Немає повідомлень</p>
              ) : (
                messages.map((msg) => {
                  const suggestion = extractSuggestion(msg);

                  if (suggestion && !dismissed.has(msg.id) && !isResolved) {
                    return (
                      <AISuggestionCard
                        key={msg.id}
                        suggestion={suggestion}
                        convId={activeConv.id}
                        onDismiss={() => setDismissed((prev) => new Set([...prev, msg.id]))}
                        onSent={handleSent}
                      />
                    );
                  }

                  if (msg.private) return null;

                  return (
                    <div key={msg.id} className="px-4">
                      <MessageBubble message={msg} />
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box — only for open and escalated conversations */}
            {!isResolved && <ReplyBox convId={activeConv.id} onSent={handleSent} />}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Оберіть розмову зліва</p>
          </div>
        )}
      </div>
    </div>
  );
}
