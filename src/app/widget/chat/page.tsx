"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Msg { id: string; content: string; message_type: string; created_at: string; }

function getSessionId(): string {
  const key = "aceverse_widget_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const supabase = createClient();

function ChatWidget() {
  const params = useSearchParams();
  const orgId = params.get("org_id") ?? "";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription when conv established
  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`widget-msgs-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${convId}`,
      }, ({ new: msg }) => {
        const m = msg as Msg;
        if (!m.private && m.message_type !== "incoming") {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;
    setSending(true);

    // Optimistic: show user message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId, content: content.trim(),
      message_type: "incoming", created_at: new Date().toISOString(),
    }]);
    setText("");

    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          session_id: getSessionId(),
          message: content.trim(),
          name: name || undefined,
        }),
      });
      const data = await res.json();
      if (data.conv_id) setConvId(data.conv_id);
    } finally {
      setSending(false);
    }
  }, [orgId, name, sending]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(text);
    }
  }

  const s: Record<string, React.CSSProperties> = {
    container: {
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#0f0f1a", fontFamily: "system-ui, sans-serif",
      color: "#fff",
    },
    header: {
      padding: "14px 16px", background: "rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
    },
    avatar: {
      width: 36, height: 36, borderRadius: "50%",
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
    },
    msgs: { flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
    bubble: (out: boolean): React.CSSProperties => ({
      maxWidth: "80%",
      padding: "9px 13px",
      borderRadius: out ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: out ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.08)",
      color: "#fff", fontSize: 14, lineHeight: 1.5,
      alignSelf: out ? "flex-end" : "flex-start",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }),
    inputRow: {
      padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", gap: 8, flexShrink: 0,
    },
    textarea: {
      flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12, color: "#fff", fontSize: 14, padding: "9px 12px",
      resize: "none" as const, outline: "none", fontFamily: "inherit", lineHeight: 1.5,
    },
    sendBtn: {
      padding: "0 18px", borderRadius: 12, border: "none",
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
  };

  if (!started) {
    return (
      <div style={{ ...s.container, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={s.avatar}>🤖</div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Привіт! Чим можу допомогти?</p>
          <p style={{ fontSize: 13, color: "#a0a0b0", marginBottom: 20 }}>AI-асистент Aceverse</p>
        </div>
        <input
          type="text"
          placeholder="Ваше ім'я (необов'язково)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: "100%", maxWidth: 280, padding: "10px 14px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
            color: "#fff", fontSize: 14, marginBottom: 12, outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => setStarted(true)}
          style={{
            padding: "12px 28px", borderRadius: 50, border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Розпочати чат 💬
        </button>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.avatar}>🤖</div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>AI-асистент</p>
          <p style={{ fontSize: 12, color: "#6ee7b7" }}>● Онлайн</p>
        </div>
      </div>

      <div style={s.msgs}>
        <div style={s.bubble(false)}>Привіт{name ? `, ${name}` : ""}! Чим можу допомогти? 😊</div>
        {messages.map((m) => (
          <div key={m.id} style={s.bubble(m.message_type === "incoming")}>{m.content}</div>
        ))}
        {sending && (
          <div style={s.bubble(false)}>
            <span style={{ opacity: 0.6 }}>друкує...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputRow}>
        <textarea
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Напишіть повідомлення..."
          disabled={sending}
          style={s.textarea}
        />
        <button
          onClick={() => sendMessage(text)}
          disabled={!text.trim() || sending}
          style={{ ...s.sendBtn, opacity: (!text.trim() || sending) ? 0.5 : 1 }}
        >
          ↑
        </button>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
      `}</style>
    </div>
  );
}

export default function ChatWidgetPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0f0f1a", height: "100vh" }} />}>
      <ChatWidget />
    </Suspense>
  );
}
