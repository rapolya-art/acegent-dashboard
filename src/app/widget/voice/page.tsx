"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type State = "idle" | "connecting" | "active" | "error";

function VoiceWidget() {
  const params = useSearchParams();
  const agentId = params.get("agent_id") ?? "";
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const startCall = useCallback(async () => {
    if (!agentId) { setErrorMsg("agent_id is required"); setState("error"); return; }
    setState("connecting");
    try {
      const res = await fetch("/api/widget/voice-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed to connect");
      }
      const { token, serverUrl, roomName } = await res.json();

      // Dynamically import LiveKit to avoid SSR issues
      const { Room, RoomEvent, Track } = await import("livekit-client");

      const room = new Room();

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.Disconnected, () => setState("idle"));

      await room.connect(serverUrl, token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);

      setState("active");

      // Cleanup on unmount via window event
      window.__lk_room = room;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error");
      setState("error");
    }
  }, [agentId]);

  async function endCall() {
    if (window.__lk_room) {
      await window.__lk_room.disconnect();
      window.__lk_room = undefined;
    }
    setState("idle");
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
      fontFamily: "system-ui, sans-serif",
      color: "#fff",
      padding: "24px",
    }}>
      {/* Logo / Branding */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", fontSize: 28,
        }}>🎙️</div>
        <p style={{ color: "#a0a0b0", fontSize: 14 }}>Голосовий асистент</p>
      </div>

      {/* Pulse animation when active */}
      {state === "active" && (
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24,
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(99,102,241,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32,
          }}>🎤</div>
        </div>
      )}

      {/* Status text */}
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {state === "idle" && "Натисніть, щоб зателефонувати"}
        {state === "connecting" && "Підключення..."}
        {state === "active" && "Розмова активна"}
        {state === "error" && "Помилка підключення"}
      </p>

      {state === "error" && (
        <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>
      )}

      {/* Buttons */}
      {(state === "idle" || state === "error") && (
        <button
          onClick={startCall}
          style={{
            padding: "14px 32px", borderRadius: 50, border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", fontSize: 16, fontWeight: 600,
            cursor: "pointer", transition: "opacity 0.2s",
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseOut={e => (e.currentTarget.style.opacity = "1")}
        >
          📞 Подзвонити
        </button>
      )}

      {state === "connecting" && (
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.3)",
          borderTop: "3px solid #6366f1",
          animation: "spin 1s linear infinite",
        }} />
      )}

      {state === "active" && (
        <button
          onClick={endCall}
          style={{
            padding: "14px 32px", borderRadius: 50, border: "none",
            background: "#ef4444", color: "#fff",
            fontSize: 16, fontWeight: 600, cursor: "pointer",
          }}
        >
          📵 Завершити
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

// TypeScript declaration for livekit room on window
declare global {
  interface Window { __lk_room?: import("livekit-client").Room; }
}

export default function VoiceWidgetPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0f0f1a", minHeight: "100vh" }} />}>
      <VoiceWidget />
    </Suspense>
  );
}
