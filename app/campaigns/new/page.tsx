import { BriefcaseBusiness, Building2, ChevronDown, Sparkles, Target, Wand2 } from "lucide-react";
import { GlassCard, PageHeader, PageShell, PipelineMini } from "@/components/premium";
import { getCurrentUser } from "@/lib/auth/server";
import { StatusPill } from "@/components/status-pill";
import { createMvpCampaignAction } from "./actions";
import { redirect } from "next/navigation";

const titlePresets = ["Founder", "CEO", "Owner", "VP Sales", "Head of Growth", "RevOps", "Marketing Lead", "Operations Lead"];
const marketSectorPresets = ["B2B", "B2C", "B2B2C", "E-commerce", "Fintech", "D2C", "Non-Profit", "SaaS", "Consulting", "Services", "Retail"];

export default async function NewCampaignPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <PageShell>
      <PageHeader eyebrow="Campaign builder" title="Build a prospecting audience" description="Pick the ICP, then let Campaign Leader run the agent workflow behind the scenes." />
      <form className="campaign-builder-shell" action={createMvpCampaignAction}>
        <aside className="campaign-filter-panel">
          <div className="campaign-filter-head">
            <Target size={18} />
            <div>
              <strong>Audience filters</strong>
              <span>Open a filter, choose values, close it again</span>
            </div>
          </div>

          <FilterBlock icon={<BriefcaseBusiness size={16} />} title="Job titles">
            <div className="field compact-field">
              <label htmlFor="job_titles">Add titles</label>
              <input id="job_titles" name="job_titles" required placeholder="Founder, CEO, VP Sales" />
            </div>
            <div className="pill-grid">
              {titlePresets.map((title) => (
                <label className="select-pill" key={title}>
                  <input type="checkbox" name="job_title_preset" value={title} />
                  <span>{title}</span>
                </label>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock icon={<Building2 size={16} />} title="Market sector" defaultOpen>
            <div className="pill-grid">
              {marketSectorPresets.map((sector) => (
                <label className="select-pill" key={sector}>
                  <input type="checkbox" name="market_sector" value={sector} />
                  <span>{sector}</span>
                </label>
              ))}
            </div>
          </FilterBlock>
          <input type="hidden" name="location" value="" />
          <input type="hidden" name="company_size" value="" />
        </aside>

        <section className="campaign-main-panel">
          <GlassCard>
            <div className="card-header"><div><h2>Campaign inputs</h2><p className="muted">Veldo stores this campaign securely, then queues agent work from these fields.</p></div><Wand2 size={18} color="var(--blue)" /></div>
            <div className="form">
              <div className="grid cols-2">
                <div className="field"><label htmlFor="name">Campaign name</label><input id="name" name="name" required placeholder="America SaaS revenue leaders" /></div>
                <div className="field"><label htmlFor="target_niche">Target niche</label><input id="target_niche" name="target_niche" required placeholder="AI-native SaaS" /></div>
              </div>
              <div className="grid cols-2">
                <div className="field"><label htmlFor="campaign_type">Revenue motion</label><select id="campaign_type" name="campaign_type" defaultValue="sales"><option value="sales">Sales</option><option value="fundraising">Fundraising</option><option value="distribution">Distribution</option><option value="hybrid">Hybrid</option></select></div>
                <label className="select-pill" style={{ alignSelf: "end" }}><input type="checkbox" name="hyper_personalization" value="true" /><span>Hyper-personalization add-on</span></label>
              </div>
              <div className="field"><label htmlFor="product_offer">Offer / product</label><textarea id="product_offer" name="product_offer" required placeholder="AI-powered pipeline research and compliant personalized outreach." /></div>
              <div className="field"><label htmlFor="goal">Campaign goal</label><textarea id="goal" name="goal" required placeholder="Book qualified conversations with revenue leaders." /></div>
              <div className="field"><label htmlFor="number_of_leads">Lead count</label><input id="number_of_leads" name="number_of_leads" type="number" min="1" max="50" defaultValue="10" /></div>
              <button className="btn primary" type="submit"><Sparkles size={16} /> Create campaign</button>
            </div>
          </GlassCard>

          <GlassCard>
            <h2>Leader launch gates</h2>
            <p className="muted" style={{ marginTop: 8 }}>These are real backend gates, not decoration. Campaign Leader pauses weak or unsafe work.</p>
            <div style={{ marginTop: 16 }}>
              <PipelineMini items={["Validate inputs", "Find leads or investors", "Research public data", "Draft for approval", "Gate email and calls", "Book meetings and deals"].map((label) => ({ label, status: <StatusPill status="queued" /> }))} />
            </div>
          </GlassCard>
        </section>
      </form>
    </PageShell>
  );
}

function FilterBlock({ icon, title, children, defaultOpen = false }: { icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="filter-block campaign-filter-accordion" open={defaultOpen}>
      <summary className="filter-block-title">{icon}<strong>{title}</strong><ChevronDown className="filter-chevron" size={16} /></summary>
      <div className="filter-block-body">{children}</div>
    </details>
  );
}
