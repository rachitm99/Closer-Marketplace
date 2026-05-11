"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type SessionState = {
  authenticated: boolean;
  userId?: string;
  userName?: string;
  expiresAt?: number;
};

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState>({ authenticated: false });

  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function checkAndMaybeRedirect() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = (await response.json()) as SessionState;
        if (cancelled) return;
        setSession(payload);

        if (payload.authenticated && pathname !== "/dashboard") {
          router.replace("/dashboard");
        }
      } catch {
        if (!cancelled) setSession({ authenticated: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void checkAndMaybeRedirect();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return (
    <div className="app-shell">
      <main className="dashboard-wrap">
        <section className="hero">
          <p className="eyebrow">Creator Marketplace</p>
          <h1>Sign in</h1>
          <p className="hero-copy">Login first, then open the dashboard to search creators.</p>
        </section>

        <section className="query-card">
          {loading ? <p>Checking session...</p> : null}

          {!loading && !session.authenticated ? (
            <a href="/api/auth/facebook/login" className="submit-btn auth-link">
              Login with Facebook
            </a>
          ) : null}
        </section>
      </main>
    </div>
  );
}
