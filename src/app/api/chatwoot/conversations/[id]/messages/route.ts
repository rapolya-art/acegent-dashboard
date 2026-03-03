import { NextRequest, NextResponse } from "next/server";

const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL!;
const CHATWOOT_USER_TOKEN = process.env.CHATWOOT_USER_TOKEN!;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${CHATWOOT_API_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${id}/messages`,
    { headers: { api_access_token: CHATWOOT_USER_TOKEN }, cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const res = await fetch(
    `${CHATWOOT_API_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${id}/messages`,
    {
      method: "POST",
      headers: {
        api_access_token: CHATWOOT_USER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: body.content, message_type: "outgoing", private: false }),
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}
