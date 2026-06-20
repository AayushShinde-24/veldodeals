import { Search, SlidersHorizontal, Target } from "lucide-react";
import { EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { findLeadsAction } from "./actions";

export default async function LeadFinderPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const campaigns = await getListData(userId, "campaigns");
  return (
    <PageShell>
      <PageHeader eyebrow="Lead finder" title="Find companies your agents can actually use" description="Build ICP filters, preview fit, and hand qualified leads to Campaign Leader." />
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="ICP filters" description="These fields shape lead search and downstream fit scoring." action={<SlidersHorizontal size={18} color="var(--blue)" />} />
          <form className="form" action={findLeadsAction}>
            <div className="field"><label htmlFor="campaign_id">Campaign</label><select id="campaign_id" name="campaign_id" required><option value="">Choose a campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></div>
            <div className="field"><label htmlFor="industry">Industry</label><input id="industry" name="industry" placeholder="B2B SaaS, Devtools, AI infrastructure" /></div>
            <div className="field"><label htmlFor="role">Role</label><input id="role" name="role" placeholder="Founder, VP Sales, Head of Growth" /></div>
            <div className="field"><label htmlFor="company_size">Company size</label><input id="company_size" name="company_size" placeholder="11-200 employees" /></div>
            <div className="field"><label htmlFor="count">Lead count</label><input id="count" name="count" type="number" min="1" max="50" defaultValue="20" /></div>
            <button className="btn primary" type="submit"><Search size={16} /> Find leads</button>
          </form>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Qualified preview" description="Preview will populate after lead search returns usable results." action={<StatusPill status="queued" />} />
          <EmptyState icon={Target} title={campaigns.length ? "No preview data yet" : "Create a campaign first"} description={campaigns.length ? "Run a real search from a campaign context. Veldo will show saved leads, rejected rows, and fit stages after import." : "Lead search needs a real campaign so imported people have a destination workflow."} action={!campaigns.length ? <a className="btn primary" href="/campaigns/new">Create campaign</a> : undefined} />
        </GlassCard>
      </section>
    </PageShell>
  );
}
