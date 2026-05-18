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
  rawApiResponses?: Array<Record<string, unknown>>;
  rawCapturePath?: string;
  request?: Record<string, unknown>;
  discoveredCreatorId?: string;
  discoveredCreatorUsername?: string;
  insightsLookupMethod?: string;
  insightsLookupExplanation?: string;
  analyticsSnapshot?: Record<string, unknown>;
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

type MetricEntry = {
  name: string;
  timeRange: string;
  period?: string;
  value?: string | number;
  breakdowns: MetricBreakdown[];
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

function extractMetricsFromResponses(rawApiResponses?: Array<Record<string, unknown>>): MetricEntry[] {
  const metrics: MetricEntry[] = [];

  for (const response of (rawApiResponses ?? []) as RawApiResponse[]) {
    const data = response.payload?.data;
    if (!Array.isArray(data)) {
      continue;
    }

    const first = data[0] as Record<string, unknown> | undefined;
    const insightItems = (first?.insights as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];

    for (const item of insightItems) {
      const name = typeof item.name === "string" ? item.name : "Metric";
      const timeRange = typeof item.time_range === "string" ? item.time_range : "overall";
      const period = typeof item.period === "string" ? item.period : undefined;
      const totalValue = item.total_value as { value?: string | number; breakdowns?: { dimension_key?: string; results?: Array<Record<string, unknown>> } } | undefined;
      const breakdowns: MetricBreakdown[] = [];

      const rawBreakdowns = totalValue?.breakdowns;
      if (rawBreakdowns?.dimension_key && Array.isArray(rawBreakdowns.results)) {
        breakdowns.push({
          dimensionKey: rawBreakdowns.dimension_key,
          results: rawBreakdowns.results.map((result) => ({
            dimensionValue:
              typeof result.dimension_value === "string"
                ? result.dimension_value
                : "Unknown",
            value:
              typeof result.value === "number" || typeof result.value === "string"
                ? result.value
                : undefined,
            percentage:
              typeof result.percentage === "number" ? result.percentage : undefined,
          })),
        });
      }

      metrics.push({
        name,
        timeRange,
        period,
        value:
          typeof totalValue?.value === "number" || typeof totalValue?.value === "string"
            ? totalValue.value
            : undefined,
        breakdowns,
      });
    }
  }

  return metrics;
}

function MetricCard({ metric }: { metric: MetricEntry }) {
  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "1rem",
        background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.92))",
        color: "#e6eef8",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
            {prettyLabel(metric.name)}
          </p>
          <h3 style={{ margin: "0.3rem 0 0", fontSize: "1.35rem" }}>{formatMetricValue(metric.value)}</h3>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", opacity: 0.8 }}>
          <div>{prettyLabel(metric.timeRange)}</div>
          {metric.period ? <div>{prettyLabel(metric.period)}</div> : null}
        </div>
      </div>

      {metric.breakdowns.length ? (
        <div style={{ marginTop: "0.95rem", display: "grid", gap: "0.75rem" }}>
          {metric.breakdowns.map((breakdown) => (
            <section
              key={`${metric.name}-${metric.timeRange}-${breakdown.dimensionKey}`}
              style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: "12px",
                padding: "0.85rem",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.65rem" }}>
                <strong style={{ fontSize: "0.9rem" }}>{prettyLabel(breakdown.dimensionKey)}</strong>
                <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>Breakdown</span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {breakdown.results.map((result) => (
                  <div
                    key={`${result.dimensionValue}-${metric.name}-${breakdown.dimensionKey}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.65rem 0.8rem",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{result.dimensionValue}</div>
                      <div style={{ fontSize: "0.78rem", opacity: 0.72 }}>
                        {result.value !== undefined ? `Value: ${formatMetricValue(result.value)}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                      {result.percentage !== undefined
                        ? `${result.percentage.toFixed(1)}%`
                        : result.value !== undefined
                          ? formatMetricValue(result.value)
                          : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </article>
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
          const breakdowns = (item.total_value as { breakdowns?: { dimension_key?: string; results?: Array<Record<string, unknown>> } } | undefined)?.breakdowns;
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

              {breakdowns?.dimension_key && Array.isArray(breakdowns.results) ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(15,23,42,0.55)" }}>
                    {prettyLabel(breakdowns.dimension_key)}
                  </div>
                  <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.5rem" }}>
                    {breakdowns.results.map((result) => (
                      <div
                        key={`${response.type}-${item.name}-${breakdowns.dimension_key}-${result.dimensionValue}`}
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
  const [marketplaceData, setMarketplaceData] = useState<CreatorMarketplaceResultDebug | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [session, setSession] = useState<SessionState>({ authenticated: false });
  const metrics = useMemo(() => extractMetricsFromResponses(marketplaceData?.rawApiResponses), [marketplaceData]);
  const creatorDetails = marketplaceData?.rawApiResponses?.find((response) => (response as RawApiResponse).type === "insights_by_username_requested") as RawApiResponse | undefined;

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
    setMarketplaceData(null);
    setError(null);
    router.replace("/login");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.authenticated) {
      setError("Please login with Facebook first.");
      return;
    }

    if (!username) {
      setError("Please enter an Instagram username.");
      return;
    }

    setLoading(true);
    setError(null);
    setMarketplaceData(null);

    try {
      const queryValue = queryInput.trim();
      const params = new URLSearchParams({
        username,
        include_insights: "true",
        include_media: "false",
        limit: "10",
      });

      if (queryValue) {
        params.set("query", queryValue);
      }

      const endpoint = `/api/creator-marketplace?${params.toString()}`;

      const response = await fetch(endpoint);
      const payload = (await response.json()) as CreatorMarketplaceResult | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Unable to load creators.");
        return;
      }

      setMarketplaceData(payload as CreatorMarketplaceResult);
    } catch {
      setError("Could not reach the API route. Check local server logs.");
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    if (!marketplaceData?.creators?.length) {
      return;
    }

    const insightKeys = Array.from(
      new Set(marketplaceData.creators.flatMap((creator) => Object.keys(creator.insights ?? {}))),
    );

    const headers = ["id", "username", "country", "gender", "isMock", ...insightKeys];
    const rows = marketplaceData.creators.map((creator) => {
      const base = [
        creator.id,
        creator.username,
        creator.country,
        creator.gender,
        String(creator.isMock),
      ];

      const insightValues = insightKeys.map((key) => String(creator.insights?.[key] ?? ""));
      return [...base, ...insightValues];
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
              Instagram Username
            </label>
            <textarea
              id="username"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="example: dr_nishaa"
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

        {marketplaceData ? (
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
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Username</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>@{marketplaceData.discoveredCreatorUsername || username || "-"}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Creator ID</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{marketplaceData.discoveredCreatorId || "-"}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Country</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{marketplaceData.creators?.[0]?.country || "-"}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Gender</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{marketplaceData.creators?.[0]?.gender || "-"}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Insight Calls</div>
                <div style={{ marginTop: "0.25rem", fontSize: "1.1rem", fontWeight: 700 }}>{metrics.length}</div>
              </div>
            </div>

            {marketplaceData.insightsLookupExplanation ? (
              <p style={{ margin: "0 0 1rem", color: "rgba(15,23,42,0.7)" }}>{marketplaceData.insightsLookupExplanation}</p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ padding: "0.95rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Request</div>
                <div style={{ marginTop: "0.3rem", fontWeight: 700 }}>{marketplaceData.request?.username ? `@${String(marketplaceData.request.username)}` : "-"}</div>
                <div style={{ marginTop: "0.2rem", fontSize: "0.82rem", opacity: 0.7 }}>
                  Query: {String(marketplaceData.request?.query ?? "") || "(empty)"}
                </div>
              </div>
              <div style={{ padding: "0.95rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Limit</div>
                <div style={{ marginTop: "0.3rem", fontWeight: 700 }}>{String(marketplaceData.request?.limit ?? "-")}</div>
                <div style={{ marginTop: "0.2rem", fontSize: "0.82rem", opacity: 0.7 }}>
                  Include insights: {marketplaceData.request?.includeInsights ? "yes" : "no"}
                </div>
              </div>
              <div style={{ padding: "0.95rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Capture</div>
                <div style={{ marginTop: "0.3rem", fontWeight: 700, wordBreak: "break-word" }}>{marketplaceData.rawCapturePath ?? "(none)"}</div>
              </div>
              <div style={{ padding: "0.95rem", borderRadius: "14px", background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <div style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>Lookup</div>
                <div style={{ marginTop: "0.3rem", fontWeight: 700 }}>{marketplaceData.insightsLookupMethod ?? "-"}</div>
                <div style={{ marginTop: "0.2rem", fontSize: "0.82rem", opacity: 0.7 }}>
                  {marketplaceData.rawApiResponses?.length ?? 0} API calls
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.75rem" }}>Metrics Overview</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "0.85rem",
                }}
              >
                {metrics.map((metric, index) => (
                  <MetricCard key={`${metric.name}-${metric.timeRange}-${index}`} metric={metric} />
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.9rem",
              }}
            >
              {marketplaceData.creators.map((creator) => (
                <article
                  key={`${creator.id}-${creator.username}`}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    padding: "0.9rem",
                    background: "#fff",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>@{creator.username || "unknown"}</h3>
                  <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", opacity: 0.8 }}>
                    ID: {creator.id || "-"}
                  </p>
                  <p style={{ margin: "0.35rem 0", fontSize: "0.85rem" }}>
                    {creator.country || "-"} · {creator.gender || "-"}
                  </p>
                  {creator.isMock ? (
                    <p style={{ margin: "0.35rem 0", fontSize: "0.8rem", color: "#8a5a00" }}>
                      Mock profile
                    </p>
                  ) : null}
                  <p style={{ margin: "0.45rem 0 0", fontSize: "0.8rem", opacity: 0.8 }}>
                    Reach: {String(creator.insights.creator_reach ?? "-")}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", opacity: 0.8 }}>
                    Followers: {String(creator.insights.total_followers ?? "-")}
                  </p>
                </article>
              ))}
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
                  {(marketplaceData.rawApiResponses ?? []).map((response, index) => (
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
