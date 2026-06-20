import { Bot, BrainCircuit, LineChart, Play, Sparkles } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, PipelineMini, ProgressLine, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { veldoWorkflow } from "@/lib/agents/workflow-plan";
import { getOperationalData, resolveUserId, type UiSearchParams } from "@/lib/ui/data";

const agents = Array.from(new Set(veldoWorkflow.map((stage) => stage.agent).concat(["billing_credits", "admin_qa"])));

export default async function AgentsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getOperationalData(userId);
  return (
    <PageShell>
      <PageHeader eyebrow="AI Agents Command Center" title="Campaign Leader controls every revenue agent" description="Email, calls, meetings, deal follow-up, investor pipeline, and fundraising actions stay Zod-validated, logged, and approval-gated." actions={<><a className="btn primary" href="/agents/tasks"><Play size={16} /> Run queue</a><a className="btn" href="/agents/logs"><Sparkles size={16} /> Logs</a></>} />
      <section className="grid cols-4">
        <MetricCard icon={Bot} label="Agent roles" value={agents.length} trend="Typed schemas" />
        <MetricCard icon={Play} label="Running/queued" value={data.tasks.filter((task) => ["running", "queued"].includes(task.status)).length} trend="Current work" tone="green" />
        <MetricCard icon={BrainCircuit} label="Needs review" value={data.tasks.filter((task) => task.status === "needs_review").length} trend="Human gate" tone="orange" />
        <MetricCard icon={LineChart} label="Logs" value={data.logs.length} trend="Auditable activity" tone="cyan" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Operational agents" description="Status is derived from live task history." />
          <div className="grid cols-2">
            {agents.map((agent) => {
              const agentTasks = data.tasks.filter((task) => task.agent_name === agent);
              const health = agentTasks.length ? Math.round((agentTasks.filter((task) => task.status === "completed").length / agentTasks.length) * 100) : 0;
              return <GlassCard key={agent}><div className="premium-section-head"><h2>{agent}</h2><StatusPill status={agentTasks.some((task) => task.status === "running") ? "running" : agentTasks.length ? "active" : "queued"} /></div><ProgressLine value={health} /><p className="muted" style={{ marginTop: 10 }}>{agentTasks.length} persisted task(s)</p></GlassCard>;
            })}
          </div>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Workflow visualizer" description="Canonical Campaign Form to Dashboard flow from the operating diagram." />
          <PipelineMini items={veldoWorkflow.map((stage) => ({ label: stage.label, status: <StatusPill status={stageStatus(stage.agent, data.tasks)} /> }))} />
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Agent task queue" description="Latest persisted jobs." />
        <DataTable headers={["Agent", "Task", "Status", "Retries"]} rows={data.tasks.slice(0, 12).map((task) => [task.agent_name, task.task_type, <StatusPill status={task.status} />, task.retry_count])} empty={<EmptyState title="No tasks yet" description="Start a campaign or import leads to create agent tasks." />} />
      </GlassCard>
    </PageShell>
  );
}

function stageStatus(agent: string, tasks: Array<{ agent_name: string | null; status: string }>) {
  const agentTasks = tasks.filter((task) => task.agent_name === agent);
  if (agentTasks.some((task) => task.status === "running")) return "running";
  if (agentTasks.some((task) => ["failed", "blocked"].includes(task.status))) return "blocked";
  if (agentTasks.some((task) => task.status === "needs_review")) return "needs_review";
  if (agentTasks.some((task) => task.status === "completed")) return "completed";
  return "queued";
}
