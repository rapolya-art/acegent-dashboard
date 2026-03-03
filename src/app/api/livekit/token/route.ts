import { NextRequest, NextResponse } from "next/server";
import {
  RoomServiceClient,
  AccessToken,
  AgentDispatchClient,
} from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

/** Convert ws:// to http:// for server SDK */
function getHttpUrl(wsUrl: string): string {
  return wsUrl.replace("wss://", "https://").replace("ws://", "http://");
}

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const httpUrl = getHttpUrl(LIVEKIT_WS_URL);
    const roomName = `text-test-${agentId.slice(0, 8)}-${Date.now()}`;
    const identity = `dashboard-${Date.now()}`;

    // 1. Create room with metadata
    const roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify({ agent_id: agentId, mode: "text" }),
      emptyTimeout: 300,
      departureTimeout: 30,
    });

    // 2. Dispatch text-agent to this room
    const dispatch = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await dispatch.createDispatch(roomName, "text-agent", {
      metadata: JSON.stringify({ agent_id: agentId }),
    });

    // 3. Generate participant token
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: "Dashboard User",
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
    console.error("[LiveKit Token API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
