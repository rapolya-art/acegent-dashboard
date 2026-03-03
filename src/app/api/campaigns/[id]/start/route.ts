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

// POST /api/campaigns/:id/start — start the campaign
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
  const supabase = getServiceClient();

  // Verify campaign exists and is in startable state
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  if (!["draft", "paused"].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Campaign is ${campaign.status}, cannot start` },
      { status: 400 }
    );
  }

  // Check contacts exist
  const { count } = await supabase
    .from("campaign_contacts")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "queued"]);

  if ((count || 0) === 0) {
    return NextResponse.json(
      { error: "No pending contacts in campaign" },
      { status: 400 }
    );
  }

  // Update campaign status to running
  await supabase
    .from("campaigns")
    .update({
      status: "running",
      started_at: campaign.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  // Enqueue first campaign tick
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const campaignQueue = new Queue("campaign", { connection });

  await campaignQueue.add("campaign-tick", { campaignId });

  await campaignQueue.close();
  await connection.quit();

  return NextResponse.json({ status: "started", campaignId });
}
