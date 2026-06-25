import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Veldo",
  description: "The rules for using Veldo responsibly and lawfully.",
};

const sections = [
  { id: "purpose", heading: "1. Purpose" },
  { id: "permitted", heading: "2. Permitted use" },
  { id: "prohibited", heading: "3. Prohibited conduct" },
  { id: "data", heading: "4. Data sourcing standards" },
  { id: "outreach", heading: "5. Outreach & anti-spam" },
  { id: "fundraising", heading: "6. Fundraising communications" },
  { id: "deliverability", heading: "7. Volume & deliverability" },
  { id: "enforcement", heading: "8. Enforcement" },
  { id: "report", heading: "9. Reporting abuse" },
];

export default function AcceptableUsePage() {
  return (
    <LegalLayout
      title="Acceptable Use Policy"
      updated="June 24, 2026"
      sections={sections}
      intro="This Acceptable Use Policy (“AUP”) sets the rules for using Veldo. It exists to keep the platform trustworthy, protect recipients, and preserve deliverability for everyone. It is part of our Terms of Service, and violations may result in suspension or termination."
    >
      <h2 id="purpose">1. Purpose</h2>
      <p>Veldo is built for legitimate, relevant business-to-business outreach and fundraising. You agree to use it lawfully, honestly, and respectfully toward the people you contact.</p>

      <h2 id="permitted">2. Permitted use</h2>
      <ul>
        <li>Contacting businesses and professionals with a genuine, relevant reason related to your products, services, or fundraise.</li>
        <li>Using accurate sender identity and a working reply path.</li>
        <li>Honoring opt-outs, suppression lists, and recipient preferences promptly.</li>
      </ul>

      <h2 id="prohibited">3. Prohibited content and conduct</h2>
      <p>You must not use Veldo to:</p>
      <ul>
        <li>Send spam, bulk unsolicited messages without a lawful basis, or messages to purchased low-quality lists.</li>
        <li>Use deceptive subject lines, false sender identities, spoofed headers, or misleading claims.</li>
        <li>Promote illegal goods or services, fraud, scams, pyramid or “get-rich-quick” schemes.</li>
        <li>Harass, threaten, defame, or target individuals; send hateful, sexual, or abusive content.</li>
        <li>Collect, upload, or use data obtained unlawfully, including data scraped from sources in violation of their terms, or sensitive personal data without a lawful basis.</li>
        <li>Send to individuals (consumers) where prohibited, or process special-category/protected data without proper basis.</li>
        <li>Distribute malware, phishing links, or attempt to compromise systems or recipients.</li>
        <li>Infringe intellectual property or violate the privacy or rights of others.</li>
        <li>Circumvent rate limits, suppression controls, security features, or attempt to misuse credits.</li>
      </ul>

      <h2 id="data">4. Data sourcing standards</h2>
      <p>You are responsible for ensuring you have a lawful basis to process and contact every recipient. Do not import data you are not permitted to use. Maintain records of consent or legitimate interest where required, and keep contact data accurate and up to date.</p>

      <h2 id="outreach">5. Outreach and anti-spam compliance</h2>
      <p>You must comply with all applicable laws, including CAN-SPAM (US), GDPR and the ePrivacy rules (EU/EEA), PECR (UK), CASL (Canada), and similar regimes. At a minimum, you must:</p>
      <ul>
        <li>Identify yourself truthfully and include a valid physical or business address where required.</li>
        <li>Provide a clear, working unsubscribe mechanism and honor opt-outs without delay.</li>
        <li>Not email recipients who have unsubscribed or are on suppression lists.</li>
        <li>Respect jurisdictional consent requirements before contacting recipients.</li>
      </ul>

      <h2 id="fundraising">6. Fundraising communications</h2>
      <p>Investor outreach must comply with applicable securities laws. Do not make guarantees of returns, misrepresent risk, or make unlawful solicitations. Veldo may flag drafts that appear non-compliant for your review. Veldo does not provide legal, investment, or tax advice.</p>

      <h2 id="deliverability">7. Volume, rate, and deliverability</h2>
      <p>Use sensible sending volumes and warm-up practices. We may apply rate limits and quality gates to protect deliverability and the shared reputation of the platform. Repeated spam complaints, high bounce rates, or blocklisting may trigger throttling, review, or suspension.</p>

      <h2 id="enforcement">8. Enforcement</h2>
      <p>We may investigate suspected violations and take action including warning, throttling, feature restriction, suspension, or termination, and may remove offending content or report unlawful activity to authorities. We aim to act proportionately and, where appropriate, give notice.</p>

      <h2 id="report">9. Reporting abuse</h2>
      <p>To report misuse of the platform or a message you received, contact <a href="mailto:abuse@veldo.ai">abuse@veldo.ai</a>. To stop receiving messages sent through Veldo, use the unsubscribe link in the message or see <a href="/unsubscribe">Unsubscribe</a>.</p>
    </LegalLayout>
  );
}
