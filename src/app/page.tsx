import { getAuthSession } from "@/lib/auth-session";
import Link from "next/link";

const platformDataUses = [
  "Search creators by Instagram username for a client brief",
  "Show creator profile details and creator insights in a dashboard",
  "Help clients review and shortlist creators for campaigns",
  "Export results for internal review, outreach, and record keeping",
];

const useCases = [
  "Creator discovery for agencies",
  "Campaign planning for consultancies",
  "Influencer workflows for SaaS marketing teams",
];

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div className="app-shell landing-shell">
      <main className="dashboard-wrap landing-wrap">
        <section className="hero landing-hero">
          <div className="landing-hero-copy">
            <p className="eyebrow">Closer Creator Dashboard</p>
            <h1>Creator discovery and campaign review for client-facing teams.</h1>
            <p className="hero-copy">
              Closer helps a tech provider or agency search Instagram creators, review
              profile information and campaign-relevant insights, and share results with
              clients in one clean workspace.
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
            <p className="hero-panel-label">Best for</p>
            <ul className="pill-list">
              <li>Agency</li>
              <li>Consultancy</li>
              <li>SaaS Platform</li>
            </ul>
            <p className="hero-panel-copy">
              Ideal for businesses that help clients discover creators, evaluate social
              profiles, and organize campaign research.
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
            <p className="eyebrow">How Platform Data is used</p>
            <h2>Used only to provide the creator discovery service.</h2>
            <ul className="bullet-list">
              {platformDataUses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="landing-card">
            <p className="eyebrow">Ideal business</p>
            <h2>A tech provider that manages creator workflows for clients.</h2>
            <ul className="bullet-list">
              {useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="section-block landing-card">
          <p className="eyebrow">Compliance and trust</p>
          <h2>Customer data is used to operate the service, not to sell or repurpose it.</h2>
          <p>
            The dashboard is designed for authenticated business use. Platform data is used
            to search creators, show relevant results to the client, and support campaign
            workflows on behalf of the business's customers.
          </p>
        </section>
      </main>
    </div>
  );
}
