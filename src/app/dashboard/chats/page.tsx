"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ConversationItem, type Conversation } from "@/components/chats/ConversationItem";
import { MessageBubble, type Message } from "@/components/chats/MessageBubble";
import { AISuggestionCard } from "@/components/chats/AISuggestionCard";
import { ReplyBox } from "@/components/chats/ReplyBox";

// ── Supabase client (browser client — for Realtime subscriptions) ────────────

const supabase = createClient();

// ── AI suggestion parser ──────────────────────────────────────────────────────

function extractSuggestion(msg: Message): string | null {
  if (!msg.private) return null;
  const prefix = "💡 Suggested reply:\n\n";
  if (!msg.content.startsWith(prefix)) return null;
  return msg.content.replace(prefix, "").trim();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversation list ────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (!res.ok) return;
    const data: Conversation[] = await res.json();
    setConversations(data);
    setConvLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: new conversations
  useEffect(() => {
    const ch = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadConversations]);

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

  // Realtime: new messages in active conversation
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
          setMessages((prev) => [...prev, msg as Message]);
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
    setConversations((prev) => prev.filter((c) => c.id !== activeConv.id));
    setActiveConv(null);
  }

  // Supabase Realtime handles new messages — no optimistic update needed
  function handleSent(_text: string) {}

  // ── Render ───────────────────────────────────────────────────────────────

  const contact = activeConv?.contacts;
  const contactName = contact?.name ?? "Невідомий";

  return (
    <div className="flex h-[calc(100vh-112px)] gap-4 -m-6 mt-0 px-6 pb-6">

      {/* ── Left panel: conversation list ── */}
      <div className="glass flex w-80 flex-shrink-0 flex-col rounded-xl overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-white">Розмови</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} відкритих
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Завантаження...</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Немає відкритих розмов</p>
            </div>
          ) : (
            conversations.map((conv) => (
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
              <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-sm font-bold text-brand flex-shrink-0">
                {contactName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{contactName}</p>
                <p className="text-xs text-muted-foreground">
                  {contact?.username ? `@${contact.username} · ` : ""}
                  <span className="capitalize">{activeConv.channel}</span>
                  {" · "}
                  <span className="text-green-400">відкрита</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={resolveConversation}
                className="gap-1.5 flex-shrink-0"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Resolve
              </Button>
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

                  if (suggestion && !dismissed.has(msg.id)) {
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

            {/* Reply box */}
            <ReplyBox convId={activeConv.id} onSent={handleSent} />
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
