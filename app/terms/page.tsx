import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Veldo",
  description: "The terms governing your use of the Veldo platform.",
};

const sections = [
  { id: "agreement", heading: "1. Agreement" },
  { id: "accounts", heading: "2. Accounts" },
  { id: "service", heading: "3. The Service" },
  { id: "credits", heading: "4. Plans, credits & billing" },
  { id: "fees", heading: "5. Deal fees" },
  { id: "customer-data", heading: "6. Customer data & responsibilities" },
  { id: "ai", heading: "7. AI outputs" },
  { id: "ip", heading: "8. Intellectual property" },
  { id: "thirdparty", heading: "9. Third-party services" },
  { id: "disclaimer", heading: "10. Disclaimers" },
  { id: "liability", heading: "11. Limitation of liability" },
  { id: "indemnity", heading: "12. Indemnification" },
  { id: "term", heading: "13. Term & termination" },
  { id: "law", heading: "14. Governing law" },
  { id: "contact", heading: "15. Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="June 24, 2026"
      sections={sections}
      intro="These Terms of Service (“Terms”) are a binding agreement between Veldo, Inc. (“Veldo”) and the individual or entity that registers for or uses the Service (“you”, “Customer”). By creating an account or using the Service, you agree to these Terms. If you are agreeing on behalf of an organization, you represent that you are authorized to bind it."
    >
      <h2 id="agreement">1. Agreement</h2>
      <p>These Terms, together with our <a href="/privacy">Privacy Policy</a> and <a href="/acceptable-use">Acceptable Use Policy</a> (incorporated by reference), govern your use of the Service. If you do not agree, do not use the Service.</p>

      <h2 id="accounts">2. Accounts and eligibility</h2>
      <ul>
        <li>You must be at least 18 and able to form a binding contract.</li>
        <li>You are responsible for the accuracy of your registration information, for safeguarding your credentials, and for all activity under your account and workspace.</li>
        <li>Workspace owners are responsible for the members they invite and the credits they share.</li>
      </ul>

      <h2 id="service">3. The Service</h2>
      <p>Veldo provides an AI-assisted platform for B2B sales and fundraising, including lead research, scoring, personalization, message drafting, quality gates, sending through your connected channels, reply classification, and analytics. We may add, modify, or discontinue features over time. You control the level of autonomy at which the Service operates, including whether messages require your approval before sending.</p>

      <h2 id="credits">4. Plans, credits, and billing</h2>
      <ul>
        <li><strong>Plans &amp; credits.</strong> Paid plans include a monthly allotment of credits used to meter actions (e.g., leads, research, drafting, sending, voice). Credit costs and plan inclusions are described on our <a href="/pricing">Pricing</a> page and in-product.</li>
        <li><strong>Renewals.</strong> Subscriptions renew automatically for successive terms unless cancelled before the renewal date. You may cancel at any time, effective at the end of the current billing period.</li>
        <li><strong>Add-ons &amp; pay-as-you-go.</strong> Add-on credits and usage-based (API) pricing are billed as described at purchase. Unused monthly credits do not roll over unless stated.</li>
        <li><strong>Taxes.</strong> Fees are exclusive of taxes, which you are responsible for where applicable.</li>
        <li><strong>Refunds.</strong> Except where required by law, fees are non-refundable.</li>
      </ul>

      <h2 id="fees">5. Deal fees</h2>
      <p>Certain plans include a performance fee (e.g., 2.5%) on deals closed or capital raised through the Service, as described on the Pricing page and at sign-up. You agree to provide accurate information needed to calculate such fees and authorize their invoicing.</p>

      <h2 id="customer-data">6. Customer data and your responsibilities</h2>
      <ul>
        <li>You retain ownership of the data you submit (“Customer Data”). You grant Veldo a limited license to process it to provide and improve the Service.</li>
        <li>You are solely responsible for the legality of your outreach, including having a lawful basis to contact recipients and complying with all applicable laws (e.g., CAN-SPAM, GDPR/ePrivacy, CASL, TCPA, and securities laws for fundraising communications).</li>
        <li>You must use accurate sender identity, honor unsubscribe and suppression requests, and follow our <a href="/acceptable-use">Acceptable Use Policy</a>.</li>
        <li>Fundraising communications must comply with applicable securities regulations; Veldo flags certain drafts for review and does not provide legal, investment, or tax advice.</li>
      </ul>

      <h2 id="ai">7. AI outputs</h2>
      <p>AI-generated content may be inaccurate, incomplete, or unsuitable. You are responsible for reviewing outputs and for any messages you send. Veldo does not warrant any particular result, reply rate, deliverability, meeting, or deal outcome.</p>

      <h2 id="ip">8. Intellectual property</h2>
      <p>Veldo and its licensors own all rights in the Service, software, and brand. Subject to these Terms, we grant you a non-exclusive, non-transferable right to use the Service during your subscription. As between the parties, you own outputs generated for you from your Customer Data, subject to third-party model providers’ terms and applicable law. You may not copy, reverse engineer, resell, or build a competing service from the Service.</p>

      <h2 id="thirdparty">9. Third-party services</h2>
      <p>The Service integrates with third-party providers (e.g., email, calendar, CRM, data, payment, and AI providers). Your use of those services is governed by their terms, and we are not responsible for them.</p>

      <h2 id="disclaimer">10. Disclaimers</h2>
      <p>The Service is provided “as is” and “as available,” without warranties of any kind, whether express, implied, or statutory, including merchantability, fitness for a particular purpose, and non-infringement, to the maximum extent permitted by law.</p>

      <h2 id="liability">11. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, Veldo will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or goodwill. Our aggregate liability arising out of or relating to the Service will not exceed the amounts you paid to Veldo in the twelve (12) months preceding the event giving rise to the claim.</p>

      <h2 id="indemnity">12. Indemnification</h2>
      <p>You will defend and indemnify Veldo against claims, damages, and costs arising from your Customer Data, your outreach, your violation of law, or your breach of these Terms or the Acceptable Use Policy.</p>

      <h2 id="term">13. Term and termination</h2>
      <p>These Terms remain in effect while you use the Service. We may suspend or terminate access for breach, non-payment, or risk to the Service or others. You may stop using the Service and request deletion at any time (see <a href="/data-deletion">Data Deletion</a>). Provisions that by their nature should survive (e.g., fees owed, IP, disclaimers, liability limits) survive termination.</p>

      <h2 id="law">14. Governing law and disputes</h2>
      <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-laws rules. Disputes will be resolved in the state or federal courts located in Delaware, unless a separate written agreement provides otherwise. Nothing limits rights you have under mandatory local law.</p>

      <h2 id="contact">15. Contact</h2>
      <p>Questions about these Terms? Email <a href="mailto:legal@veldo.ai">legal@veldo.ai</a>.</p>
    </LegalLayout>
  );
}
