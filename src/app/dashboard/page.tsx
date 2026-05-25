"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type CreatorMarketplaceResult = {
  creators: Array<{
    id: string;
    username: string;
    country: string;
    gender: string;
    isMock: boolean;
    insights: Record<string, string | number>;
  }>;
};
// (added) optional debug fields returned by the API
type CreatorMarketplaceResultDebug = CreatorMarketplaceResult & {
  analyticsSnapshot?: {
    interactionRatePct?: string;
    malePct?: string;
    femalePct?: string;
    age18To24Pct?: string;
    age25To34Pct?: string;
    age35To44Pct?: string;
    topCities?: string[];
  };
  topLevel?: Array<Record<string, unknown>>;
  creatorInsights?: Array<Record<string, unknown>>;
  rawApiResponses?: Array<Record<string, unknown>>;
  rawCapturePath?: string;
  request?: Record<string, unknown>;
  discoveredCreatorId?: string;
  discoveredCreatorUsername?: string;
  insightsLookupMethod?: string;
  insightsLookupExplanation?: string;
};

type LookupResult = {
  requestedInput: string;
  requestedUsername: string;
  data?: CreatorMarketplaceResultDebug;
  error?: string;
};

type RawApiResponse = {
  type: string;
  url?: string;
  status?: number;
  ok?: boolean;
  payload?: Record<string, unknown>;
};

type MetricBreakdown = {
  dimensionKey: string;
  results: Array<{
    dimensionValue: string;
    value?: string | number;
    percentage?: number;
  }>;
};

function prettyLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "-";
  }

  return JSON.stringify(value);
}

function normalizeBreakdownResults(
  results: Array<Record<string, unknown>>,
): MetricBreakdown["results"] {
  return results.map((result) => ({
    dimensionValue:
      typeof result.dimension_value === "string" ? result.dimension_value : "Unknown",
    value:
      typeof result.value === "number" || typeof result.value === "string"
        ? result.value
        : undefined,
    percentage: typeof result.percentage === "number" ? result.percentage : undefined,
  }));
}

const INSTAGRAM_RESERVED_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "explore",
  "accounts",
  "about",
  "developer",
  "directory",
  "api",
  "oauth",
]);

function normalizeInstagramUsername(value: string): string {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "")
    .replace(/[.]+$/, "");
}

function extractInstagramUsernames(text: string): string[] {
  const usernames = new Set<string>();
  const tokens = text.split(/[\s,;]+/).map((part) => part.trim()).filter(Boolean);

  for (const token of tokens) {
    const cleanedToken = token.replace(/[()[\]{}<>"']/g, "");
    let candidate: string | null = null;

    if (cleanedToken.toLowerCase().includes("instagram.com")) {
      try {
        const parsed = new URL(cleanedToken.startsWith("http") ? cleanedToken : `https://${cleanedToken}`);
        const firstSegment = parsed.pathname.split("/").filter(Boolean)[0];
        if (firstSegment && !INSTAGRAM_RESERVED_PATHS.has(firstSegment.toLowerCase())) {
          candidate = firstSegment;
        }
      } catch {
        const match = cleanedToken.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
        const firstSegment = match?.[1];
        if (firstSegment && !INSTAGRAM_RESERVED_PATHS.has(firstSegment.toLowerCase())) {
          candidate = firstSegment;
        }
      }
    }

    if (!candidate) {
      const handleMatch = cleanedToken.match(/^@?([A-Za-z0-9._]{1,30})$/);
      if (handleMatch) {
        candidate = handleMatch[1];
      }
    }

    if (!candidate) {
      continue;
    }

    const normalized = normalizeInstagramUsername(candidate);
    if (normalized && !INSTAGRAM_RESERVED_PATHS.has(normalized.toLowerCase())) {
      usernames.add(normalized);
    }
  }

  return Array.from(usernames);
}

function SelectedFieldsTable({
  creator,
  snapshot,
}: {
  creator?: CreatorMarketplaceResult["creators"][number];
  snapshot?: CreatorMarketplaceResultDebug["analyticsSnapshot"];
}) {
  const totalFollowers = formatMetricValue(
    creator?.insights?.total_followers ?? creator?.insights?.followers_count,
  );
  const topCities = snapshot?.topCities ?? [];

  const columns = [
    { label: "Total follower", subLabel: "Lifetime overall", value: totalFollowers },
    { label: "Reels interaction rate", subLabel: "Last 90 days", value: snapshot?.interactionRatePct ?? "-" },
    { label: "Age 18 - 24", subLabel: "Audience split", value: snapshot?.age18To24Pct ?? "-" },
    { label: "Age 25 - 34", subLabel: "Audience split", value: snapshot?.age25To34Pct ?? "-" },
    { label: "Age 35 - 44", subLabel: "Audience split", value: snapshot?.age35To44Pct ?? "-" },
    { label: "Male %", subLabel: "Audience split", value: snapshot?.malePct ?? "-" },
    { label: "Female %", subLabel: "Audience split", value: snapshot?.femalePct ?? "-" },
    { label: "Top city 1", subLabel: "Top locations", value: topCities[0] ?? "-" },
    { label: "Top city 2", subLabel: "Top locations", value: topCities[1] ?? "-" },
    { label: "Top city 3", subLabel: "Top locations", value: topCities[2] ?? "-" },
  ];

  return (
    <section
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(15,23,42,0.1)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 14px 36px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem 1rem 0.7rem", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(15,23,42,0.55)" }}>
              Excel view
            </p>
            <h3 style={{ margin: "0.35rem 0 0", fontSize: "1.05rem" }}>
              Selected fields for {creator?.username ? `@${creator.username}` : "the loaded creator"}
            </h3>
          </div>
          <div style={{ fontSize: "0.84rem", color: "rgba(15,23,42,0.68)", alignSelf: "end" }}>
            Showing only the requested columns
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "1200px",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    textAlign: "left",
                    padding: "0.95rem 1rem",
                    background: "#edf5ff",
                    borderBottom: "1px solid rgba(15,23,42,0.1)",
                    borderRight: "1px solid rgba(15,23,42,0.08)",
                    verticalAlign: "bottom",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#10243e" }}>{column.label}</div>
                  <div style={{ marginTop: "0.2rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(16,36,62,0.55)" }}>
                    {column.subLabel}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((column, index) => (
                <td
                  key={`${column.label}-${index}`}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                    borderRight: "1px solid rgba(15,23,42,0.06)",
                    background: index % 2 === 0 ? "#ffffff" : "#f9fcff",
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectedFieldsBatchTable({ results }: { results: LookupResult[] }) {
  const columns = [
    { label: "Username", subLabel: "Instagram account" },
    { label: "Total follower", subLabel: "Lifetime overall" },
    { label: "Reels interaction rate", subLabel: "Last 90 days" },
    { label: "Age 18 - 24", subLabel: "Audience split" },
    { label: "Age 25 - 34", subLabel: "Audience split" },
    { label: "Age 35 - 44", subLabel: "Audience split" },
    { label: "Male %", subLabel: "Audience split" },
    { label: "Female %", subLabel: "Audience split" },
    { label: "Top city 1", subLabel: "Top locations" },
    { label: "Top city 2", subLabel: "Top locations" },
    { label: "Top city 3", subLabel: "Top locations" },
  ];

  return (
    <section
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(15,23,42,0.1)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 14px 36px rgba(15,23,42,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem 1rem 0.7rem", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(15,23,42,0.55)" }}>
              Excel view
            </p>
            <h3 style={{ margin: "0.35rem 0 0", fontSize: "1.05rem" }}>
              Selected fields for {results.length} account{results.length === 1 ? "" : "s"}
            </h3>
          </div>
          <div style={{ fontSize: "0.84rem", color: "rgba(15,23,42,0.68)", alignSelf: "end" }}>
            Showing only the requested columns
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "1500px",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    textAlign: "left",
                    padding: "0.95rem 1rem",
                    background: "#edf5ff",
                    borderBottom: "1px solid rgba(15,23,42,0.1)",
                    borderRight: "1px solid rgba(15,23,42,0.08)",
                    verticalAlign: "bottom",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#10243e" }}>{column.label}</div>
                  <div style={{ marginTop: "0.2rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(16,36,62,0.55)" }}>
                    {column.subLabel}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((result, rowIndex) => {
              const data = result.data;
              const snapshot = data?.analyticsSnapshot;
              const creator = data?.creators?.[0];
              const topCities = snapshot?.topCities ?? [];

              const cells = [
                result.requestedUsername ? `@${result.requestedUsername}` : result.requestedInput,
                formatMetricValue(creator?.insights?.total_followers ?? creator?.insights?.followers_count),
                snapshot?.interactionRatePct ?? (result.error ? "-" : "-"),
                snapshot?.age18To24Pct ?? "-",
                snapshot?.age25To34Pct ?? "-",
                snapshot?.age35To44Pct ?? "-",
                snapshot?.malePct ?? "-",
                snapshot?.femalePct ?? "-",
                topCities[0] ?? "-",
                topCities[1] ?? "-",
                topCities[2] ?? "-",
              ];

              return (
                <tr key={`${result.requestedUsername}-${rowIndex}`}>
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={`${result.requestedUsername}-${rowIndex}-${cellIndex}`}
                      style={{
                        padding: "1rem",
                        borderBottom: "1px solid rgba(15,23,42,0.08)",
                        borderRight: "1px solid rgba(15,23,42,0.06)",
                        background: rowIndex % 2 === 0 ? "#ffffff" : "#f9fcff",
                        fontSize: cellIndex === 0 ? "0.95rem" : "0.98rem",
                        fontWeight: cellIndex === 0 ? 800 : 700,
                        color: cellIndex === 0 && result.error ? "#b91c1c" : "#0f172a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApiCallCard({ response }: { response: RawApiResponse }) {
  const data = response.payload?.data;
  const first = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
  const insightData = (first?.insights as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];

  return (
    <article
      style={{
        border: "1px solid rgba(15,23,42,0.12)",
        borderRadius: "14px",
        padding: "0.95rem",
        background: "#ffffff",
        boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.98rem" }}>{prettyLabel(response.type)}</h3>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "rgba(15,23,42,0.65)" }}>
            {response.status ?? "-"} · {response.ok ? "ok" : "failed"}
          </p>
        </div>
        <span
          style={{
            padding: "0.25rem 0.55rem",
            borderRadius: "999px",
            background: response.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: response.ok ? "#15803d" : "#b91c1c",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          {response.ok ? "Success" : "Error"}
        </span>
      </div>

      <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.65rem" }}>
        {insightData.map((item) => {
          const rawBreakdowns = (item.total_value as { breakdowns?: { dimension_key?: string; results?: Array<Record<string, unknown>> } } | undefined)?.breakdowns;
          const breakdowns = rawBreakdowns?.dimension_key && Array.isArray(rawBreakdowns.results)
            ? {
                dimensionKey: rawBreakdowns.dimension_key,
                results: normalizeBreakdownResults(rawBreakdowns.results),
              }
            : null;
          return (
            <section
              key={`${response.type}-${item.name}-${item.time_range}`}
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(15,23,42,0.08)",
                padding: "0.75rem",
                background: "linear-gradient(180deg, #f8fafc, #ffffff)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <strong>{prettyLabel(typeof item.name === "string" ? item.name : "Metric")}</strong>
                <span style={{ fontSize: "0.78rem", color: "rgba(15,23,42,0.65)" }}>
                  {prettyLabel(typeof item.time_range === "string" ? item.time_range : "overall")}
                </span>
              </div>
              <div style={{ marginTop: "0.4rem", fontSize: "1.1rem", fontWeight: 700 }}>
                {formatMetricValue((item.total_value as { value?: unknown } | undefined)?.value)}
              </div>

              {breakdowns ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(15,23,42,0.55)" }}>
                    {prettyLabel(breakdowns.dimensionKey)}
                  </div>
                  <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.5rem" }}>
                    {breakdowns.results.map((result) => (
                      <div
                        key={`${response.type}-${item.name}-${breakdowns.dimensionKey}-${result.dimensionValue}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "0.75rem",
                          alignItems: "center",
                          padding: "0.6rem 0.7rem",
                          borderRadius: "10px",
                          background: "rgba(15,23,42,0.03)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{result.dimensionValue}</div>
                          <div style={{ fontSize: "0.78rem", color: "rgba(15,23,42,0.62)" }}>
                            {result.value !== undefined ? `Value: ${formatMetricValue(result.value)}` : ""}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800 }}>
                          {result.percentage !== undefined
                            ? `${result.percentage.toFixed(1)}%`
                            : result.value !== undefined
                              ? formatMetricValue(result.value)
                              : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <details style={{ marginTop: "0.85rem" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.82rem", color: "rgba(15,23,42,0.7)" }}>
          View request URL
        </summary>
        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", wordBreak: "break-all", color: "rgba(15,23,42,0.72)" }}>
          {response.url ?? "(no url)"}
        </div>
      </details>
    </article>
  );
}

type SessionState = {
  authenticated: boolean;
  userId?: string;
  userName?: string;
  expiresAt?: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [usernameInput, setUsernameInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<LookupResult[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false });
  const parsedUsernames = useMemo(() => extractInstagramUsernames(usernameInput), [usernameInput]);

  const username = useMemo(() => usernameInput.replace(/@/g, "").trim(), [usernameInput]);

  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function checkSessionAndMaybeRedirect() {
      setAuthLoading(true);

      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionState;
        if (cancelled) return;
        setSession(payload);

        if (!payload.authenticated && pathname !== "/login") {
          router.replace("/login");
        }
      } catch {
        if (!cancelled) {
          setSession({ authenticated: false });
          if (pathname !== "/login") router.replace("/login");
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    void checkSessionAndMaybeRedirect();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
    setBatchResults([]);
    setError(null);
    router.replace("/login");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.authenticated) {
      setError("Please login with Facebook first.");
      return;
    }

    if (!parsedUsernames.length) {
      setError("Please enter one or more Instagram usernames or profile URLs.");
      return;
    }

    setLoading(true);
    setError(null);
    setBatchResults([]);

    try {
      const queryValue = queryInput.trim();
      const lookupResults = await Promise.all(
        parsedUsernames.map(async (parsedUsername) => {
          const params = new URLSearchParams({
            username: parsedUsername,
            include_insights: "true",
            include_media: "false",
            limit: "1",
          });

          if (queryValue) {
            params.set("query", queryValue);
          }

          const endpoint = `/api/creator-marketplace?${params.toString()}`;

          const response = await fetch(endpoint);
          const payload = (await response.json()) as CreatorMarketplaceResultDebug | { error: string };

          if (!response.ok || "error" in payload) {
            return {
              requestedInput: parsedUsername,
              requestedUsername: parsedUsername,
              error: "error" in payload ? payload.error : "Unable to load creators.",
            } satisfies LookupResult;
          }

          return {
            requestedInput: parsedUsername,
            requestedUsername: (payload as CreatorMarketplaceResultDebug).discoveredCreatorUsername || parsedUsername,
            data: payload as CreatorMarketplaceResultDebug,
          } satisfies LookupResult;
        }),
      );

      setBatchResults(lookupResults);

      const failures = lookupResults.filter((item) => item.error);
      if (failures.length && failures.length === lookupResults.length) {
        setError(failures[0]?.error ?? "Unable to load creators.");
      } else if (failures.length) {
        setError(`Loaded ${lookupResults.length - failures.length} of ${lookupResults.length} accounts. Some lookups failed.`);
      }
    } catch {
      setError("Could not reach the API route. Check local server logs.");
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    if (!batchResults.length) {
      return;
    }

    const headers = [
      "username",
      "total_follower",
      "reels_interaction_rate",
      "age_18_24",
      "age_25_34",
      "age_35_44",
      "male_pct",
      "female_pct",
      "top_city_1",
      "top_city_2",
      "top_city_3",
    ];

    const rows = batchResults.map((result) => {
      const data = result.data;
      const creator = data?.creators?.[0];
      const snapshot = data?.analyticsSnapshot;
      const topCities = snapshot?.topCities ?? [];

      return [
        result.requestedUsername || result.requestedInput,
        String(creator?.insights?.total_followers ?? creator?.insights?.followers_count ?? ""),
        String(snapshot?.interactionRatePct ?? ""),
        String(snapshot?.age18To24Pct ?? ""),
        String(snapshot?.age25To34Pct ?? ""),
        String(snapshot?.age35To44Pct ?? ""),
        String(snapshot?.malePct ?? ""),
        String(snapshot?.femalePct ?? ""),
        String(topCities[0] ?? ""),
        String(topCities[1] ?? ""),
        String(topCities[2] ?? ""),
      ];
    });

    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creator-marketplace-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="dashboard-wrap">
          <section className="hero">
            <p className="eyebrow">Creator Marketplace</p>
            <h1>Creator Search</h1>
          </section>
          <section className="query-card">
            <p>Checking session...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="dashboard-wrap">
        <section className="hero">
          <p className="eyebrow">Creator Marketplace</p>
          <h1>Creator Search</h1>
        </section>

        <section className="query-card">
          <div className="auth-row">
            <p>
              Signed in as <strong>{session.userName || "Facebook User"}</strong>
            </p>
            <button type="button" className="secondary-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </section>

        <section className="query-card">
          <form onSubmit={onSubmit} className="query-form">
            <label htmlFor="username" className="field-label">
              Instagram usernames or profile URLs
            </label>
            <textarea
              id="username"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="Paste usernames, @handles, or Instagram profile URLs here. You can add multiple entries on separate lines."
              rows={4}
              className="username-box"
            />

            <label htmlFor="query" className="field-label">
              Optional Query
            </label>
            <input
              id="query"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="example: beauty"
              className="query-input"
            />

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </section>

        {error ? <p className="error-box">{error}</p> : null}

        {parsedUsernames.length ? (
          <section className="query-card" style={{ marginTop: "-0.35rem" }}>
            <p style={{ margin: 0, color: "rgba(15,23,42,0.72)" }}>
              Parsed {parsedUsernames.length} account{parsedUsernames.length === 1 ? "" : "s"}: {parsedUsernames.map((item) => `@${item}`).join(", ")}
            </p>
          </section>
        ) : null}

        {batchResults.length ? (
          <section className="panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <h2>Creator Insights Dashboard</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button type="button" className="secondary-btn" onClick={onExportCsv}>
                  Export CSV
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowRaw((s) => !s)}
                >
                  {showRaw ? "Hide API Calls" : "Show API Calls"}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Accounts</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{batchResults.length}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Success</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{batchResults.filter((item) => !item.error).length}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Errors</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{batchResults.filter((item) => item.error).length}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>API Calls</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>
                  {batchResults.reduce((total, item) => total + (item.data?.rawApiResponses?.length ?? 0), 0)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <SelectedFieldsBatchTable results={batchResults} />
            </div>
            {showRaw ? (
              <section style={{ marginTop: "1.25rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>API Calls</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "0.85rem",
                  }}
                >
                  {batchResults.flatMap((item) => item.data?.rawApiResponses ?? []).map((response, index) => (
                    <ApiCallCard key={`${(response as RawApiResponse).type}-${index}`} response={response as RawApiResponse} />
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
