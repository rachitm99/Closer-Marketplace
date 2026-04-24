import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { setOAuthStateCookie } from "@/lib/auth-session";

const SCOPES = [
  "pages_show_list",
  "business_management",
  "instagram_basic",
  "pages_manage_metadata",
  "instagram_creator_marketplace_discovery",
  "public_profile",
];

export async function GET(request: NextRequest) {
  const appId = process.env.META_APP_ID;
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v23.0";

  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID is not configured." }, { status: 500 });
  }

  const state = randomBytes(24).toString("hex");
  await setOAuthStateCookie(state);

  const callbackUrl = new URL("/api/auth/facebook/callback", request.nextUrl.origin);
  const authUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(","));

  return NextResponse.redirect(authUrl.toString());
}
