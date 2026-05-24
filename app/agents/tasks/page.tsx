import { DataTable, EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function AgentTasksPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const tasks = await getListData(userId, "agent_tasks");
  return (
    <PageShell>
      <PageHeader eyebrow="Task queue" title="Agent jobs and gates" description="Queued, running, completed, failed, needs_review, and blocked jobs are visible here." />
      <GlassCard>
        <SectionHeader title="Tasks" description="Latest persisted agent jobs." />
        <DataTable headers={["Agent", "Type", "Status", "Retries", "Error"]} rows={tasks.map((task) => [task.agent_name, task.task_type, <StatusPill status={task.status} />, task.retry_count, safeAgentText(task.error_message)])} empty={<EmptyState title="No agent tasks" description="Campaigns and imports create task records as agents start working." />} />
      </GlassCard>
    </PageShell>
  );
}

function safeAgentText(value: unknown) {
  return String(value ?? "")
    .replace(/\bSupabase\b/giu, "workspace data")
    .replace(/\bApollo\b/giu, "lead search")
    .replace(/\bOpenAI\b|\bAnthropic\b|\bClaude\b|\bGPT(?:[-\s]?\d+(?:\.\d+)?)?\b/giu, "AI")
    .replace(/\bGmail\b|\bGoogle\b/giu, "mailbox")
    .replace(/\bFirecrawl\b|\bTavily\b|\bZeroBounce\b|\bClay\b|\bResend\b/giu, "configured service")
    .replace(/\b[A-Z0-9_]*(?:API_KEY|CLIENT_ID|CLIENT_SECRET)[A-Z0-9_]*\b/gu, "required configuration");
}
