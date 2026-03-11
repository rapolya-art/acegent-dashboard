import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Queue } from "bullmq";
import IORedis from "ioredis";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/leads/call — ad-hoc call to a lead
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lead_id, agent_id, organization_id } = body;

  if (!lead_id || !agent_id || !organization_id) {
    return NextResponse.json(
      { error: "lead_id, agent_id, and organization_id required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Create a one-off campaign
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .insert({
      organization_id,
      agent_id,
      name: `Дзвінок: ${lead.name || lead.phone}`,
      status: "running",
      max_concurrent_calls: 1,
      calls_per_minute: 1,
      total_contacts: 1,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (campError || !campaign) {
    return NextResponse.json(
      { error: campError?.message || "Failed to create campaign" },
      { status: 500 }
    );
  }

  // Create campaign contact linked to lead
  const { data: contact, error: contactError } = await supabase
    .from("campaign_contacts")
    .insert({
      campaign_id: campaign.id,
      phone_number: lead.phone,
      name: lead.name,
      lead_id: lead.id,
      variables: {
        email: lead.email,
        company: lead.company,
        position: lead.position,
        custom_fields: lead.custom_fields,
      },
    })
    .select()
    .single();

  if (contactError || !contact) {
    return NextResponse.json(
      { error: contactError?.message || "Failed to create contact" },
      { status: 500 }
    );
  }

  // Update lead status to contacted
  await supabase
    .from("leads")
    .update({ status: "contacted", updated_at: new Date().toISOString() })
    .eq("id", lead_id);

  // Enqueue campaign-tick job (reuses existing worker flow)
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const campaignQueue = new Queue("campaign", { connection });
  await campaignQueue.add("campaign-tick", { campaignId: campaign.id });
  await campaignQueue.close();
  await connection.quit();

  return NextResponse.json({
    campaign_id: campaign.id,
    contact_id: contact.id,
  });
}
