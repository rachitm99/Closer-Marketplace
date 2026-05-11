import { createHmac } from "node:crypto";

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

type ExchangeTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
  };
};

type ResolveTokenOptions = {
  graphVersion: string;
  appId?: string;
  appSecret?: string;
  igUserId: string;
  userAccessToken?: string;
  explicitPageToken?: string;
  explicitPageId?: string;
};

type RefreshTokenOptions = {
  graphVersion: string;
  appId: string;
  appSecret: string;
  userAccessToken: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function withAppSecretProof(url: URL, token: string, appSecret?: string): URL {
  if (!appSecret) {
    return url;
  }

  const appSecretProof = createHmac("sha256", appSecret).update(token).digest("hex");
  url.searchParams.set("appsecret_proof", appSecretProof);
  return url;
}

export async function refreshLongLivedUserToken(
  options: RefreshTokenOptions,
): Promise<{ accessToken: string; expiresIn: number }> {
  const { graphVersion, appId, appSecret, userAccessToken } = options;

  const exchangeUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
  exchangeUrl.searchParams.set("client_id", appId);
  exchangeUrl.searchParams.set("client_secret", appSecret);
  exchangeUrl.searchParams.set("fb_exchange_token", userAccessToken);

  const response = await fetch(exchangeUrl.toString(), {
    method: "GET",
    next: { revalidate: 0 },
  });

  const payload = (await response.json()) as ExchangeTokenResponse;

  if (!response.ok || payload.error || !payload.access_token) {
    const code = payload.error?.code ? ` code ${payload.error.code}` : "";
    const subcode = payload.error?.error_subcode
      ? ` subcode ${payload.error.error_subcode}`
      : "";

    throw new Error(
      payload.error?.message
        ? `${payload.error.message}${code}${subcode}`
        : "Failed to exchange user token for a long-lived token. Re-authenticate and try again.",
    );
  }

  // Some Meta responses omit expires_in. Treat as a standard long-lived token lifetime.
  const expiresIn = payload.expires_in ?? 60 * 24 * 60 * 60;

  return {
    accessToken: payload.access_token,
    expiresIn,
  };
}

async function fetchPageTokenFromUserToken(options: {
  graphVersion: string;
  appSecret?: string;
  igUserId: string;
  userAccessToken: string;
  explicitPageId?: string;
}): Promise<string> {
  const { graphVersion, appSecret, igUserId, userAccessToken, explicitPageId } = options;

  const meAccountsUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  meAccountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id}");
  meAccountsUrl.searchParams.set("limit", "100");
  meAccountsUrl.searchParams.set("access_token", userAccessToken);

  withAppSecretProof(meAccountsUrl, userAccessToken, appSecret);

  const response = await fetch(meAccountsUrl.toString(), {
    method: "GET",
    next: { revalidate: 0 },
  });

  const payload = (await response.json()) as MeAccountsResponse;

  if (!response.ok || payload.error) {
    if (payload.error?.code === 190 && payload.error?.error_subcode === 463) {
      throw new Error(
        "Your logged-in user token has expired (code 190, subcode 463). Please login with Facebook again.",
      );
    }

    throw new Error(
      payload.error?.message ??
        "Failed to fetch pages from /me/accounts to derive page access token.",
    );
  }

  const pages = payload.data ?? [];
  const selectedPage = pages.find((page) => {
    if (explicitPageId) {
      return page.id === explicitPageId;
    }

    return page.instagram_business_account?.id === igUserId;
  });

  if (!selectedPage?.access_token) {
    const pageSummaries = pages
      .map((page) => {
        const pageId = page.id ?? "(no-page-id)";
        const igId = page.instagram_business_account?.id ?? "(no-ig-linked)";
        return `${pageId}=>${igId}`;
      })
      .slice(0, 10)
      .join(", ");

    const reason = explicitPageId
      ? `META_PAGE_ID is set to ${explicitPageId}, but that page was not returned from /me/accounts for this logged-in user.`
      : `No page in /me/accounts is linked to META_IG_USER_ID=${igUserId}.`;

    throw new Error(
      `Could not derive a Page token from /me/accounts. ${reason} Returned page=>ig mappings: ${pageSummaries || "(none)"}.`,
    );
  }

  return selectedPage.access_token;
}

export async function resolveCreatorMarketplacePageToken(
  options: ResolveTokenOptions,
): Promise<string> {
  const {
    graphVersion,
    appSecret,
    igUserId,
    userAccessToken,
    explicitPageToken,
    explicitPageId,
  } = options;

  if (explicitPageToken) {
    return explicitPageToken;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!userAccessToken) {
    throw new Error(
      "No authenticated user token found. Sign in with Facebook before using Creator Marketplace.",
    );
  }

  const derivedPageToken = await fetchPageTokenFromUserToken({
    graphVersion,
    appSecret,
    igUserId,
    userAccessToken,
    explicitPageId,
  });

  cachedToken = {
    token: derivedPageToken,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  return derivedPageToken;
}

/**
 * Generate a page token from a user token
 * Used during OAuth login to immediately create a page token
 * Returns both the token and its expiration time for storage
 */
export async function generatePageTokenFromUserToken(options: {
  graphVersion: string;
  appSecret?: string;
  igUserId: string;
  userAccessToken: string;
  explicitPageId?: string;
}): Promise<{ pageToken: string; expiresIn: number }> {
  const pageToken = await fetchPageTokenFromUserToken(options);
  
  // Page tokens typically last 60 days
  const expiresIn = 60 * 24 * 60 * 60;
  
  return {
    pageToken,
    expiresIn,
  };
}
