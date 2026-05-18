import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, setAuthSession } from "@/lib/auth-session";
import { refreshLongLivedUserToken, resolveCreatorMarketplacePageToken, generatePageTokenFromUserToken } from "@/lib/meta-page-token";

type MetaApiError = {
  message?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type CreatorMarketplaceResponse = {
  data?: Array<Record<string, unknown>>;
  paging?: Record<string, unknown>;
  error?: MetaApiError;
};

type TableRow = {
  field: string;
  value: string | number;
};

type AnalyticsSnapshot = {
  interactionRatePct: string;
  malePct: string;
  femalePct: string;
  age18To24Pct: string;
  age25To34Pct: string;
  age35To44Pct: string;
  topCities: string[];
};

type CreatorListItem = {
  id: string;
  username: string;
  country: string;
  gender: string;
  isMock: boolean;
  insights: Record<string, string | number>;
};

type RawApiResponseCapture = {
  type:
    | "discovery"
    | "insights_by_username_requested"
    | "insights_by_username_discovered"
    | "insights_by_creator_ids";
  url: string;
  status: number;
  ok: boolean;
  payload: unknown;
};

const USER_TOKEN_REFRESH_BUFFER_SECONDS = 7 * 24 * 60 * 60;

function redactSensitiveQueryParams(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("access_token")) {
      parsed.searchParams.set("access_token", "REDACTED");
    }
    if (parsed.searchParams.has("appsecret_proof")) {
      parsed.searchParams.set("appsecret_proof", "REDACTED");
    }
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&]access_token=)[^&]+/gi, "$1REDACTED")
      .replace(/([?&]appsecret_proof=)[^&]+/gi, "$1REDACTED");
  }
}

function sanitizeRawPayload(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveQueryParams(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRawPayload(item));
  }

  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeRawPayload(nested);
    }
    return out;
  }

  return value;
}

async function persistRawApiCapture(payload: {
  request: {
    username: string;
    query: string;
    includeInsights: boolean;
    includeMedia: boolean;
    limit: number;
  };
  calls: RawApiResponseCapture[];
}): Promise<string | null> {
  if (process.env.SAVE_CREATOR_MARKETPLACE_RAW === "false") {
    return null;
  }

  const outputDir =
    process.env.CREATOR_MARKETPLACE_RAW_DIR ??
    path.join(process.cwd(), ".meta-debug", "creator-marketplace");
  const fileName = `${new Date().toISOString().replace(/[.:]/g, "-")}-${randomUUID()}.json`;
  const filePath = path.join(outputDir, fileName);

  try {
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      filePath,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          ...payload,
        },
        null,
        2,
      ),
      "utf8",
    );

    return filePath;
  } catch {
    return null;
  }
}

function buildArrayParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!items.length) {
    return null;
  }

  return JSON.stringify(items);
}

function toTableRows(record: Record<string, unknown>, ignore: string[]): TableRow[] {
  const rows: TableRow[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (ignore.includes(key)) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      rows.push({ field: key, value: value === null ? "" : String(value) });
    }
  }

  return rows;
}

function extractInsightsRows(record: Record<string, unknown>): TableRow[] {
  const insightsContainer = record.insights as { data?: Array<Record<string, unknown>> } | undefined;
  const insights = insightsContainer?.data ?? [];

  const rows: TableRow[] = [];

  for (const insight of insights) {
    const metric = typeof insight.name === "string" ? insight.name : "metric";
    const values = Array.isArray(insight.values) ? insight.values : [];

    if (!values.length) {
      rows.push({ field: metric, value: "(no values)" });
      continue;
    }

    for (const value of values) {
      if (typeof value !== "object" || value === null) {
        continue;
      }

      const valueRecord = value as Record<string, unknown>;
      const endTime = typeof valueRecord.end_time === "string" ? valueRecord.end_time : "";
      const metricValue = valueRecord.value;

      if (typeof metricValue === "number" || typeof metricValue === "string") {
        rows.push({
          field: endTime ? `${metric} (${endTime})` : metric,
          value: String(metricValue),
        });
        continue;
      }

      if (typeof metricValue === "object" && metricValue !== null) {
        rows.push({
          field: endTime ? `${metric} (${endTime})` : metric,
          value: JSON.stringify(metricValue),
        });
      }
    }
  }

  return rows;
}

function extractMediaRows(
  record: Record<string, unknown>,
  key: "recent_media" | "branded_content_media",
): Array<Record<string, string | number>> {
  const mediaContainer = record[key] as { data?: Array<Record<string, unknown>> } | undefined;
  const media = mediaContainer?.data ?? [];

  return media.map((item) => {
    const insightData = (item.insights as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];

    const viewMetric = insightData.find((metric) => metric.name === "views");
    const values = Array.isArray(viewMetric?.values) ? viewMetric.values : [];
    const latest = values[0] as Record<string, unknown> | undefined;
    const metricValue = latest?.value;

    return {
      media_type: typeof item.media_type === "string" ? item.media_type : "",
      permalink: typeof item.permalink === "string" ? item.permalink : "",
      views:
        typeof metricValue === "number"
          ? metricValue
          : typeof metricValue === "string"
            ? metricValue
            : "",
    };
  });
}

function normalizeKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatPercent(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const pct = value <= 1 ? value * 100 : value;
    return `${pct.toFixed(2)}%`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "N/A";
    }

    const parsed = Number(trimmed.replace(/%/g, ""));
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const pct = parsed <= 1 ? parsed * 100 : parsed;
      return `${pct.toFixed(2)}%`;
    }

    return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
  }

  return "N/A";
}

function walkValues(
  value: unknown,
  visitor: (key: string, nestedValue: unknown, parent: Record<string, unknown>) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkValues(item, visitor);
    }
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  const record = value as Record<string, unknown>;
  for (const [key, nestedValue] of Object.entries(record)) {
    visitor(key, nestedValue, record);
    walkValues(nestedValue, visitor);
  }
}

function findFirstByCandidateKeys(record: Record<string, unknown>, keys: string[]): unknown {
  const wanted = new Set(keys.map((key) => normalizeKey(key)));
  let found: unknown;

  walkValues(record, (key, value) => {
    if (found !== undefined) {
      return;
    }

    if (wanted.has(normalizeKey(key))) {
      found = value;
    }
  });

  return found;
}

function findFirstObjectWithKeys(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | null {
  const wanted = new Set(keys.map((key) => normalizeKey(key)));
  let found: Record<string, unknown> | null = null;

  walkValues(record, (_key, value) => {
    if (found || typeof value !== "object" || value === null || Array.isArray(value)) {
      return;
    }

    const obj = value as Record<string, unknown>;
    const normalized = Object.keys(obj).map((key) => normalizeKey(key));
    const hasAny = normalized.some((key) => wanted.has(key));

    if (hasAny) {
      found = obj;
    }
  });

  return found;
}

function readCaseInsensitive(obj: Record<string, unknown>, key: string): unknown {
  const wanted = normalizeKey(key);
  const entry = Object.entries(obj).find(([k]) => normalizeKey(k) === wanted);
  return entry?.[1];
}

function extractTopCities(record: Record<string, unknown>): string[] {
  const cityValue = findFirstByCandidateKeys(record, [
    "top_cities",
    "cities",
    "audience_cities",
    "top_locations_city",
  ]);

  if (Array.isArray(cityValue)) {
    const names = cityValue
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item === "object" && item !== null) {
          const rec = item as Record<string, unknown>;
          const fromName = readCaseInsensitive(rec, "name");
          const fromCity = readCaseInsensitive(rec, "city");
          return typeof fromName === "string"
            ? fromName
            : typeof fromCity === "string"
              ? fromCity
              : null;
        }

        return null;
      })
      .filter((name): name is string => Boolean(name))
      .slice(0, 3);

    if (names.length) {
      return names;
    }
  }

  if (typeof cityValue === "object" && cityValue !== null && !Array.isArray(cityValue)) {
    const sorted = Object.entries(cityValue as Record<string, unknown>)
      .map(([name, value]) => ({
        name,
        value: typeof value === "number" ? value : Number(value),
      }))
      .filter((item) => Number.isFinite(item.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((item) => item.name);

    if (sorted.length) {
      return sorted;
    }
  }

  return [];
}

function extractAnalyticsSnapshot(record: Record<string, unknown>): AnalyticsSnapshot {
  const interactionRaw = findFirstByCandidateKeys(record, [
    "interaction_rate",
    "creator_interaction_rate",
    "engagement_rate",
    "creator_engagement_rate",
  ]);

  const genderObject =
    findFirstObjectWithKeys(record, ["male", "female"]) ??
    findFirstObjectWithKeys(record, ["men", "women"]);

  const maleRaw =
    readCaseInsensitive(genderObject ?? {}, "male") ??
    readCaseInsensitive(genderObject ?? {}, "men") ??
    findFirstByCandidateKeys(record, ["male_percentage", "male_pct", "male"]);

  const femaleRaw =
    readCaseInsensitive(genderObject ?? {}, "female") ??
    readCaseInsensitive(genderObject ?? {}, "women") ??
    findFirstByCandidateKeys(record, ["female_percentage", "female_pct", "female"]);

  const ageObject =
    findFirstObjectWithKeys(record, ["18-24", "25-34", "35-44"]) ??
    findFirstObjectWithKeys(record, ["18_24", "25_34", "35_44"]);

  const age18Raw =
    readCaseInsensitive(ageObject ?? {}, "18-24") ??
    readCaseInsensitive(ageObject ?? {}, "18_24") ??
    findFirstByCandidateKeys(record, ["age_18_24", "age18_24", "18_24"]);

  const age25Raw =
    readCaseInsensitive(ageObject ?? {}, "25-34") ??
    readCaseInsensitive(ageObject ?? {}, "25_34") ??
    findFirstByCandidateKeys(record, ["age_25_34", "age25_34", "25_34"]);

  const age35Raw =
    readCaseInsensitive(ageObject ?? {}, "35-44") ??
    readCaseInsensitive(ageObject ?? {}, "35_44") ??
    findFirstByCandidateKeys(record, ["age_35_44", "age35_44", "35_44"]);

  return {
    interactionRatePct: formatPercent(interactionRaw),
    malePct: formatPercent(maleRaw),
    femalePct: formatPercent(femaleRaw),
    age18To24Pct: formatPercent(age18Raw),
    age25To34Pct: formatPercent(age25Raw),
    age35To44Pct: formatPercent(age35Raw),
    topCities: extractTopCities(record),
  };
}

function extractInsightsMap(record: Record<string, unknown>): Record<string, string | number> {
  const insightsContainer = record.insights as { data?: Array<Record<string, unknown>> } | undefined;
  const insights = insightsContainer?.data ?? [];

  const out: Record<string, string | number> = {};

  for (const insight of insights) {
    const metricName = typeof insight.name === "string" ? insight.name : "metric";
    const totalValue =
      (insight.total_value as { value?: string | number } | undefined)?.value ??
      ((Array.isArray(insight.values) ? insight.values[0] : undefined) as
        | { value?: string | number }
        | undefined)?.value;

    if (typeof totalValue === "number" || typeof totalValue === "string") {
      out[metricName] = totalValue;
    }
  }

  return out;
}

function toCreatorList(items: Array<Record<string, unknown>>): CreatorListItem[] {
  return items.map((item) => {
    const username = typeof item.username === "string" ? item.username : "";

    return {
      id: typeof item.id === "string" ? item.id : "",
      username,
      country: typeof item.country === "string" ? item.country : "",
      gender: typeof item.gender === "string" ? item.gender : "",
      isMock: username.startsWith("mocked_") || username.startsWith("test_"),
      insights: extractInsightsMap(item),
    };
  });
}

function findExactUsernameMatch(
  items: Array<Record<string, unknown>>,
  requestedUsername: string,
): Record<string, unknown> | null {
  const wanted = requestedUsername.replace(/@/g, "").trim().toLowerCase();
  if (!wanted) {
    return null;
  }

  for (const item of items) {
    const candidate = typeof item.username === "string" ? item.username.toLowerCase() : "";
    if (candidate === wanted) {
      return item;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams
    .get("username")
    ?.replace(/@/g, "")
    .trim()
    .toLowerCase();

  const query = request.nextUrl.searchParams.get("query")?.trim();
  const limit = request.nextUrl.searchParams.get("limit")?.trim() ?? "10";
  const includeInsights = request.nextUrl.searchParams.get("include_insights") === "true";
  const includeMedia = request.nextUrl.searchParams.get("include_media") === "true";
  const creatorCountries = buildArrayParam(request.nextUrl.searchParams.get("creator_countries"));
  const similarToCreators = buildArrayParam(request.nextUrl.searchParams.get("similar_to_creators"));

  if (!username && !query) {
    return NextResponse.json(
      {
        error:
          "Provide at least one of: username or query. Creator Marketplace username lookups are usually the best starting point.",
      },
      { status: 400 },
    );
  }

  const explicitPageToken = process.env.META_PAGE_ACCESS_TOKEN;
  const appId = process.env.META_APP_ID;
  const explicitPageId = process.env.META_PAGE_ID;
  const igUserId = process.env.META_IG_USER_ID;
  const graphVersion = process.env.META_GRAPH_API_VERSION ?? "v25.0";
  const appSecret = process.env.META_APP_SECRET;

  if (!igUserId) {
    return NextResponse.json(
      {
        error:
          "Missing env configuration. Set META_IG_USER_ID in .env.local.",
      },
      { status: 500 },
    );
  }

  let accessToken: string;
  let sessionUserToken: string | undefined;
  let sessionPageToken: string | undefined;

  const PAGE_TOKEN_REFRESH_BUFFER_SECONDS = 7 * 24 * 60 * 60; // Refresh if within 7 days of expiry

  try {
    const session = await getAuthSession();

    if (session?.accessToken) {
      const secondsUntilExpiry = Math.floor((session.expiresAt - Date.now()) / 1000);

      // Refresh user token if needed
      if (
        secondsUntilExpiry > 0 &&
        secondsUntilExpiry < USER_TOKEN_REFRESH_BUFFER_SECONDS &&
        appId &&
        appSecret
      ) {
        try {
          const refreshed = await refreshLongLivedUserToken({
            graphVersion,
            appId,
            appSecret,
            userAccessToken: session.accessToken,
          });

          const refreshedExpiresAt = Date.now() + refreshed.expiresIn * 1000;
          
          // Also refresh page token if we have a user token
          let newPageToken = session.pageToken;
          let newPageTokenExpiresAt = session.pageTokenExpiresAt;
          
          if (igUserId && appSecret) {
            try {
              const pageTokenResult = await generatePageTokenFromUserToken({
                graphVersion,
                appSecret,
                igUserId,
                userAccessToken: refreshed.accessToken,
                explicitPageId,
              });
              newPageToken = pageTokenResult.pageToken;
              newPageTokenExpiresAt = Date.now() + pageTokenResult.expiresIn * 1000;
            } catch {
              // Keep existing page token if refresh fails
            }
          }
          
          await setAuthSession({
            accessToken: refreshed.accessToken,
            expiresAt: refreshedExpiresAt,
            userId: session.userId,
            userName: session.userName,
            pageToken: newPageToken,
            pageTokenExpiresAt: newPageTokenExpiresAt,
          });

          sessionUserToken = refreshed.accessToken;
          sessionPageToken = newPageToken;
        } catch {
          sessionUserToken = session.accessToken;
          sessionPageToken = session.pageToken;
        }
      } else {
        sessionUserToken = session.accessToken;
        sessionPageToken = session.pageToken;
      }
      
      // Refresh page token if it's expiring soon (independent of user token)
      if (
        sessionPageToken &&
        session.pageTokenExpiresAt &&
        session.pageTokenExpiresAt - Date.now() < PAGE_TOKEN_REFRESH_BUFFER_SECONDS * 1000 &&
        igUserId &&
        appSecret
      ) {
        try {
          const pageTokenResult = await generatePageTokenFromUserToken({
            graphVersion,
            appSecret,
            igUserId,
            userAccessToken: sessionUserToken || session.accessToken,
            explicitPageId,
          });
          const newPageTokenExpiresAt = Date.now() + pageTokenResult.expiresIn * 1000;
          
          // Update session with new page token
          await setAuthSession({
            accessToken: session.accessToken,
            expiresAt: session.expiresAt,
            userId: session.userId,
            userName: session.userName,
            pageToken: pageTokenResult.pageToken,
            pageTokenExpiresAt: newPageTokenExpiresAt,
          });
          
          sessionPageToken = pageTokenResult.pageToken;
        } catch {
          // Keep existing page token if refresh fails
        }
      }
    }
  } catch {
    // continue and let downstream checks return actionable auth errors
  }

  if (!explicitPageToken && !sessionPageToken && !sessionUserToken) {
    return NextResponse.json(
      {
        error: "Authentication required to search external creators.",
        instructions:
          "Sign in with Facebook to auto-generate page token for Creator Marketplace access.",
        loginUrl: "/api/auth/facebook/login",
      },
      { status: 401 },
    );
  }

  try {
    // Prefer explicit token, then session page token, then derive from user token
    if (explicitPageToken) {
      accessToken = explicitPageToken;
    } else if (sessionPageToken) {
      accessToken = sessionPageToken;
    } else {
      accessToken = await resolveCreatorMarketplacePageToken({
        graphVersion,
        appId,
        appSecret,
        igUserId,
        userAccessToken: sessionUserToken,
        explicitPageToken,
        explicitPageId,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve a valid Page token for Creator Marketplace.",
      },
      { status: 500 },
    );
  }

  const discoveryParams = new URLSearchParams({
    access_token: accessToken,
    limit,
    fields: "id,username,name,country,gender,followers_count",
  });

  if (username) {
    discoveryParams.set("username", username);
  }

  if (query) {
    discoveryParams.set("query", query);
  }

  if (creatorCountries) {
    discoveryParams.set("creator_countries", creatorCountries);
  }

  if (similarToCreators) {
    discoveryParams.set("similar_to_creators", similarToCreators);
  }

  if (appSecret) {
    const appSecretProof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
    discoveryParams.set("appsecret_proof", appSecretProof);
  }

  const discoveryUrl = `https://graph.facebook.com/${graphVersion}/${igUserId}/creator_marketplace_creators?${discoveryParams.toString()}`;

  try {
    const rawApiResponses: RawApiResponseCapture[] = [];

    const discoveryResponse = await fetch(discoveryUrl, {
      method: "GET",
      next: { revalidate: 0 },
    });

    const discoveryPayload = (await discoveryResponse.json()) as CreatorMarketplaceResponse;
    rawApiResponses.push({
      type: "discovery",
      url: redactSensitiveQueryParams(discoveryUrl),
      status: discoveryResponse.status,
      ok: discoveryResponse.ok,
      payload: sanitizeRawPayload(discoveryPayload),
    });

    if (!discoveryResponse.ok || discoveryPayload.error) {
      const code = discoveryPayload.error?.code;
      const subcode = discoveryPayload.error?.error_subcode;
      const trace = discoveryPayload.error?.fbtrace_id;
      const message = discoveryPayload.error?.message ?? "Creator Marketplace API request failed.";

      if (code === 190) {
        const rawCapturePath = await persistRawApiCapture({
          request: {
            username: username ?? "",
            query: query ?? "",
            includeInsights,
            includeMedia,
            limit: Number(limit),
          },
          calls: rawApiResponses,
        });

        return NextResponse.json(
          {
            error:
              "Meta rejected the current token (code 190). Re-login with Facebook to refresh your session and page access for Creator Marketplace.",
            rawApiResponses,
            rawCapturePath,
          },
          { status: discoveryResponse.status || 400 },
        );
      }

      if (code === 210 && subcode === 1349253) {
        const rawCapturePath = await persistRawApiCapture({
          request: {
            username: username ?? "",
            query: query ?? "",
            includeInsights,
            includeMedia,
            limit: Number(limit),
          },
          calls: rawApiResponses,
        });

        return NextResponse.json(
          {
            error:
              "Creator Marketplace reports this account as not visible (code 210, subcode 1349253). The creator is currently not available through Creator Marketplace API for this brand/app context. This can happen when the creator is not eligible/onboarded, not visible to your brand segment, or your app is still on standard test data. Try another creator known to be available in Creator Marketplace and ensure brand onboarding is complete.",
            rawApiResponses,
            rawCapturePath,
          },
          { status: discoveryResponse.status || 400 },
        );
      }

      const parts = [message, code ? `code=${code}` : "", subcode ? `subcode=${subcode}` : "", trace ? `fbtrace_id=${trace}` : ""].filter(Boolean);
      const rawCapturePath = await persistRawApiCapture({
        request: {
          username: username ?? "",
          query: query ?? "",
          includeInsights,
          includeMedia,
          limit: Number(limit),
        },
        calls: rawApiResponses,
      });

      return NextResponse.json(
        { error: parts.join(" | "), rawApiResponses, rawCapturePath },
        { status: discoveryResponse.status || 500 },
      );
    }

    const discoveredCreators = discoveryPayload.data ?? [];
    const matchedByUsername = username
      ? findExactUsernameMatch(discoveredCreators as Array<Record<string, unknown>>, username)
      : null;
    const selectedDiscoveryRecord =
      matchedByUsername ?? ((discoveredCreators[0] as Record<string, unknown> | undefined) ?? null);

    if (username && !matchedByUsername) {
      return NextResponse.json(
        {
          error:
            `No exact Creator Marketplace match found for @${username}. The API may be returning recommendations for your token context instead of a direct username match.`,
          request: {
            username,
            query: query ?? "",
            limit: Number(limit),
          },
          rawCount: discoveredCreators.length,
          creators: toCreatorList(discoveredCreators as Array<Record<string, unknown>>),
        },
        { status: 404 },
      );
    }

    if (!selectedDiscoveryRecord) {
      return NextResponse.json(
        {
          error:
            "No creators were returned. Verify Creator Marketplace onboarding/eligibility and token scopes for this app user.",
        },
        { status: 404 },
      );
    }

    const firstRecord = selectedDiscoveryRecord as Record<string, unknown>;
    const discoveredCreatorId = typeof firstRecord.id === "string" ? firstRecord.id : "";
    const discoveredCreatorUsername =
      typeof firstRecord.username === "string" ? firstRecord.username : "";

    const insightsFieldParts = ["id", "username", "name", "country", "gender", "followers_count"];

    if (includeInsights) {
      insightsFieldParts.push("insights");
    }

    if (includeMedia) {
      insightsFieldParts.push(
        "branded_content_media{media_type,permalink,insights.metrics(views)}",
        "recent_media{media_type,permalink,insights.metrics(views)}",
      );
    }

    let insightsByUsernameRecord: Record<string, unknown> | null = null;
    let insightsByUsernameSource: "requested" | "discovered" | null = null;
    let insightsByUsernameError: MetaApiError | undefined;

    const usernameCandidates: Array<{ value: string; source: "requested" | "discovered" }> = [];
    if (username) {
      usernameCandidates.push({ value: username, source: "requested" });
    }
    if (discoveredCreatorUsername && discoveredCreatorUsername !== username) {
      usernameCandidates.push({ value: discoveredCreatorUsername, source: "discovered" });
    }

    for (const candidate of usernameCandidates) {
      const insightsByUsernameParams = new URLSearchParams({
        access_token: accessToken,
        limit,
        fields: insightsFieldParts.join(","),
        username: candidate.value,
      });

      if (appSecret) {
        const appSecretProof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
        insightsByUsernameParams.set("appsecret_proof", appSecretProof);
      }

      const insightsByUsernameUrl = `https://graph.facebook.com/${graphVersion}/${igUserId}/creator_marketplace_creators?${insightsByUsernameParams.toString()}`;
      const insightsByUsernameResponse = await fetch(insightsByUsernameUrl, {
        method: "GET",
        next: { revalidate: 0 },
      });

      const insightsByUsernamePayload =
        (await insightsByUsernameResponse.json()) as CreatorMarketplaceResponse;

      rawApiResponses.push({
        type:
          candidate.source === "requested"
            ? "insights_by_username_requested"
            : "insights_by_username_discovered",
        url: redactSensitiveQueryParams(insightsByUsernameUrl),
        status: insightsByUsernameResponse.status,
        ok: insightsByUsernameResponse.ok,
        payload: sanitizeRawPayload(insightsByUsernamePayload),
      });

      if (
        insightsByUsernameResponse.ok &&
        !insightsByUsernamePayload.error &&
        (insightsByUsernamePayload.data?.length ?? 0) > 0
      ) {
        insightsByUsernameRecord = insightsByUsernamePayload.data?.[0] as Record<string, unknown>;
        insightsByUsernameSource = candidate.source;
        break;
      }

      if (!insightsByUsernameError && insightsByUsernamePayload.error) {
        insightsByUsernameError = insightsByUsernamePayload.error;
      }
    }

    const insightsByIdParams = new URLSearchParams({
      access_token: accessToken,
      limit,
      fields: insightsFieldParts.join(","),
      creator_ids: JSON.stringify([discoveredCreatorId]),
    });

    if (appSecret) {
      const appSecretProof = createHmac("sha256", appSecret).update(accessToken).digest("hex");
      insightsByIdParams.set("appsecret_proof", appSecretProof);
    }

    const insightsByIdUrl = `https://graph.facebook.com/${graphVersion}/${igUserId}/creator_marketplace_creators?${insightsByIdParams.toString()}`;
    const insightsByIdResponse = await fetch(insightsByIdUrl, {
      method: "GET",
      next: { revalidate: 0 },
    });

    const insightsByIdPayload = (await insightsByIdResponse.json()) as CreatorMarketplaceResponse;
    rawApiResponses.push({
      type: "insights_by_creator_ids",
      url: redactSensitiveQueryParams(insightsByIdUrl),
      status: insightsByIdResponse.status,
      ok: insightsByIdResponse.ok,
      payload: sanitizeRawPayload(insightsByIdPayload),
    });

    let effectiveRecord = firstRecord;
    let insightsLookupMethod = "creator_ids";
    let insightsLookupExplanation =
      "Insights/media were fetched using creator_ids lookup on creator_marketplace_creators.";

    if (insightsByIdResponse.ok && !insightsByIdPayload.error && (insightsByIdPayload.data?.length ?? 0) > 0) {
      effectiveRecord = insightsByIdPayload.data?.[0] as Record<string, unknown>;
    } else if (insightsByUsernameRecord) {
      effectiveRecord = insightsByUsernameRecord;
      insightsLookupMethod =
        insightsByUsernameSource === "requested" ? "username_requested" : "username_discovered";
      insightsLookupExplanation =
        insightsByUsernameSource === "requested"
          ? "creator_ids lookup failed/empty, so insights were loaded using the exact requested username lookup."
          : "creator_ids lookup failed/empty, so insights were loaded using the discovered username lookup.";
    } else {
      insightsLookupMethod = "creator_ids_failed_fallback_to_discovery_record";
      insightsLookupExplanation =
        "The second creator_ids call failed or returned empty, so the API fell back to the initial discovery record only (which may contain fewer insights).";
    }

    if (username && insightsByUsernameError?.code === 210 && insightsByUsernameError.error_subcode === 1349253) {
      const effectiveUsername = typeof effectiveRecord.username === "string" ? effectiveRecord.username : "";
      if (effectiveUsername && effectiveUsername !== username) {
        const rawCapturePath = await persistRawApiCapture({
          request: {
            username: username ?? "",
            query: query ?? "",
            includeInsights,
            includeMedia,
            limit: Number(limit),
          },
          calls: rawApiResponses,
        });

        return NextResponse.json(
          {
            error:
              `Insights for username=${username} are blocked by Creator Marketplace visibility (code 210, subcode 1349253). Discovery returned ${effectiveUsername}, which is not your requested username.`,
            rawApiResponses,
            rawCapturePath,
          },
          { status: 409 },
        );
      }
    }

    const returnedUsername =
      typeof effectiveRecord.username === "string" ? effectiveRecord.username.toLowerCase() : "";
    const requestedUsername = username ?? "";
    const isLikelyMockData =
      returnedUsername.startsWith("mocked_") ||
      returnedUsername.startsWith("test_") ||
      (!!requestedUsername && !!returnedUsername && returnedUsername !== requestedUsername);

    const rawCapturePath = await persistRawApiCapture({
      request: {
        username: username ?? "",
        query: query ?? "",
        includeInsights,
        includeMedia,
        limit: Number(limit),
      },
      calls: rawApiResponses,
    });

    const creatorsFromInsightsById = Array.isArray(insightsByIdPayload.data)
      ? (insightsByIdPayload.data as Array<Record<string, unknown>>)
      : [];
    const creatorsFromDiscovery = discoveredCreators as Array<Record<string, unknown>>;
    const creators = toCreatorList(
      creatorsFromInsightsById.length ? creatorsFromInsightsById : creatorsFromDiscovery,
    );

    return NextResponse.json({
      request: {
        username: username ?? "",
        query: query ?? "",
        includeInsights,
        includeMedia,
        creatorCountries: creatorCountries ? JSON.parse(creatorCountries) : [],
        similarToCreators: similarToCreators ? JSON.parse(similarToCreators) : [],
        limit: Number(limit),
      },
      discoveredCreatorId,
      discoveredCreatorUsername,
      insightsLookupMethod,
      insightsLookupExplanation,
      rawApiResponses,
      rawCapturePath,
      creators,
      analyticsSnapshot: extractAnalyticsSnapshot(effectiveRecord),
      topLevel: toTableRows(effectiveRecord, ["insights", "recent_media", "branded_content_media"]),
      creatorInsights: extractInsightsRows(effectiveRecord),
      recentMedia: extractMediaRows(effectiveRecord, "recent_media"),
      brandedContentMedia: extractMediaRows(effectiveRecord, "branded_content_media"),
      rawCount: discoveredCreators.length,
      isLikelyMockData,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unexpected server error while calling Creator Marketplace API.",
      },
      { status: 500 },
    );
  }
}
