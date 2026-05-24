import { Plus, Upload, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCurrentUser } from "@/lib/auth/server";
import { getListData, type UiSearchParams } from "@/lib/ui/data";
import { generateLeadsAction } from "./actions";

const leadCounts = ["1", "3", "5", "10", "15", "20", "30", "50", "100", "150", "custom"];

export default async function LeadsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const leads = await getListData(user.id, "leads");
  const generated = typeof params.generated === "string" ? params.generated : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Leads"
        title="Your leads"
        description="Generate leads or import a CSV. Enrichment and research run server-side and save results securely."
        actions={<a className="btn" href="/leads/import"><Upload size={16} /> Import CSV</a>}
      />

      <div id="generate-leads" />
      <GlassCard>
        <SectionHeader title="Generate leads" description="Veldo finds leads and adds research context behind the scenes." action={<Users size={18} color="var(--blue)" />} />
        {generated ? <div className="api-key-message">{generated} leads saved.</div> : null}
        {error ? <div className="api-key-message error">{decodeURIComponent(error)}</div> : null}
        <form className="lead-generator" action={generateLeadsAction}>
          <div className="lead-count-picker">
            {leadCounts.map((count) => (
              <label className="select-pill" key={count}>
                <input type="radio" name="lead_count" value={count} defaultChecked={count === "10"} />
                <span>{count === "custom" ? "Custom" : count}</span>
              </label>
            ))}
          </div>
          <div className="grid cols-4">
            <div className="field"><label htmlFor="custom_count">Custom amount</label><input id="custom_count" name="custom_count" type="number" min="1" max="500" placeholder="250" /></div>
            <div className="field"><label htmlFor="keywords">ICP / keywords</label><input id="keywords" name="keywords" defaultValue="B2B SaaS revenue leaders" /></div>
            <div className="field"><label htmlFor="location">Location</label><input id="location" name="location" defaultValue="America" /></div>
            <div className="field"><label htmlFor="titles">Titles</label><input id="titles" name="titles" defaultValue="Founder, VP Sales, Head of Growth" /></div>
          </div>
          <button className="btn primary" type="submit"><Plus size={16} /> Generate leads</button>
        </form>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Leads found" />
        <DataTable
          headers={["Lead", "Email", "Status", "Confidence", "Progress"]}
          rows={leads.map((lead) => {
            const name = getLeadName(lead);
            return [
              <span className="lead-person"><span className="lead-avatar">{initials(name)}</span><strong>{name}</strong></span>,
              lead.email,
              <StatusPill status={lead.status ?? lead.stage ?? "found"} />,
              lead.score ?? lead.fit_score ?? "Pending",
              progressText(lead),
            ];
          })}
          empty={<EmptyState title="No leads yet" description="Generate leads or import a CSV to start building your outreach list." action={<a className="btn primary" href="#generate-leads">Generate leads</a>} />}
        />
      </GlassCard>
    </PageShell>
  );
}

function getLeadName(lead: Record<string, unknown>) {
  const full = typeof lead.full_name === "string" && lead.full_name.trim() ? lead.full_name : `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
  return full || String(lead.email ?? "Unknown lead");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "L";
}

function progressText(lead: Record<string, unknown>) {
  const enrichment = String(lead.enrichment_status ?? "not_started");
  if (String(lead.status ?? "").includes("sent")) return "Email sent";
  if (String(lead.stage ?? "") === "drafted") return "Personalized draft ready";
  if (enrichment === "completed") return "Enriched and ready";
  if (enrichment === "queued") return "Enrichment queued";
  if (enrichment === "failed") return "Enrichment failed";
  return "Lead found";
}
