import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function AdminQaPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const tasks = await getListData(userId, "agent_tasks");
  const failed = tasks.filter((task) => ["failed", "blocked"].includes(task.status));
  return (
    <PageShell>
      <PageHeader eyebrow="Admin QA" title="Failed task review" description="Admin QA helps inspect blocked and failed agent work without exposing secrets." />
      <GlassCard>
        <SectionHeader title="Failure queue" description="Tasks that need operator attention." />
        <DataTable headers={["Agent", "Task", "Status", "Error"]} rows={failed.map((task) => [task.agent_name, task.task_type, <StatusPill status={task.status} />, task.error_message ?? ""])} empty={<EmptyState title="No failed tasks" description="The system has no failed or blocked agent tasks to triage." />} />
      </GlassCard>
    </PageShell>
  );
}
