import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/leads?org_id=...&status=...&search=...&page=...&limit=...
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orgId = params.get("org_id");
  if (!orgId) {
    return NextResponse.json({ error: "org_id required" }, { status: 400 });
  }

  const status = params.get("status");
  const search = params.get("search");
  const page = parseInt(params.get("page") || "1");
  const limit = parseInt(params.get("limit") || "50");
  const offset = (page - 1) * limit;

  const supabase = getServiceClient();
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `phone.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data, total: count || 0 });
}

// POST /api/leads — create single lead
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organization_id, phone, name, email, company, position, tags, notes, custom_fields, source } = body;

  if (!organization_id || !phone) {
    return NextResponse.json(
      { error: "organization_id and phone required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id,
      phone,
      name: name || null,
      email: email || null,
      company: company || null,
      position: position || null,
      tags: tags || [],
      notes: notes || null,
      custom_fields: custom_fields || {},
      source: source || "manual",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Lead with this phone already exists in this organization" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
