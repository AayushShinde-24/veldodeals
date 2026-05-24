import { Bot } from "lucide-react";
import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCampaignView, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function CampaignAgentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: UiSearchParams }) {
  const { id } = await params;
  const userId = await resolveUserId(searchParams);
  const data = await getCampaignView(userId, id);
  const tasks = data?.tasks ?? [];

  return (
    <PageShell>
      <PageHeader eyebrow="Campaign agents" title={data?.campaign?.name ?? "Agent tasks"} description="Specialist jobs for this campaign, owned and routed by Campaign Leader." actions={<a className="btn" href={`/campaigns/${id}`}>Overview</a>} />
      <GlassCard>
        <SectionHeader title="Agent task queue" description="Queued, running, completed, blocked, and review jobs." action={<Bot size={18} color="var(--blue)" />} />
        <DataTable
          headers={["Agent", "Task", "Status", "Priority", "Retries", "Error"]}
          rows={tasks.map((task) => [task.agent_name, task.task_type, <StatusPill status={task.status} />, task.priority, task.retry_count, task.error_message ?? ""])}
          empty={<EmptyState title="No campaign tasks yet" description="Start the campaign or import leads to enqueue agent work." />}
        />
      </GlassCard>
    </PageShell>
  );
}
