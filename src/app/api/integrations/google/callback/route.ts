import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI!;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL("/dashboard/settings", request.url);
  baseUrl.search = "";

  if (error || !code) {
    baseUrl.searchParams.set("tab", "integrations");
    baseUrl.searchParams.set("google", "error");
    baseUrl.searchParams.set(
      "error_message",
      error || "No authorization code received"
    );
    return NextResponse.redirect(baseUrl.toString());
  }

  // Decode state
  let orgId = "";
  let agentId: string | null = null;
  if (stateParam) {
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      );
      orgId = decoded.orgId || "";
      agentId = decoded.agentId || null;
    } catch {
      // ignore
    }
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error("[Google OAuth] Token exchange failed:", errData);
      baseUrl.searchParams.set("tab", "integrations");
      baseUrl.searchParams.set("google", "error");
      baseUrl.searchParams.set("error_message", "Token exchange failed");
      return NextResponse.redirect(baseUrl.toString());
    }

    const tokens = await tokenRes.json();
    const accessToken: string = tokens.access_token;
    const refreshToken: string | undefined = tokens.refresh_token;
    const expiresIn: number = tokens.expires_in; // seconds

    // Get user email
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    let email = "";
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      email = userInfo.email || "";
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save to Supabase (service role to bypass RLS)
    const supabase = getServiceClient();
    const { error: insertError } = await supabase
      .from("calendar_integrations")
      .insert({
        organization_id: orgId || null,
        agent_id: agentId || null,
        provider: "google",
        status: "active",
        google_access_token: accessToken,
        google_refresh_token: refreshToken || null,
        google_token_expires_at: expiresAt,
        google_calendar_id: "primary",
        connected_email: email,
      });

    if (insertError) {
      console.error("[Google OAuth] Supabase insert failed:", insertError);
      baseUrl.searchParams.set("tab", "integrations");
      baseUrl.searchParams.set("google", "error");
      baseUrl.searchParams.set("error_message", "Failed to save integration");
      return NextResponse.redirect(baseUrl.toString());
    }

    baseUrl.searchParams.set("tab", "integrations");
    baseUrl.searchParams.set("google", "success");
    return NextResponse.redirect(baseUrl.toString());
  } catch (err) {
    console.error("[Google OAuth] Unexpected error:", err);
    baseUrl.searchParams.set("tab", "integrations");
    baseUrl.searchParams.set("google", "error");
    baseUrl.searchParams.set("error_message", "Unexpected error");
    return NextResponse.redirect(baseUrl.toString());
  }
}
