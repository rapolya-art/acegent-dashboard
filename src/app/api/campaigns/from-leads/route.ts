import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/campaigns/from-leads — create campaign from selected leads
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    organization_id,
    agent_id,
    workflow_id,
    name,
    lead_ids,
    max_concurrent_calls,
    calls_per_minute,
    max_retries,
    retry_delay_minutes,
  } = body;

  if (!organization_id || !agent_id || !name || !lead_ids?.length) {
    return NextResponse.json(
      { error: "organization_id, agent_id, name, and lead_ids required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Create campaign
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .insert({
      organization_id,
      agent_id,
      workflow_id: workflow_id || null,
      name,
      max_concurrent_calls: max_concurrent_calls || 1,
      calls_per_minute: calls_per_minute || 2,
      max_retries: max_retries || 2,
      retry_delay_minutes: retry_delay_minutes || 30,
    })
    .select()
    .single();

  if (campError || !campaign) {
    return NextResponse.json(
      { error: campError?.message || "Failed to create campaign" },
      { status: 500 }
    );
  }

  // Create campaign_contacts from leads using RPC
  const { data: insertedCount, error: rpcError } = await supabase.rpc(
    "create_campaign_contacts_from_leads",
    {
      p_campaign_id: campaign.id,
      p_lead_ids: lead_ids,
    }
  );

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: 500 }
    );
  }

  // Refetch campaign with updated total_contacts
  const { data: updatedCampaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaign.id)
    .single();

  return NextResponse.json({
    campaign: updatedCampaign || campaign,
    contacts_created: insertedCount,
  });
}
