import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/integrations/calendar?org_id=...
export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("calendar_integrations")
    .select("*, agents(id, name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/integrations/calendar — add Calendly integration
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organization_id, agent_id, api_key } = body;

  if (!organization_id || !api_key) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate Calendly API key
  const res = await fetch("https://api.calendly.com/users/me", {
    headers: { Authorization: `Bearer ${api_key}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Невірний API-ключ Calendly" }, { status: 400 });
  }

  const userData = await res.json();
  const userUri = userData.resource?.uri;
  const email = userData.resource?.email;

  // Fetch event types
  let eventTypeUri: string | null = null;
  const etRes = await fetch(
    `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
    { headers: { Authorization: `Bearer ${api_key}` } }
  );
  if (etRes.ok) {
    const etData = await etRes.json();
    if (etData.collection?.length > 0) {
      eventTypeUri = etData.collection[0].uri;
    }
  }

  const supabase = getServiceClient();
  const { error: insertErr } = await supabase
    .from("calendar_integrations")
    .insert({
      organization_id,
      agent_id: agent_id || null,
      provider: "calendly",
      status: "active",
      api_key,
      calendly_user_uri: userUri,
      calendly_event_type_uri: eventTypeUri,
      connected_email: email,
    });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/integrations/calendar?id=...
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("calendar_integrations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
