import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/leads/import — bulk import leads
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organization_id, leads } = body;

  if (!organization_id || !leads || !Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json(
      { error: "organization_id and leads array required" },
      { status: 400 }
    );
  }

  // Validate all leads have phone
  const invalid = leads.filter((l: Record<string, unknown>) => !l.phone);
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `${invalid.length} leads missing phone number` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("bulk_insert_leads", {
    p_org_id: organization_id,
    p_leads: leads,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = data as number;
  const skipped = leads.length - inserted;

  return NextResponse.json({ inserted, skipped, total: leads.length });
}
