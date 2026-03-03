"use client";

import { useRef, useEffect, useState } from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";
import { RotateCcw, Send, Bot, User, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LiveKitTextChatProps {
  agentId: string;
  firstMessage?: string;
  hasWorkflow?: boolean;
}

export default function LiveKitTextChat({
  agentId,
  hasWorkflow,
}: LiveKitTextChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [agentTyping, setAgentTyping] = useState(false);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentTyping]);

  // --- Connection logic ---

  async function connect() {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setConnectionState("connecting");

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`Token API: ${res.status}`);
      const { token, serverUrl } = await res.json();

      const room = new Room();

      // Handler for agent text (deduplicate by message ID)
      const seenIds = new Set<string>();
      function handleAgentText(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const msgId = `agent-${trimmed.slice(0, 30)}-${trimmed.length}`;
        if (seenIds.has(msgId)) return;
        seenIds.add(msgId);
        setMessages((prev) => [
          ...prev,
          { id: `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: "assistant", content: trimmed },
        ]);
        setAgentTyping(false);
      }

      // Listen for text streams on both possible topics
      room.registerTextStreamHandler("lk.chat", async (reader, info) => {
        if (info.identity.startsWith("dashboard")) return;
        setAgentTyping(true);
        handleAgentText(await reader.readAll());
      });

      room.registerTextStreamHandler("lk.transcription", async (reader, info) => {
        if (info.identity.startsWith("dashboard")) return;
        setAgentTyping(true);
        handleAgentText(await reader.readAll());
      });

      // Fallback: transcription events (for non-stream transcriptions)
      room.on(
        RoomEvent.TranscriptionReceived,
        (segments, participant) => {
          if (participant?.identity?.startsWith("dashboard")) return;
          const finalText = segments
            .filter((s) => s.final)
            .map((s) => s.text)
            .join("");
          if (finalText.trim()) {
            setAgentTyping(true);
            handleAgentText(finalText);
          }
        },
      );

      // Track connection state
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setConnectionState("connected");
        if (state === ConnectionState.Disconnected) {
          setConnectionState("disconnected");
          connectingRef.current = false;
        }
      });

      await room.connect(serverUrl, token);
      roomRef.current = room;
      setConnectionState("connected");
    } catch (err) {
      console.error("[LiveKitChat] Connection error:", err);
      setConnectionState("disconnected");
    } finally {
      connectingRef.current = false;
    }
  }

  function disconnect() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnectionState("disconnected");
  }

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  // --- Actions ---

  function handleReset() {
    disconnect();
    setMessages([]);
    setInput("");
    setAgentTyping(false);
    setTimeout(() => connect(), 100);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || connectionState !== "connected" || !roomRef.current) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);

    try {
      await roomRef.current.localParticipant.sendText(text, { topic: "lk.chat" });
      setAgentTyping(true);
    } catch (err) {
      console.error("[LiveKitChat] Send error:", err);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --- Render ---

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";

  return (
    <div className="glass flex h-[600px] flex-col rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-white">Тестовий чат</span>
          {hasWorkflow ? (
            <Badge variant="secondary" className="bg-brand/20 text-brand text-[10px]">
              workflow
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-[10px]">
              mock tools
            </Badge>
          )}
          {isConnected ? (
            <Badge variant="secondary" className="bg-success/20 text-success text-[10px] gap-1">
              <Wifi className="h-2.5 w-2.5" />
              LiveKit
            </Badge>
          ) : isConnecting ? (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-[10px] gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              З&apos;єднання...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-500/20 text-red-400 text-[10px] gap-1">
              <WifiOff className="h-2.5 w-2.5" />
              Відключено
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Скинути
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Empty states */}
        {!isConnected && !isConnecting && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <WifiOff className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Не вдалось підключитись до LiveKit
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => connect()}>
                Спробувати знову
              </Button>
            </div>
          </div>
        )}

        {isConnecting && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Підключення до агента...
              </p>
            </div>
          </div>
        )}

        {isConnected && messages.length === 0 && !agentTyping && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Напишіть повідомлення щоб почати тестування агента
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" && (
              <div className="flex justify-end gap-2">
                <div className="max-w-[80%] rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">
                    <User className="mr-1 inline h-3 w-3" />
                    Клієнт
                  </span>
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}
            {msg.role === "assistant" && (
              <div className="flex gap-2">
                <div className="max-w-[80%] rounded-lg border border-brand/20 bg-brand/10 px-3 py-2">
                  <span className="mb-1 block text-[10px] font-semibold text-brand/60">
                    <Bot className="mr-1 inline h-3 w-3" />
                    Агент
                  </span>
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {agentTyping && (
          <div className="flex gap-2">
            <div className="rounded-lg border border-brand/20 bg-brand/10 px-3 py-2">
              <span className="text-xs text-brand/60 animate-pulse">Агент друкує...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isConnected ? "Напишіть повідомлення..." : "Очікування з'єднання..."}
            disabled={!isConnected}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            size="sm"
            className="h-auto bg-brand px-3 hover:bg-brand/80 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Enter — надіслати, Shift+Enter — новий рядок
        </p>
      </div>
    </div>
  );
}
