import { getAuthSession } from "@/lib/auth-session";
import Link from "next/link";

const platformDataUses = [
  "Clients search Instagram creators by username for campaign discovery",
  "Clients review creator profiles and insights inside their workspace",
  "Teams compare creators and shortlist for campaign proposals",
  "Clients export creator research and notes for approvals",
];

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div className="app-shell landing-shell">
      <main className="dashboard-wrap landing-wrap">
        <section className="hero landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">Closer Creator Platform</p>
            <h1>A creator discovery platform for client teams and agencies.</h1>
            <p className="hero-copy">
              Closer is a multi-tenant SaaS platform that lets client businesses search Instagram
              creators, review profile insights, and build campaign shortlists inside their own
              workspace. Each client gets their own login, data views, and exports.
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
              <li>Agency Clients</li>
              <li>Brand Teams</li>
              <li>Creator Ops</li>
            </ul>
            <p className="hero-panel-copy">
              Designed for client businesses that need a secure, self-serve creator discovery
              platform with shared workflows.
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
            <h2>Closer Ventures — a SaaS tech provider for creator discovery.</h2>
            <p style={{ marginBottom: 0 }}>
              We provide a client-facing platform used by multiple businesses to manage creator
              research, campaign planning, and influencer evaluation.
            </p>
          </article>
        </section>

        <section className="section-block landing-card">
          <p className="eyebrow">Data usage</p>
          <h2>Platform Data is used only to deliver the client product.</h2>
          <p>
            Platform Data is used inside the Closer product to help client teams research creators,
            build shortlists, and plan campaigns. Data is not resold or used outside client
            workspaces.
          </p>
        </section>
      </main>
    </div>
  );
}
