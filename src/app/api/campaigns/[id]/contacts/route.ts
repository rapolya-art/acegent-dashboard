import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/campaigns/:id/contacts — bulk import contacts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const body = await request.json();
  const { contacts } = body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json(
      { error: "contacts array required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const rows = contacts.map(
    (c: { phone_number: string; name?: string; variables?: Record<string, unknown> }) => ({
      campaign_id: campaignId,
      phone_number: c.phone_number,
      name: c.name || null,
      variables: c.variables || {},
    })
  );

  const { data, error } = await supabase
    .from("campaign_contacts")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update campaign total_contacts
  const { count } = await supabase
    .from("campaign_contacts")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await supabase
    .from("campaigns")
    .update({
      total_contacts: count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return NextResponse.json({
    contacts: data,
    total: count,
  });
}
