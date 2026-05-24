import { Mail, ShieldAlert, UserCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getOperationalData } from "@/lib/ui/data";

export default async function PersonalizationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getOperationalData(user.id);
  const drafts = [...data.generatedEmails, ...data.canonicalEmails];

  return (
    <PageShell>
      <PageHeader eyebrow="Personalization" title="Lead personalization records" description="Click into each lead's row to review the written personalized email, safety status, and send state." />
      <GlassCard>
        <SectionHeader title="Personalized lead records" description="This is the working record for lead-specific copy, not a placeholder strategy board." action={<Mail size={18} color="var(--cyan)" />} />
        <DataTable
          headers={["Lead", "Company", "Email written", "Status", "Personalization / body"]}
          rows={data.leads.map((lead) => {
            const draft = drafts.find((item) => item.lead_id === lead.id);
            return [
              <span className="lead-person"><span className="lead-avatar">{initials(getLeadName(lead))}</span><strong>{getLeadName(lead)}</strong></span>,
              lead.company,
              draft ? "Yes" : "No",
              <StatusPill status={draft?.status ?? draft?.approval_status ?? lead.stage ?? "found"} />,
              <details className="lead-detail">
                <summary>Open record</summary>
                <div>
                  <p><strong>Subject:</strong> {draft?.subject ?? draft?.subject_1 ?? "No draft yet"}</p>
                  <p>{draft?.body ?? draft?.email_body ?? "Run personalization/email agents to create this lead's draft."}</p>
                  {draft?.personalization_reason ? <p><strong>Why:</strong> {draft.personalization_reason}</p> : null}
                </div>
              </details>,
            ];
          })}
          empty={<EmptyState icon={UserCircle} title="No leads to personalize" description="Generate or import leads first, then Veldo will attach personalized drafts and send records here." />}
        />
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Safety posture" description="The personalization agent stays active, but high-risk or unverifiable context is blocked before sending." action={<ShieldAlert size={18} color="var(--warning)" />} />
        <div className="premium-list-row"><span>Private social/browsing data</span><StatusPill status="blocked" /></div>
        <div className="premium-list-row"><span>Weak public signals</span><StatusPill status="needs_review" /></div>
        <div className="premium-list-row"><span>Approved business facts</span><StatusPill status="active" /></div>
      </GlassCard>
    </PageShell>
  );
}

function getLeadName(lead: Record<string, unknown>) {
  return String(lead.full_name || `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.email || "Unknown lead");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "L";
}
