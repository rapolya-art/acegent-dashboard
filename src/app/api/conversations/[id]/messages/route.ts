import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const TEXT_SERVICE_URL = process.env.TEXT_SERVICE_URL ?? "http://45.94.158.27:8088";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await sb()
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await req.json();

  const res = await fetch(`${TEXT_SERVICE_URL}/messages/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.ok ? 200 : res.status });
}
