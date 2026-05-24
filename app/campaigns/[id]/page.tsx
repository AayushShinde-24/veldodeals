import { Brain, CheckCircle2, MailCheck, ShieldCheck, Signal, Target, XCircle } from "lucide-react";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, PipelineMini, SectionHeader } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";
import { getCampaignView, resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { updatePersonalizedDraftApprovalAction } from "./actions";

export default async function CampaignDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: UiSearchParams }) {
  const { id } = await params;
  const userId = await resolveUserId(searchParams);
  const data = await getCampaignView(userId, id);
  const decision = data?.campaign?.leader_decision_json;
  const firstLead = data?.leads?.[0];
  const latestGate = firstLead ? data?.sendGates?.find((gate) => gate.lead_id === firstLead.id) : null;
  const latestDraft = firstLead ? data?.drafts?.find((draft) => draft.lead_id === firstLead.id) : null;
  const latestResearch = firstLead ? data?.research?.find((row) => row.lead_id === firstLead.id) : null;
  const latestIcp = firstLead ? data?.icpScores?.find((row) => row.lead_id === firstLead.id) : null;
  const latestSignal = firstLead ? data?.signals?.find((row) => row.lead_id === firstLead.id) : null;
  const latestStrategy = firstLead ? data?.strategies?.find((row) => row.lead_id === firstLead.id) : null;
  const latestEmailScore = firstLead ? data?.emailScores?.find((row) => row.lead_id === firstLead.id) : null;
  const latestVerification = firstLead ? data?.verifications?.find((row) => row.lead_id === firstLead.id) : null;
  const gateChecks = normalizeGateChecks(latestGate?.checks);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Campaign workspace"
        title={data?.campaign?.name ?? "Campaign not found"}
        description={data?.campaign?.goal ?? "Sign in or choose an existing campaign to load live campaign data."}
        actions={<StatusPill status={data?.campaign?.status ?? "unknown"} />}
      />
      <div className="tabs">
        <a className="tab active" href={`/campaigns/${id}`}>Overview</a>
        <a className="tab" href={`/campaigns/${id}/agents`}>Agents</a>
        <a className="tab" href={`/campaigns/${id}/drafts`}>Drafts</a>
        <a className="tab" href={`/campaigns/${id}/analytics`}>Analytics</a>
      </div>
      <section className="grid cols-4">
        <MetricCard icon={Target} label="Leads fetched" value={data?.leads.length ?? 0} trend="Lead records stored" />
        <MetricCard icon={Brain} label="Agent decisions" value={data?.decisions?.length ?? 0} trend="routing, scoring, and gate logs" tone="cyan" />
        <MetricCard icon={ShieldCheck} label="Send eligible" value={data?.sendGates?.filter((gate) => gate.eligible_to_send).length ?? 0} trend="all 8 gates passed" tone="green" />
        <MetricCard icon={MailCheck} label="Emails sent" value={data?.emailSends?.filter((send) => send.status === "sent").length ?? 0} trend="Mailbox send records" tone="green" />
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Campaign details" description="Autonomous execution settings saved securely." action={<Target size={18} color="var(--blue)" />} />
          <div className="premium-list">
            <div className="premium-list-row"><span>Sending mode</span><StatusPill status={data?.campaign?.sending_mode ?? "approval_required"} /></div>
            <div className="premium-list-row"><span>Product</span><strong>{data?.campaign?.product_name ?? data?.campaign?.product_offer ?? "Not set"}</strong></div>
            <div className="premium-list-row"><span>Target audience</span><strong>{data?.campaign?.target_audience ?? data?.campaign?.target_niche ?? "Not set"}</strong></div>
            <div className="premium-list-row"><span>Target location</span><strong>{data?.campaign?.location ?? "Any"}</strong></div>
            <div className="premium-list-row"><span>Progress</span><strong>{data?.campaign?.workflow_progress ?? 0}%</strong></div>
          </div>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Queue health" description="Drafted, safety-checked, queued, sent, failed, and blocked records." action={<ShieldCheck size={18} color="var(--success)" />} />
          <div className="premium-list">
            <div className="premium-list-row"><span>Drafted</span><strong>{data?.generatedEmails?.filter((email) => ["generated", "drafted", "approved", "edited"].includes(String(email.status))).length ?? 0}</strong></div>
            <div className="premium-list-row"><span>Queued</span><strong>{data?.emailSends?.filter((send) => send.status === "queued").length ?? 0}</strong></div>
            <div className="premium-list-row"><span>Sending</span><strong>{data?.emailSends?.filter((send) => send.status === "sending").length ?? 0}</strong></div>
            <div className="premium-list-row"><span>Blocked/failed</span><strong>{data?.emailSends?.filter((send) => String(send.status).startsWith("blocked") || send.status === "failed").length ?? 0}</strong></div>
          </div>
        </GlassCard>
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Leader decision" description="Latest route, confidence, and pause/continue state." action={<Target size={18} color="var(--blue)" />} />
          {decision ? (
            <div className="premium-list">
              <div className="premium-list-row"><span>Current stage</span><strong>{decision.current_stage}</strong></div>
              <div className="premium-list-row"><span>Next agent</span><strong>{decision.next_agent}</strong></div>
              <div className="premium-list-row"><span>Confidence</span><strong>{decision.confidence}</strong></div>
              <div className="premium-list-row"><span>Allowed to continue</span><StatusPill status={decision.allowed_to_continue ? "approved" : "blocked"} /></div>
            </div>
          ) : (
            <EmptyState title="No leader decision yet" description="Start the campaign or run Campaign Leader to save the first routing decision." />
          )}
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Approval gates" description="No send occurs unless every gate passes." action={<ShieldCheck size={18} color="var(--success)" />} />
          <PipelineMini items={sendGateLabels.map((item) => {
            const check = gateChecks.find((gate) => gate.gate === item.gate);
            return {
              label: item.label,
              status: check ? <StatusPill status={check.passed ? "approved" : "blocked"} /> : <StatusPill status="queued" />,
            };
          })} />
        </GlassCard>
      </section>
      <section className="grid cols-2">
        <GlassCard>
          <SectionHeader title="Lead intelligence" description="Research, signals, ICP fit, and strategy for the selected lead." action={<Signal size={18} color="var(--blue)" />} />
          {firstLead ? (
            <div className="premium-list">
              <div className="premium-list-row"><span>Lead</span><strong>{firstLead.email}</strong></div>
              <div className="premium-list-row"><span>Company</span><strong>{firstLead.company}</strong></div>
              <div className="premium-list-row"><span>Research confidence</span><strong>{latestResearch?.confidence ?? 0}</strong></div>
              <div className="premium-list-row"><span>ICP score</span><strong>{latestIcp?.fit_score ?? 0}</strong></div>
              <div className="premium-list-row"><span>Best signal</span><strong>{latestSignal?.best_signal ?? "No signal yet"}</strong></div>
              <div className="premium-list-row"><span>Email strategy</span><strong>{latestStrategy?.angle ?? "Not planned"}</strong></div>
            </div>
          ) : (
            <EmptyState title="No selected lead" description="Import or add leads to build the first outbound workflow." />
          )}
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Draft review" description="Human approval remains required before sending." action={<MailCheck size={18} color="var(--success)" />} />
          {latestDraft ? (
            <div className="premium-list">
              <div className="premium-list-row"><span>Subject</span><strong>{latestDraft.subject_1}</strong></div>
              <div className="premium-list-row"><span>Approval</span><StatusPill status={latestDraft.approval_status} /></div>
              <div className="premium-list-row"><span>Email score</span><strong>{latestEmailScore?.score ?? 0}</strong></div>
              <div className="premium-list-row"><span>Verification</span><StatusPill status={latestVerification?.status ?? "unknown"} /></div>
              <div className="premium-list-row"><span>Gate decision</span><StatusPill status={latestGate?.decision ?? "queued"} /></div>
              <p className="muted" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{latestDraft.email_body}</p>
              <form action={updatePersonalizedDraftApprovalAction} className="premium-actions">
                <input type="hidden" name="campaign_id" value={id} />
                <input type="hidden" name="lead_id" value={String(latestDraft.lead_id)} />
                <button className="btn primary" name="approved" value="true" type="submit"><CheckCircle2 size={16} /> Approve</button>
                <button className="btn ghost" name="approved" value="false" type="submit"><XCircle size={16} /> Reject</button>
              </form>
            </div>
          ) : (
            <EmptyState title="No draft yet" description="Run the lead workflow to generate a validated draft." />
          )}
        </GlassCard>
      </section>
      <GlassCard>
        <SectionHeader title="Agent timeline" description="Latest validated decisions and logs saved by specialist agents." action={<Brain size={18} color="var(--violet)" />} />
        <DataTable
          headers={["Time", "Agent", "Confidence", "Review", "Decision"]}
          rows={(data?.decisions ?? []).slice(0, 12).map((row) => [new Date(row.created_at).toLocaleString(), row.agent_name, row.confidence, <StatusPill status={row.needs_human_review ? "needs_review" : "completed"} />, summarizeDecision(row.decision_json)])}
          empty={<EmptyState title="No decisions yet" description="Agent decisions will appear here after Campaign Leader starts routing work." />}
        />
      </GlassCard>
      <section className="grid cols-1">
        <GlassCard>
          <SectionHeader title="Final summary" description="Reporting Agent saves the latest outcome here." />
          <p className="muted" style={{ lineHeight: 1.6 }}>{data?.learnings?.summary ?? data?.campaign?.final_summary?.summary ?? "No final report yet."}</p>
        </GlassCard>
      </section>
      <section className="grid cols-1">
        <GlassCard>
          <SectionHeader title="Email queue" description="Queue and delivery statuses saved in email_sends." />
          <DataTable
            headers={["Lead", "Status", "Scheduled", "Sent", "Reason"]}
            rows={(data?.emailSends ?? []).map((send) => [send.lead_id, <StatusPill status={send.status} />, send.scheduled_at ? new Date(send.scheduled_at).toLocaleString() : "", send.sent_at ? new Date(send.sent_at).toLocaleString() : "", send.failure_reason ?? ""])}
            empty={<EmptyState title="No queue records" description="Generate drafts and run safety checks to create queue records." />}
          />
        </GlassCard>
      </section>
      <section className="grid cols-1">
        <MetricCard icon={ShieldCheck} label="Blocked/failed" value={data?.emailSends?.filter((send) => String(send.status).startsWith("blocked") || send.status === "failed").length ?? 0} trend="Compliance, limit, provider" tone="orange" />
      </section>
      <GlassCard>
        <SectionHeader title="Lead stage pipeline" description="Lead status and rejection reasons before spend." />
        <DataTable
          headers={["Lead", "Company", "Stage", "ICP", "Gate"]}
          rows={(data?.leads ?? []).map((lead) => {
            const score = data?.icpScores?.find((row) => row.lead_id === lead.id);
            const gate = data?.sendGates?.find((row) => row.lead_id === lead.id);
            return [lead.email, lead.company, <StatusPill status={lead.stage} />, score?.fit_score ?? "", gate ? <StatusPill status={gate.eligible_to_send ? "approved" : "blocked"} /> : ""];
          })}
          empty={<EmptyState title="No leads in this campaign" description="Import leads so the Campaign Leader can route enrichment, research, scoring, and draft tasks." action={<a className="btn" href="/leads/import">Import leads</a>} />}
        />
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Recent campaign errors" description="Lead search, enrichment, drafting, sending, and compliance failures are persisted for retry and debugging." />
        <DataTable
          headers={["Source", "Code", "Message", "Created"]}
          rows={(data?.errors ?? []).map((error) => [error.source, error.error_code ?? "", error.error_message, new Date(error.created_at).toLocaleString()])}
          empty={<EmptyState title="No campaign errors" description="Failures will appear here with safe, non-secret details." />}
        />
      </GlassCard>
    </PageShell>
  );
}

const sendGateLabels = [
  { gate: "lead_has_email_and_company", label: "Lead has email and company" },
  { gate: "icp_fit_score", label: "ICP fit score >= 50" },
  { gate: "research_confidence", label: "Research confidence >= 60" },
  { gate: "personalization_risk", label: "Risk is not high" },
  { gate: "email_score", label: "Email score >= 75" },
  { gate: "email_verification", label: "Email verified valid" },
  { gate: "user_approval", label: "User approved draft" },
  { gate: "credits_available", label: "Credits available" },
  { gate: "not_unsubscribed", label: "Not unsubscribed" },
  { gate: "compliance_ready", label: "Compliance ready" },
  { gate: "daily_limit_available", label: "Daily limit available" },
  { gate: "no_duplicate_recipient", label: "No duplicate recipient" },
  { gate: "sending_account_ready", label: "Mailbox connected" },
  { gate: "first_release_allowlist", label: "Allowlist clear" },
];

function normalizeGateChecks(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is { gate: string; passed: boolean } => Boolean(item) && typeof item === "object" && "gate" in item && "passed" in item) : [];
}

function summarizeDecision(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return String(record.reason ?? record.final_verdict ?? record.decision ?? record.next_action ?? "Saved");
}
