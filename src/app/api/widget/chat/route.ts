import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TEXT_SERVICE_URL = process.env.TEXT_SERVICE_URL ?? "http://45.94.158.27:8088";

// Public endpoint — widget visitors, no auth
export async function POST(req: NextRequest) {
  try {
    const { org_id, session_id, message, name } = await req.json();

    if (!org_id || !session_id || !message?.trim()) {
      return NextResponse.json({ error: "org_id, session_id, message required" }, { status: 400 });
    }

    const supabase = sb();

    // Upsert contact (identified by session_id as telegram_id = null, username = session_id)
    const { data: contact } = await supabase
      .from("contacts")
      .upsert(
        {
          telegram_id: null,
          name: name || "Відвідувач сайту",
          username: `widget_${session_id.slice(0, 16)}`,
        },
        { onConflict: "username" }
      )
      .select("id")
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Get or create open conversation
    let convId: number;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", contact.id)
      .eq("status", "open")
      .limit(1)
      .single();

    if (existing) {
      convId = existing.id;
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ contact_id: contact.id, channel: "widget" })
        .select("id")
        .single();
      if (!newConv) return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      convId = newConv.id;
    }

    // Save incoming message
    await supabase.from("messages").insert({
      conversation_id: convId,
      content: message.trim(),
      message_type: "incoming",
      private: false,
      sender_type: "contact",
    });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);

    // Call text-service to auto-reply via LangGraph
    const aiRes = await fetch(`${TEXT_SERVICE_URL}/messages/${convId}/send-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message.trim() }),
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      conv_id: convId,
      ai_ok: aiRes?.ok ?? false,
    });
  } catch (err) {
    console.error("[Widget Chat API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
