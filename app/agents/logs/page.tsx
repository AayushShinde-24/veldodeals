import { EmptyState, GlassCard, PageHeader, PageShell, SectionHeader } from "@/components/premium";
import { getListData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

export default async function AgentLogsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const logs = await getListData(userId, "agent_logs");
  return (
    <PageShell>
      <PageHeader eyebrow="Agent logs" title="Decision trail" description="Every important agent action writes an auditable log without storing secrets." />
      <GlassCard>
        <SectionHeader title="Recent logs" description="Newest records first." />
        {logs.length ? logs.map((log) => (
          <div className="log-line" key={log.id}>
            <strong>{log.agent_name} / {log.level}</strong>
            <span>{safeAgentText(log.message)}</span>
            <span className="muted">{new Date(log.created_at).toLocaleString()}</span>
          </div>
        )) : <EmptyState title="No logs yet" description="Agent logs will appear as campaigns, imports, and safety checks run." />}
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
