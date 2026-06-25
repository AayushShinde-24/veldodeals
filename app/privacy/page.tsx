import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Veldo",
  description: "How Veldo collects, uses, shares, and protects personal data.",
};

const sections = [
  { id: "scope", heading: "1. Scope" },
  { id: "collect", heading: "2. Information we collect" },
  { id: "use", heading: "3. How we use data" },
  { id: "bases", heading: "4. Legal bases" },
  { id: "share", heading: "5. How we share data" },
  { id: "ai", heading: "6. AI processing" },
  { id: "recipients", heading: "7. Outreach recipients" },
  { id: "retention", heading: "8. Retention" },
  { id: "security", heading: "9. Security" },
  { id: "transfers", heading: "10. International transfers" },
  { id: "rights", heading: "11. Your rights" },
  { id: "children", heading: "12. Children" },
  { id: "changes", heading: "13. Changes" },
  { id: "contact", heading: "14. Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="June 24, 2026"
      sections={sections}
      intro="This Privacy Policy explains how Veldo, Inc. (“Veldo”, “we”, “us”) collects, uses, discloses, and safeguards personal data when you use our websites, applications, and AI-assisted sales and fundraising platform (the “Service”). We act as a data controller for account and usage data, and as a data processor for the contact data you upload or generate to run outreach."
    >
      <h2 id="scope">1. Scope</h2>
      <p>This policy applies to all users of the Service, visitors to our websites, and individuals whose information is processed through the Service. It does not apply to third-party websites or services that we do not control.</p>

      <h2 id="collect">2. Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li><strong>Account &amp; profile data:</strong> name, work email, password credentials, company name, role, and workspace settings.</li>
        <li><strong>Billing data:</strong> plan, billing contact, and payment identifiers processed by our payment provider (we do not store full card numbers).</li>
        <li><strong>Customer content:</strong> the leads, contacts, campaigns, message templates, prompts, and notes you create or upload, including B2B contact data.</li>
        <li><strong>Support communications:</strong> messages you send to us and their contents.</li>
      </ul>
      <h3>Information we collect automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> features used, actions taken, credits consumed, agent activity, timestamps, and approximate location derived from IP.</li>
        <li><strong>Device &amp; log data:</strong> IP address, browser type, device identifiers, and diagnostic logs.</li>
        <li><strong>Cookies:</strong> essential cookies for authentication and session integrity, and limited analytics cookies. See our cookie controls in-product.</li>
      </ul>
      <h3>Information from integrations</h3>
      <ul>
        <li><strong>Connected accounts:</strong> when you connect email (e.g., Google), calendar, CRM, or data providers, we process the tokens, message metadata, and records needed to deliver the Service, subject to each provider’s permissions.</li>
        <li><strong>Enrichment data:</strong> business firmographic and contact information sourced through licensed providers to support research and ICP scoring.</li>
      </ul>

      <h2 id="use">3. How we use data</h2>
      <ul>
        <li>Provide, operate, secure, and improve the Service and its AI agents.</li>
        <li>Research accounts, score fit, personalize drafts, run quality gates, send approved messages, and classify replies.</li>
        <li>Meter credits, process billing, and prevent fraud and abuse.</li>
        <li>Provide support, send service notices, and—where permitted—relevant product updates.</li>
        <li>Comply with legal obligations and enforce our Terms and Acceptable Use Policy.</li>
      </ul>

      <h2 id="bases">4. Legal bases (EEA/UK)</h2>
      <p>Where the GDPR or UK GDPR applies, we rely on: performance of a contract (to provide the Service); legitimate interests (to secure, improve, and market the Service in a balanced way); consent (where required, e.g., certain cookies); and legal obligation. You may object to processing based on legitimate interests as described below.</p>

      <h2 id="share">5. How we share data</h2>
      <p>We do not sell personal data. We share it only with:</p>
      <ul>
        <li><strong>Subprocessors</strong> that host, secure, and operate the Service (cloud hosting, database, email delivery, analytics, payment, and AI model providers), under contractual confidentiality and data-protection terms.</li>
        <li><strong>AI model providers</strong> strictly to generate outputs you request; we use providers that do not train their models on our customers’ business data by default.</li>
        <li><strong>Your connected services</strong> at your direction (e.g., your mailbox or CRM).</li>
        <li><strong>Legal &amp; safety</strong> recipients when required by law or to protect rights, safety, and the integrity of the Service.</li>
        <li><strong>Business transfers</strong> in connection with a merger, acquisition, or asset sale, with notice where required.</li>
      </ul>
      <p>A current list of subprocessors is available on request at <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>.</p>

      <h2 id="ai">6. AI processing and automated decisions</h2>
      <p>The Service uses AI agents to research, score, draft, and classify. AI outputs can be imperfect; you remain responsible for reviewing content and configuring how autonomously the Service operates. You can set approval gates so that messages are reviewed before sending. We do not use your customer content to train foundation models, and our AI providers process it only to return results to you.</p>

      <h2 id="recipients">7. Data about outreach recipients</h2>
      <p>When you use Veldo to contact prospects, you are the controller of that B2B contact data and are responsible for having a lawful basis to process and contact them. We process recipient data on your behalf to enable research, sending, suppression, and unsubscribe handling. Recipients may exercise their rights by contacting you or us at <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>, and we will route requests appropriately and honor suppression and unsubscribe requests across the Service.</p>

      <h2 id="retention">8. Retention</h2>
      <p>We retain personal data for as long as your account is active and as needed to provide the Service, then delete or anonymize it within a commercially reasonable period, except where longer retention is required for legal, tax, security, or dispute-resolution purposes. Suppression and unsubscribe records are retained to honor opt-outs.</p>

      <h2 id="security">9. Security</h2>
      <p>We use encryption in transit, access controls, least-privilege practices, audit logging, and regular review of our infrastructure. No system is perfectly secure; we encourage strong, unique credentials and use of available security features. See our <a href="/security">Security</a> overview for details.</p>

      <h2 id="transfers">10. International transfers</h2>
      <p>We may process data in countries other than your own. Where we transfer personal data internationally, we use appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms.</p>

      <h2 id="rights">11. Your privacy rights</h2>
      <p>Depending on your location, you may have rights to access, correct, delete, port, restrict, or object to processing of your personal data, and to withdraw consent. California residents have rights under the CCPA/CPRA, including the right to know and delete, and to opt out of “sharing” for cross-context advertising (we do not engage in such sharing). To exercise rights, use in-product controls or email <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>. You may also lodge a complaint with your supervisory authority. See our <a href="/data-deletion">Data Deletion</a> page for deletion specifics.</p>

      <h2 id="children">12. Children</h2>
      <p>The Service is intended for business use by individuals 18 and older. We do not knowingly collect personal data from children.</p>

      <h2 id="changes">13. Changes to this policy</h2>
      <p>We may update this policy from time to time. Material changes will be notified through the Service or by email. The “Last updated” date reflects the latest revision.</p>

      <h2 id="contact">14. Contact us</h2>
      <p>Questions or requests? Email <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>. For data deletion, see <a href="/data-deletion">Data Deletion</a>.</p>
    </LegalLayout>
  );
}
