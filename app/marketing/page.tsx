import { Megaphone, Radio, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { Badge, DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { AdGenerator } from "@/components/ad-generator";
import { AD_CHANNELS, isChannelConfigured } from "@/lib/marketing/channels";
import { creditCosts } from "@/lib/revenue-os/pricing";

const DEMO_ADS = [
  { name: "Q3 Awareness — Founders", channel: "Meta", format: "Video", status: "running", spend: "$1,240" },
  { name: "Search — RevOps", channel: "Google", format: "Image", status: "running", spend: "$890" },
  { name: "Retarget — Trial signups", channel: "Meta", format: "Carousel", status: "ready_to_send", spend: "$0" },
];

export default async function MarketingPage() {
  const channels = AD_CHANNELS.map((c) => ({ ...c, connected: isChannelConfigured(c) }));
  const connectedCount = channels.filter((c) => c.connected).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Marketing"
        title="Generate and publish ads — across every channel"
        description="Describe your product; Veldo writes the copy, designs the creative, and publishes to Meta, Google, and more."
        actions={<Badge tone="violet">Team &amp; Enterprise</Badge>}
      />

      <section className="grid cols-4">
        <MetricCard icon={Megaphone} label="Active campaigns" value={DEMO_ADS.filter((a) => a.status === "running").length} trend="Across channels" tone="violet" />
        <MetricCard icon={Sparkles} label="Ads generated" value={28} trend="This month" tone="blue" />
        <MetricCard icon={Radio} label="Channels" value={`${connectedCount}/${channels.length}`} trend="Connected" tone="cyan" />
        <MetricCard icon={Wallet} label="Ad spend" value="$2,130" trend="This month" tone="green" />
      </section>

      <GlassCard glow>
        <SectionHeader
          title="Ad studio"
          description="Generate channel-ready ad copy and creative, then publish in one click."
          action={<TrendingUp size={18} color="var(--brand-2)" />}
        />
        <AdGenerator />
      </GlassCard>

      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Channels" description="Connect ad accounts to publish directly." />
          {channels.map((c) => (
            <div className="premium-list-row" key={c.id}>
              <span><strong>{c.name}</strong> <span className="muted" style={{ fontSize: 12 }}>· {c.blurb}</span></span>
              {c.connected ? <Badge tone="green">Connected</Badge> : <a className="btn small" href="/settings/integrations">Connect</a>}
            </div>
          ))}
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Recent ads" description="Generated and published creatives." />
          <DataTable
            headers={["Campaign", "Channel", "Format", "Status", "Spend"]}
            rows={DEMO_ADS.map((a) => [a.name, a.channel, a.format, <StatusPill status={a.status} />, a.spend])}
            empty={<EmptyState icon={Megaphone} title="No ads yet" description="Generate your first ad in the studio above." />}
          />
        </GlassCard>
      </section>

      <GlassCard>
        <SectionHeader title="Marketing credits" description="Ad generation is metered in credits, like the rest of Veldo." />
        <div className="grid cols-4">
          {[
            ["Ad copy", creditCosts.ad_copy],
            ["Ad image", creditCosts.ad_image],
            ["Ad video", creditCosts.ad_video],
            ["Publish", creditCosts.ad_publish],
          ].map(([label, cost]) => (
            <div className="premium-list-row" key={String(label)}>
              <span>{label}</span>
              <strong>{String(cost)} credits</strong>
            </div>
          ))}
        </div>
      </GlassCard>
    </PageShell>
  );
}
