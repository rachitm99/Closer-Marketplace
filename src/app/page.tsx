import { getAuthSession } from "@/lib/auth-session";
import Link from "next/link";

const platformDataUses = [
  "Search Instagram creators by username during campaign discovery",
  "Review creator profiles and engagement insights for campaign fit",
  "Evaluate creator metrics to assess suitability for influencer campaigns",
  "Export creator research for client pitches and campaign planning",
];

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div className="app-shell landing-shell">
      <main className="dashboard-wrap landing-wrap">
        <section className="hero landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">Closer Ventures</p>
            <h1>Creator discovery and campaign planning for influencer marketing.</h1>
            <p className="hero-copy">
              Closer Ventures uses this dashboard to search Instagram creators, research profiles
              and insights, and evaluate influencers for client campaigns. Built for faster,
              smarter influencer marketing workflow.
            </p>
            <div className="cta-row">
              <Link href={session?.accessToken ? "/dashboard" : "/login"} className="submit-btn">
                {session?.accessToken ? "Open dashboard" : "Sign in with Facebook"}
              </Link>
              <Link href="/privacy-policy" className="secondary-btn landing-link">
                Privacy policy
              </Link>
            </div>
          </div>

          <aside className="hero-panel">
            <p className="hero-panel-label">Built for</p>
            <ul className="pill-list">
              <li>Influencer Marketing</li>
              <li>Campaign Planning</li>
              <li>Creator Research</li>
            </ul>
            <p className="hero-panel-copy">
              Designed for agencies that manage influencer campaigns and need fast,
              reliable creator discovery and research.
            </p>
          </aside>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">What the product does</p>
            <h2>Everything is built around creator search, review, and export.</h2>
          </div>

          <div className="feature-grid">
            <article className="landing-card">
              <h3>Find creators fast</h3>
              <p>
                Enter an Instagram username and review the creator profile that is relevant
                to the client brief.
              </p>
            </article>
            <article className="landing-card">
              <h3>Review insights</h3>
              <p>
                View profile details and campaign-related insights in a single place so teams
                can make quicker decisions.
              </p>
            </article>
            <article className="landing-card">
              <h3>Export for clients</h3>
              <p>
                Shortlist creators and export the results for internal approvals or client
                sharing.
              </p>
            </article>
          </div>
        </section>

        <section className="section-block split-grid">
          <article className="landing-card">
            <p className="eyebrow">Platform Data usage</p>
            <h2>Instagram creator insights for campaign research.</h2>
            <ul className="bullet-list">
              {platformDataUses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="landing-card">
            <p className="eyebrow">Our business</p>
            <h2>Closer Ventures — influencer marketing for brands.</h2>
            <p style={{ marginBottom: 0 }}>
              We help brands find and partner with the right creators. This dashboard is our
              internal tool for creator research, campaign planning, and influencer evaluation.
            </p>
          </article>
        </section>

        <section className="section-block landing-card">
          <p className="eyebrow">Data usage</p>
          <h2>Platform Data is used only for campaign research and planning.</h2>
          <p>
            We use Instagram insights to evaluate creator suitability for client campaigns.
            Creator data is research material for our influencer marketing business — never
            shared, sold, or used outside the scope of campaign planning.
          </p>
        </section>
      </main>
    </div>
  );
}
