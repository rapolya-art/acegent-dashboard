import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = sb();
  const [open, resolved, escalated] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "escalated"),
  ]);

  return NextResponse.json({
    open: open.count ?? 0,
    resolved: resolved.count ?? 0,
    escalated: escalated.count ?? 0,
  });
}
