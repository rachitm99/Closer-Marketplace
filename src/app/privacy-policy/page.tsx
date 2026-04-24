import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Closer Creator Dashboard",
  description: "Privacy policy for Closer Creator Dashboard operated by Closer Ventures Pvt. Ltd.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: April 24, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Closer Ventures Pvt. Ltd. (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the Closer Creator Dashboard (the &ldquo;Service&rdquo;).
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service,
            including our integration with Meta Platforms, Inc. (&ldquo;Meta&rdquo;) products and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          <p className="mb-4">We may collect the following types of information:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Personal Data:</strong> When you connect your Meta account, we collect your Instagram username, user ID, and public profile information as permitted by Meta&apos;s Graph API and your privacy settings.</li>
            <li><strong>Usage Data:</strong> We collect information about how you access and use the Service, including IP address, browser type, device information, and pages visited.</li>
            <li><strong>Cookies:</strong> We use cookies to maintain your session and remember your preferences.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="mb-4">We use the collected information for:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Providing and maintaining the Service</li>
            <li>Displaying Instagram username insights and analytics as requested</li>
            <li>Authenticating your Meta account session</li>
            <li>Improving and optimizing the Service</li>
            <li>Complying with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
          <p className="mb-4">We do not sell your personal information. We may share information with:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Meta:</strong> As required to provide Service functionality via Meta Graph API, in accordance with Meta&apos;s Data Policy and Platform Terms.</li>
            <li><strong>Service Providers:</strong> Third-party vendors who assist us in operating the Service, bound by confidentiality agreements.</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy.
            You may request deletion of your data at any time by contacting us using the details below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Your Data Rights</h2>
          <p className="mb-4">Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access the personal information we hold about you</li>
            <li>Request correction or deletion of your personal information</li>
            <li>Object to or restrict processing of your personal information</li>
            <li>Withdraw consent for Meta data access at any time via your Meta account settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Security of Your Information</h2>
          <p>
            We implement reasonable technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction.
            However, no internet transmission is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last Updated&rdquo; date.
            You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or your data rights, please contact us:
          </p>
          <ul className="list-disc pl-6 mt-4">
            <li>By email: privacy@closerventures.com (replace with your actual contact email)</li>
            <li>By mail: Closer Ventures Pvt. Ltd., [Your Company Address]</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
