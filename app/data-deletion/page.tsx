import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal";

export const metadata: Metadata = {
  title: "Data Deletion — Veldo",
  description: "How to delete your data and what happens when you do.",
};

const sections = [
  { id: "overview", heading: "1. Overview" },
  { id: "what", heading: "2. What you can delete" },
  { id: "how", heading: "3. How to request deletion" },
  { id: "recipients", heading: "4. Recipient data" },
  { id: "timeline", heading: "5. Timeline" },
  { id: "retain", heading: "6. What we retain" },
  { id: "integrations", heading: "7. Connected accounts" },
  { id: "contact", heading: "8. Contact" },
];

export default function DataDeletionPage() {
  return (
    <LegalLayout
      title="Data Deletion"
      updated="June 24, 2026"
      sections={sections}
      intro="You are in control of your data. This page explains exactly what you can delete, how to request it, how long it takes, and the limited records we are required to keep. It complements your rights described in our Privacy Policy."
    >
      <h2 id="overview">1. Overview</h2>
      <p>You can delete individual records, entire workspaces, or your whole account. When you delete data, we remove it from active systems and schedule it for deletion from backups on our standard cycle.</p>

      <h2 id="what">2. What you can delete</h2>
      <ul>
        <li><strong>Leads &amp; contacts</strong> — individually or in bulk.</li>
        <li><strong>Campaigns</strong> — including drafts, sequences, and associated activity.</li>
        <li><strong>Integration data</strong> — disconnect mailboxes, calendars, CRMs, and data providers, revoking stored tokens.</li>
        <li><strong>Workspace data</strong> — all leads, campaigns, analytics, and members within a workspace.</li>
        <li><strong>Account &amp; profile</strong> — your user account and personal profile data.</li>
        <li><strong>Usage &amp; analytics</strong> — derived activity records tied to your account, subject to the limited retention noted below.</li>
      </ul>

      <h2 id="how">3. How to request deletion</h2>
      <ul>
        <li><strong>In-product:</strong> use the delete controls in Settings → Workspace and in each Leads/Campaigns view. Workspace owners can delete an entire workspace.</li>
        <li><strong>Email:</strong> send a request from your account email to <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a> with the scope of deletion. We may verify your identity before acting.</li>
      </ul>

      <h2 id="recipients">4. Deleting data about outreach recipients</h2>
      <p>If you are an individual who was contacted through Veldo and want your data deleted or suppressed, use the unsubscribe link in the message or contact <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>. Because the sender (our customer) controls that data, we will route your request to them and honor unsubscribe and suppression across the platform.</p>

      <h2 id="timeline">5. Timeline</h2>
      <p>Deletions from active systems are processed promptly, typically within a few days and no later than 30 days. Residual copies in encrypted backups are purged on our regular backup rotation (generally within 90 days).</p>

      <h2 id="retain">6. What we retain and why</h2>
      <p>We retain a limited set of records where required for legitimate or legal reasons, including:</p>
      <ul>
        <li><strong>Suppression &amp; unsubscribe records</strong> — to ensure we continue honoring opt-outs.</li>
        <li><strong>Billing &amp; tax records</strong> — to meet financial and legal obligations.</li>
        <li><strong>Security &amp; abuse logs</strong> — to protect the Service and investigate misuse.</li>
      </ul>
      <p>Such records are minimized and kept only as long as necessary.</p>

      <h2 id="integrations">7. Connected accounts</h2>
      <p>Disconnecting an integration revokes the tokens we hold. You may also revoke access directly from the provider (for example, your Google Account security settings). Disconnecting stops further processing through that integration.</p>

      <h2 id="contact">8. Contact</h2>
      <p>Need help with a deletion request? Email <a href="mailto:privacy@veldo.ai">privacy@veldo.ai</a>. For more on your rights, see our <a href="/privacy">Privacy Policy</a>.</p>
    </LegalLayout>
  );
}
