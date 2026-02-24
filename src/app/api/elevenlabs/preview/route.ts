import { NextRequest, NextResponse } from "next/server";

const PREVIEW_TEXT = "Доброго дня! Чим можу вам допомогти? Я — голосовий асистент.";
const MODEL_ID = "eleven_turbo_v2_5";

// Simple in-memory cache for generated previews (cleared on server restart)
const cache = new Map<string, { buffer: ArrayBuffer; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET(request: NextRequest) {
  const voiceId = request.nextUrl.searchParams.get("voice_id");
  if (!voiceId) {
    return NextResponse.json({ error: "voice_id required" }, { status: 400 });
  }

  const apiKey = process.env.ELEVEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVEN_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Check cache
  const cached = cache.get(voiceId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(cached.buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Generate preview via ElevenLabs TTS
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: PREVIEW_TEXT,
        model_id: MODEL_ID,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[ElevenLabs preview] Error:", res.status, err);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: res.status }
    );
  }

  const arrayBuffer = await res.arrayBuffer();

  // Cache the result
  cache.set(voiceId, { buffer: arrayBuffer, ts: Date.now() });

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
