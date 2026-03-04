"use client";

import { useCallback, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
  ConversationHeader,
  Avatar,
  MessageModel,
} from "@chatscope/chat-ui-kit-react";

/* ── helpers ─────────────────────────────────────────────────────────── */

function getSessionId(): string {
  const key = "aceverse_widget_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/* ── inner widget ────────────────────────────────────────────────────── */

function ChatWidget() {
  const params = useSearchParams();
  const orgId = params.get("org_id") ?? "";

  const [messages, setMessages] = useState<MessageModel[]>([
    {
      message: "Привіт! Чим можу допомогти? 😊",
      direction: "incoming" as const,
      position: "single" as const,
      sender: "AI-асистент",
      sentTime: new Date().toLocaleTimeString("uk"),
    },
  ]);
  const [typing, setTyping] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [escalated, setEscalated] = useState(false);
  const sendingRef = useRef(false);

  /* ── send ─────────────────────────────────────────────────────────── */

  const handleSend = useCallback(
    async (_innerHtml: string, textContent: string) => {
      const text = textContent.trim();
      if (!text || sendingRef.current) return;
      sendingRef.current = true;

      // user bubble
      setMessages((prev) => [
        ...prev,
        {
          message: text,
          direction: "outgoing" as const,
          position: "single" as const,
          sender: "user",
          sentTime: new Date().toLocaleTimeString("uk"),
        },
      ]);

      setTyping(true);

      try {
        const res = await fetch("/api/widget/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            session_id: getSessionId(),
            message: text,
            name: name || undefined,
          }),
        });
        const data = await res.json();

        if (data.conv_id) setConvId(data.conv_id);

        if (data.escalated) setEscalated(true);

        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              message: data.reply,
              direction: "incoming" as const,
              position: "single" as const,
              sender: "AI-асистент",
              sentTime: new Date().toLocaleTimeString("uk"),
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            message: "Помилка з'єднання. Спробуйте ще раз.",
            direction: "incoming" as const,
            position: "single" as const,
            sender: "system",
            sentTime: new Date().toLocaleTimeString("uk"),
          },
        ]);
      } finally {
        setTyping(false);
        sendingRef.current = false;
      }
    },
    [orgId, name, escalated],
  );

  /* ── welcome screen ──────────────────────────────────────────────── */

  if (!started) {
    return (
      <div style={welcomeStyle.container}>
        <div style={welcomeStyle.avatar}>🤖</div>
        <p style={welcomeStyle.title}>Привіт! Чим можу допомогти?</p>
        <p style={welcomeStyle.subtitle}>AI-асистент Aceverse</p>
        <input
          type="text"
          placeholder="Ваше ім'я (необов'язково)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={welcomeStyle.input}
        />
        <button onClick={() => setStarted(true)} style={welcomeStyle.btn}>
          Розпочати чат 💬
        </button>
      </div>
    );
  }

  /* ── chat UI ─────────────────────────────────────────────────────── */

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* dark theme overrides for chatscope */
        .cs-main-container { background: #0f0f1a !important; border: none !important; }
        .cs-chat-container { background: #0f0f1a !important; }
        .cs-message-list { background: #0f0f1a !important; }
        .cs-message__content { font-size: 14px !important; line-height: 1.5 !important; }
        .cs-message--incoming .cs-message__content { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
        .cs-message--outgoing .cs-message__content { background: linear-gradient(135deg, #6366f1, #8b5cf6) !important; color: #fff !important; }
        .cs-message-input { background: rgba(255,255,255,0.04) !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
        .cs-message-input__content-editor-wrapper { background: rgba(255,255,255,0.06) !important; border-radius: 12px !important; }
        .cs-message-input__content-editor { color: #fff !important; }
        .cs-message-input__content-editor[data-placeholder]::before { color: rgba(255,255,255,0.35) !important; }
        .cs-button--send { color: #8b5cf6 !important; }
        .cs-button--attachment { display: none !important; }
        .cs-typing-indicator { background: transparent !important; }
        .cs-typing-indicator__text { color: rgba(255,255,255,0.5) !important; }
        .cs-typing-indicator__dot { background: #8b5cf6 !important; }
        .cs-conversation-header { background: rgba(255,255,255,0.05) !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
        .cs-conversation-header__content .cs-conversation-header__user-name { color: #fff !important; font-weight: 600 !important; }
        .cs-conversation-header__content .cs-conversation-header__info { color: ${escalated ? "#fbbf24" : "#6ee7b7"} !important; }
        .cs-message-separator { background: transparent !important; color: #fbbf24 !important; font-size: 13px !important; }
        .cs-message-separator::before, .cs-message-separator::after { background: rgba(251,191,36,0.25) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        * { box-sizing: border-box; }
      `}</style>

      <MainContainer style={{ height: "100vh" }}>
        <ChatContainer>
          <ConversationHeader>
            <Avatar
              src=""
              name={escalated ? "Менеджер" : "AI"}
              status="available"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: escalated
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {escalated ? "👤" : "🤖"}
              </div>
            </Avatar>
            <ConversationHeader.Content
              userName={escalated ? "Менеджер Aceverse" : "AI-асистент"}
              info={escalated ? "● Підключається..." : "● Онлайн"}
            />
          </ConversationHeader>

          <MessageList
            typingIndicator={
              typing ? <TypingIndicator content="друкує..." /> : undefined
            }
          >
            {messages.map((m, i) => (
              <Message key={i} model={m} />
            ))}

            {/* escalation banner removed — reply already contains the message */}
          </MessageList>

          <MessageInput
            placeholder="Напишіть повідомлення..."
            onSend={handleSend}
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
}

/* ── welcome screen styles ───────────────────────────────────────────── */

const welcomeStyle: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f0f1a",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
    padding: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 6, textAlign: "center" as const },
  subtitle: { fontSize: 13, color: "#a0a0b0", marginBottom: 20 },
  input: {
    width: "100%",
    maxWidth: 280,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
    outline: "none",
    fontFamily: "inherit",
  },
  btn: {
    padding: "12px 28px",
    borderRadius: 50,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};

/* ── page export ─────────────────────────────────────────────────────── */

export default function ChatWidgetPage() {
  return (
    <Suspense
      fallback={<div style={{ background: "#0f0f1a", height: "100vh" }} />}
    >
      <ChatWidget />
    </Suspense>
  );
}
