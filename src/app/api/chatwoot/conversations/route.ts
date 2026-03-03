import { NextRequest, NextResponse } from "next/server";

const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL!;
const CHATWOOT_USER_TOKEN = process.env.CHATWOOT_USER_TOKEN!;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inboxId = searchParams.get("inbox_id");
  const status = searchParams.get("status") || "open";
  const page = searchParams.get("page") || "1";

  const params = new URLSearchParams({ status, page });
  if (inboxId) params.set("inbox_id", inboxId);

  const res = await fetch(
    `${CHATWOOT_API_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?${params}`,
    { headers: { api_access_token: CHATWOOT_USER_TOKEN }, cache: "no-store" }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
