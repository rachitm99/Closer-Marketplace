import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, setAuthSession } from "@/lib/auth-session";

type MeAccountsResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: {
      id?: string;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
  };
};

/**
 * GET /api/setup/page-token
 * 
 * Checks if a valid page token exists, and if not, guides the user through setup.
 * Returns the page token or setup instructions.
 * 
 * This endpoint is called on app startup to auto-generate the page token.
 */
export async function GET(request: NextRequest) {
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const igUserId = process.env.META_IG_USER_ID;
  const explicitPageToken = process.env.META_PAGE_ACCESS_TOKEN;

  // If we already have an explicit page token, we're good
  if (explicitPageToken) {
    return NextResponse.json({ status: "ready", hasPageToken: true });
  }

  // Try to get a user session
  let userAccessToken: string | undefined;

  try {
    const session = await getAuthSession();
    userAccessToken = session?.accessToken;
  } catch {
    // No session yet, that's okay
  }

  // If no user token and no page token, return setup instructions
  if (!userAccessToken) {
    return NextResponse.json(
      {
        status: "needs_auth",
        message: "Page token not configured. Please authenticate first.",
        action: "redirect_to_login",
        loginUrl: "/api/auth/facebook/login",
      },
      { status: 401 }
    );
  }

  // We have a user token, try to generate a page token
  try {
    const accountsUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
    accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id}");
    accountsUrl.searchParams.set("limit", "100");
    accountsUrl.searchParams.set("access_token", userAccessToken);

    const response = await fetch(accountsUrl.toString(), {
      method: "GET",
      next: { revalidate: 0 },
    });

    const payload = (await response.json()) as MeAccountsResponse;

    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || "Failed to fetch pages");
    }

    const pages = payload.data ?? [];
    const targetPage = pages.find(
      (page) => page.instagram_business_account?.id === igUserId
    );

    if (!targetPage?.access_token) {
      return NextResponse.json(
        {
          status: "error",
          message: `No page found linked to IG User ID: ${igUserId}`,
          availablePages: pages.map((p) => ({
            name: p.name,
            pageId: p.id,
            igId: p.instagram_business_account?.id,
          })),
        },
        { status: 400 }
      );
    }

    // We got a page token! This would typically be persisted by the app infrastructure
    // For now, we return it for the client to use
    return NextResponse.json({
      status: "success",
      message: "Page token generated successfully",
      pageToken: targetPage.access_token,
      pageName: targetPage.name,
      note: "Store this token in META_PAGE_ACCESS_TOKEN environment variable for production use",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to generate page token",
      },
      { status: 500 }
    );
  }
}
