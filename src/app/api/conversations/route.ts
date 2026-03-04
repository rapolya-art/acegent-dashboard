import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_STATUSES = ["open", "resolved", "escalated"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const safeStatus = VALID_STATUSES.includes(status) ? status : "open";

  const { data, error } = await sb()
    .from("conversations")
    .select(
      "id, channel, status, last_message_at, created_at, contacts(id, name, username, telegram_id, avatar_url)"
    )
    .eq("status", safeStatus)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
