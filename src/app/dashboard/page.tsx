"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [marketplaceData, setMarketplaceData] = useState<CreatorMarketplaceResult | null>(null);
  const [session, setSession] = useState<SessionState>({ authenticated: false });

  const username = useMemo(() => usernameInput.replace(/@/g, "").trim(), [usernameInput]);

  useEffect(() => {
    async function loadSession() {
      setAuthLoading(true);

      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionState;
        setSession(payload);
        if (!payload.authenticated) {
          router.replace("/login");
        }
      } catch {
        setSession({ authenticated: false });
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    }

    void loadSession();
  }, [router]);

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
      const endpoint = `/api/creator-marketplace?username=${encodeURIComponent(username)}&query=${encodeURIComponent(
        queryInput.trim(),
      )}&include_insights=true&include_media=false&limit=10`;

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
              <h2>Creators</h2>
              <button type="button" className="secondary-btn" onClick={onExportCsv}>
                Export CSV
              </button>
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
          </section>
        ) : null}
      </main>
    </div>
  );
}
