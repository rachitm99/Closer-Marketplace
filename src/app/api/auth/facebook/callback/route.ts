import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthStateCookie, setAuthSession } from "@/lib/auth-session";
import { refreshLongLivedUserToken, generatePageTokenFromUserToken } from "@/lib/meta-page-token";

type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

type ProfileResponse = {
  id?: string;
  name?: string;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const incomingState = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorReason = request.nextUrl.searchParams.get("error_reason");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";
  const igUserId = process.env.META_IG_USER_ID;
  const explicitPageId = process.env.META_PAGE_ID;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "META_APP_ID and META_APP_SECRET must be configured." },
      { status: 500 },
    );
  }

  if (error) {
    return NextResponse.json(
      {
        error: "Meta OAuth error",
        reason: errorReason,
        description: errorDescription,
      },
      { status: 400 },
    );
  }

  if (!code || !incomingState) {
    return NextResponse.json({ error: "Missing OAuth callback parameters." }, { status: 400 });
  }

  const expectedState = await consumeOAuthStateCookie();

  if (!expectedState || expectedState !== incomingState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const callbackUrl = new URL("/api/auth/facebook/callback", request.nextUrl.origin);
  const shortTokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  shortTokenUrl.searchParams.set("client_id", appId);
  shortTokenUrl.searchParams.set("client_secret", appSecret);
  shortTokenUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  shortTokenUrl.searchParams.set("code", code);

  const shortResponse = await fetch(shortTokenUrl.toString(), {
    method: "GET",
    next: { revalidate: 0 },
  });
  const shortPayload = (await shortResponse.json()) as OAuthTokenResponse;

  if (!shortResponse.ok || !shortPayload.access_token) {
    return NextResponse.json(
      { error: shortPayload.error?.message ?? "Failed to exchange OAuth code." },
      { status: 400 },
    );
  }

  let longLived: { accessToken: string; expiresIn: number };

  try {
    longLived = await refreshLongLivedUserToken({
      graphVersion,
      appId,
      appSecret,
      userAccessToken: shortPayload.access_token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete Facebook login.";
    return NextResponse.json(
      {
        error: message,
        hint:
          "Verify your Facebook Login redirect URI in Meta App settings and ensure the app is in Live mode or your user is a tester/developer.",
      },
      { status: 400 },
    );
  }

  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/me`);
  profileUrl.searchParams.set("fields", "id,name");
  profileUrl.searchParams.set("access_token", longLived.accessToken);

  const profileResponse = await fetch(profileUrl.toString(), {
    method: "GET",
    next: { revalidate: 0 },
  });

  const profile = (await profileResponse.json()) as ProfileResponse;

  // Auto-generate page token for Creator Marketplace API
  let pageToken: string | undefined;
  let pageTokenExpiresAt: number | undefined;

  if (igUserId && appSecret) {
    try {
      const pageTokenResult = await generatePageTokenFromUserToken({
        graphVersion,
        appSecret,
        igUserId,
        userAccessToken: longLived.accessToken,
        explicitPageId,
      });
      pageToken = pageTokenResult.pageToken;
      pageTokenExpiresAt = Date.now() + pageTokenResult.expiresIn * 1000;
    } catch (pageTokenError) {
      // Log but don't fail login - page token generation might fail for various reasons
      console.error(
        "Failed to auto-generate page token during login:",
        pageTokenError instanceof Error ? pageTokenError.message : pageTokenError,
      );
    }
  }

  await setAuthSession({
    accessToken: longLived.accessToken,
    expiresAt: Date.now() + longLived.expiresIn * 1000,
    userId: profile.id,
    userName: profile.name,
    pageToken,
    pageTokenExpiresAt,
  });

  return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
}
