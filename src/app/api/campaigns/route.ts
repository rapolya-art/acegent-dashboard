import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/campaigns?org_id=...
export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json(
      { error: "org_id required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, agents(name), workflows(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data });
}

// POST /api/campaigns — create campaign
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organization_id, agent_id, workflow_id, name, max_concurrent_calls, calls_per_minute, max_retries, retry_delay_minutes } = body;

  if (!organization_id || !name) {
    return NextResponse.json(
      { error: "organization_id and name required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id,
      agent_id: agent_id || null,
      workflow_id: workflow_id || null,
      name,
      max_concurrent_calls: max_concurrent_calls || 1,
      calls_per_minute: calls_per_minute || 2,
      max_retries: max_retries || 2,
      retry_delay_minutes: retry_delay_minutes || 30,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign: data });
}
