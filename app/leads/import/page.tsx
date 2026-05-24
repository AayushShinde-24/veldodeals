import { Upload } from "lucide-react";
import { GlassCard, PageHeader, PageShell, PipelineMini } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function LeadImportPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const campaigns = await getListData(userId, "campaigns");
  return (
    <PageShell>
      <PageHeader eyebrow="Lead import" title="Lead and CSV ingestion" description="The Lead Import Agent normalizes, deduplicates, rejects bad rows, saves valid leads, and starts the specialist chain." />
      <section className="grid cols-2">
        <GlassCard>
          <form className="form" action="/api/leads/upload-csv" method="post" encType="multipart/form-data">
            <div className="field"><label htmlFor="campaign_id">Campaign</label><select id="campaign_id" name="campaign_id" required><option value="">Choose a campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></div>
            <div className="field"><label htmlFor="file">CSV file</label><input id="file" name="file" type="file" accept=".csv" required /></div>
            <button className="btn primary" type="submit"><Upload size={16} /> Import CSV</button>
          </form>
        </GlassCard>
        <GlassCard>
          <h2>Import quality rules</h2>
          <div style={{ marginTop: 14 }}>
            <PipelineMini items={["Email must be present", "Company must be present", "Duplicate campaign emails rejected", "Bad rows preserved with rejection reason"].map((label) => ({ label, status: <StatusPill status="completed" /> }))} />
          </div>
        </GlassCard>
      </section>
    </PageShell>
  );
}
