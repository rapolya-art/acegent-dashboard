import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getHttpUrl(wsUrl: string): string {
  return wsUrl.replace("wss://", "https://").replace("ws://", "http://");
}

// Public endpoint — no auth required (widget visitors)
export async function POST(req: NextRequest) {
  try {
    const { agent_id } = await req.json();
    if (!agent_id) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400 });
    }

    // Verify agent exists and is active
    const { data: agent, error } = await sb()
      .from("agents")
      .select("id, name, status")
      .eq("id", agent_id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.status !== "active") {
      return NextResponse.json({ error: "Agent is not active" }, { status: 403 });
    }

    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
    const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
    const httpUrl = getHttpUrl(LIVEKIT_WS_URL);

    const roomName = `widget-voice-${agent_id.slice(0, 8)}-${Date.now()}`;
    const identity = `visitor-${Date.now()}`;

    // Create room with metadata (voice agent auto-joins)
    const roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify({ agent_id, mode: "voice", source: "widget" }),
      emptyTimeout: 300,
      departureTimeout: 30,
    });

    // Generate visitor token
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: "Відвідувач сайту",
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      serverUrl: LIVEKIT_WS_URL,
      roomName,
    });
  } catch (err) {
    console.error("[Widget Voice Token]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
