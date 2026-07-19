import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, FileText, Mail, MessageSquare,
  Pause, Play, Rocket, Send, Sparkles, XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getBalance } from "@/lib/billing/ledger";
import { resolveCreditAccount } from "@/lib/billing/account";
import { getSalesCampaignDetail, type DetailSend } from "@/lib/sales/campaigns-data";
import {
  launchDraftAction, prepareDraftsAction, processQueueAction, removeContactAction,
  saveDraftEditAction, setCampaignStatusAction,
} from "./actions";
import styles from "../campaigns.module.css";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "activity", label: "Activity" },
  { key: "contacts", label: "Contacts" },
  { key: "drafts", label: "Drafts" },
  { key: "analytics", label: "Analytics" },
];

export default async function SalesCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "activity";

  const detail = await getSalesCampaignDetail(user.id, id);
  if (!detail) redirect("/sales/campaigns");

  const account = await resolveCreditAccount(user.id);
  const balance = await getBalance(account.billingUserId);

  const sent = detail.sends.filter((s) => s.status === "sent");
  const queued = detail.sends.filter((s) => s.status === "queued" || s.status === "sending");
  const positive = detail.replies.filter((r) => /positive|interested/i.test(String(r.classification ?? "")));
  const estimate = detail.config.estimate;
  const creditsSpent = detail.status === "draft" ? 0 : (estimate?.credits.total ?? 0);
  const leadById = new Map(detail.leads.map((l) => [l.id, l]));

  const notice =
    sp.launched ? { kind: "ok" as const, text: `Launched — ${queued.length + sent.length} sends queued. Veldo AI takes it from here.` }
    : sp.saved ? { kind: "ok" as const, text: "Saved." }
    : sp.prepared ? { kind: "ok" as const, text: "Drafts prepared — review and edit them below." }
    : sp.removed ? { kind: "ok" as const, text: "Contact removed from the campaign." }
    : sp.processed ? { kind: "ok" as const, text: `Queue processed — ${String(sp.processed)}.` }
    : sp.error ? { kind: "err" as const, text: String(sp.error) }
    : null;

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <div className={styles.dHead}>
        <div className={styles.dTitle}>
          <a className={styles.ghost} href="/sales/campaigns" aria-label="Back to campaigns">
            <ArrowLeft size={13} />
          </a>
          <h1>{detail.name}</h1>
          <StatusPill status={detail.status} />
        </div>
        <div className={styles.headActions}>
          {(detail.status === "running" || detail.status === "paused") && (
            <>
              <form action={processQueueAction}>
                <input type="hidden" name="campaign_id" value={detail.id} />
                <button className={styles.ghost} type="submit" disabled={detail.status !== "running"}>
                  <Send size={13} /> Send due emails now
                </button>
              </form>
              <form action={setCampaignStatusAction}>
                <input type="hidden" name="campaign_id" value={detail.id} />
                <input type="hidden" name="status" value={detail.status === "running" ? "paused" : "running"} />
                <button className={styles.ghost} type="submit">
                  {detail.status === "running" ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {notice && (
        <p className={notice.kind === "ok" ? styles.okNote : styles.errNote} style={{ marginTop: 0 }}>
          {notice.kind === "ok" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {notice.text}
        </p>
      )}

      {detail.status === "draft" && (
        <section className={styles.launch}>
          <h2 className={styles.panelTitle}><Rocket size={15} /> Launch card — awaiting your approval</h2>
          <p className={styles.panelSub}>Nothing has been charged or sent. Approve to debit the credits below and start sending.</p>
          <div className={styles.launchGrid}>
            <div className={styles.launchList}>
              <div className={styles.launchRow}><span>Audience</span><b>{detail.leads.length} contacts · {detail.config.audienceSummary ?? "Custom"}</b></div>
              <div className={styles.launchRow}><span>Sequence</span><b>{detail.config.sequence.length}-step email</b></div>
              <div className={styles.launchRow}>
                <span>Schedule</span>
                <b>{detail.config.sending.dailyCap}/day · {detail.config.sending.windowStart}–{detail.config.sending.windowEnd}</b>
              </div>
              {estimate && (
                <div className={`${styles.launchRow} ${styles.launchTotal}`}>
                  <span>Total cost</span><b>{estimate.credits.total.toLocaleString()} credits</b>
                </div>
              )}
            </div>
            <div>
              {estimate && (
                <div className={styles.estBox}>
                  <h4>Estimated results</h4>
                  <div className={styles.estVal}>
                    ~{estimate.shown.repliesLo}–{estimate.shown.repliesHi} replies
                    <small>~{estimate.shown.meetingsLo}–{estimate.shown.meetingsHi} meetings booked</small>
                  </div>
                </div>
              )}
              {estimate && balance < estimate.credits.total ? (
                <p className={styles.shortfall}>
                  You need {(estimate.credits.total - balance).toLocaleString()} more credits. <a href="/settings/billing">Top up in Billing</a>
                </p>
              ) : (
                <form action={launchDraftAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="campaign_id" value={detail.id} />
                  <button className={styles.primary} type="submit"><Rocket size={14} /> Approve & launch</button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      <div className={styles.dStats}>
        <div className={styles.dStat}><span>Contacts</span><b>{detail.leads.length}</b></div>
        <div className={styles.dStat}><span>Sent</span><b>{sent.length}</b></div>
        <div className={styles.dStat}><span>Queued</span><b>{queued.length}</b></div>
        <div className={styles.dStat}><span>Replies</span><b>{detail.replies.length}{positive.length ? ` · ${positive.length} positive` : ""}</b></div>
        <div className={styles.dStat}><span>Credits</span><b>{creditsSpent.toLocaleString()}</b></div>
      </div>

      <nav className={styles.tabs} aria-label="Campaign sections">
        {TABS.map((t) => (
          <a key={t.key} className={`${styles.tabLink} ${tab === t.key ? styles.tabOn : ""}`} href={`/sales/campaigns/${detail.id}?tab=${t.key}`}>
            {t.label}
          </a>
        ))}
      </nav>

      {tab === "activity" && <ActivityTab detail={detail} leadName={(id2) => leadById.get(id2 ?? "")?.name || leadById.get(id2 ?? "")?.email || "contact"} />}
      {tab === "contacts" && <ContactsTab detail={detail} />}
      {tab === "drafts" && <DraftsTab detail={detail} leadName={(id2) => leadById.get(id2 ?? "")?.name || leadById.get(id2 ?? "")?.email || "contact"} />}
      {tab === "analytics" && <AnalyticsTab detail={detail} />}
    </div>
  );
}

// ── tabs ─────────────────────────────────────────────────

type Detail = NonNullable<Awaited<ReturnType<typeof getSalesCampaignDetail>>>;

function ActivityTab({ detail, leadName }: { detail: Detail; leadName: (id: string | null) => string }) {
  const items = [
    ...detail.sends.map((s) => ({
      key: `send-${s.id}`,
      at: s.sentAt ?? s.scheduledAt ?? s.createdAt,
      icon: s.status === "sent" ? Send : s.status === "failed" ? XCircle : s.status === "skipped" ? AlertTriangle : Clock,
      accent: s.status === "sent" ? "#22d3ee" : s.status === "failed" ? "#ef4444" : s.status === "skipped" ? "#f59e0b" : "#6b7590",
      title: `Step ${s.step} ${s.status === "queued" ? "queued" : s.status} — ${leadName(s.leadId)}`,
      detail: s.status === "sent" ? (s.subject ?? "Email delivered") : s.failureReason ?? (s.scheduledAt ? `Scheduled ${fmtDate(s.scheduledAt)}` : "Waiting"),
    })),
    ...detail.replies.map((r) => ({
      key: `reply-${r.id}`,
      at: r.createdAt,
      icon: MessageSquare,
      accent: "#8b5cf6",
      title: `Reply${r.classification ? ` — ${r.classification}` : ""} from ${leadName(r.leadId)}`,
      detail: r.body ? r.body.slice(0, 80) : "Open in Conversations",
    })),
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Sparkles size={15} /> Activity</h2>
      <p className={styles.panelSub}>
        Every touch on this campaign, newest first. Replies live in <a href="/inbox">Conversations →</a>
      </p>
      <div className={styles.timeline}>
        {items.length ? (
          items.slice(0, 60).map((item) => {
            const Icon = item.icon;
            return (
              <div className={styles.tlItem} key={item.key} style={{ "--accent": item.accent } as React.CSSProperties}>
                <span className={styles.tlIcon}><Icon size={13} /></span>
                <span className={styles.tlText}>
                  {item.title}
                  <small>{item.detail}</small>
                </span>
                <span className={styles.tlTime}>{item.at ? fmtDate(item.at) : ""}</span>
              </div>
            );
          })
        ) : (
          <p className={styles.hint}>No activity yet — approve the launch card to start.</p>
        )}
      </div>
    </section>
  );
}

function ContactsTab({ detail }: { detail: Detail }) {
  const latestByLead = new Map<string, DetailSend>();
  for (const s of detail.sends) {
    if (!s.leadId) continue;
    const prev = latestByLead.get(s.leadId);
    if (!prev || s.step >= prev.step) latestByLead.set(s.leadId, s);
  }
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Mail size={15} /> Contacts ({detail.leads.length})</h2>
      <p className={styles.panelSub}>Contacts staged in this campaign. You can remove anyone who hasn't been emailed yet.</p>
      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: "minmax(140px,1.2fr) minmax(110px,1fr) minmax(150px,1.2fr) 110px 90px" }}>
          <span>Name</span><span>Company</span><span>Email</span><span>Status</span><span></span>
        </div>
        <div className={styles.tScroll} style={{ maxHeight: 420 }}>
          {detail.leads.map((l) => {
            const last = latestByLead.get(l.id);
            const contacted = detail.sends.some((s) => s.leadId === l.id && s.status === "sent");
            return (
              <div className={styles.tRow} key={l.id} style={{ gridTemplateColumns: "minmax(140px,1.2fr) minmax(110px,1fr) minmax(150px,1.2fr) 110px 90px" }}>
                <strong>{l.name || l.email}</strong>
                <span>{l.company ?? "—"}</span>
                <span>{l.email}</span>
                <span className={`${styles.badge} ${contacted ? styles.bOk : last ? styles.bMuted : styles.bWarn}`}>
                  {contacted ? `Step ${last?.step ?? 1} sent` : last ? "Queued" : "Staged"}
                </span>
                {contacted ? (
                  <span />
                ) : (
                  <form action={removeContactAction}>
                    <input type="hidden" name="campaign_id" value={detail.id} />
                    <input type="hidden" name="lead_id" value={l.id} />
                    <button className={styles.seqRemove} type="submit">Remove</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DraftsTab({ detail, leadName }: { detail: Detail; leadName: (id: string | null) => string }) {
  const queuedSendsWithDraft = detail.sends.filter((s) => (s.status === "queued" || s.status === "sending") && s.generatedEmailId);
  const draftIds = new Set(queuedSendsWithDraft.map((s) => s.generatedEmailId));
  const editable = detail.drafts.filter((d) => draftIds.has(d.id));
  const sentDrafts = detail.drafts.filter((d) => d.status === "sent").slice(0, 10);

  return (
    <section className={styles.panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 className={styles.panelTitle}><FileText size={15} /> Drafts</h2>
          <p className={styles.panelSub}>
            Copy for upcoming sends. Anything you don't edit is written fresh per contact at send time.
          </p>
        </div>
        <form action={prepareDraftsAction}>
          <input type="hidden" name="campaign_id" value={detail.id} />
          <button className={styles.ghost} type="submit"><Sparkles size={13} /> Prepare next 5 drafts</button>
        </form>
      </div>

      {editable.length === 0 && <p className={styles.hint}>No prepared drafts yet — click “Prepare next 5 drafts” to write copy for the next queued sends.</p>}
      {editable.map((d) => (
        <form className={styles.draftCard} key={d.id} action={saveDraftEditAction}>
          <input type="hidden" name="campaign_id" value={detail.id} />
          <input type="hidden" name="draft_id" value={d.id} />
          <div className={styles.draftHead}>
            <strong>To {leadName(d.leadId)}</strong>
            <span className={`${styles.badge} ${d.editedSubject ? styles.bOk : styles.bMuted}`}>{d.editedSubject ? "Edited" : "AI draft"}</span>
          </div>
          <div className={styles.field}>
            <label htmlFor={`ds-${d.id}`}>Subject</label>
            <input id={`ds-${d.id}`} name="subject" defaultValue={d.editedSubject ?? d.subject ?? ""} />
          </div>
          <div className={styles.field} style={{ marginBottom: 0 }}>
            <label htmlFor={`db-${d.id}`}>Body</label>
            <textarea id={`db-${d.id}`} name="body" rows={5} defaultValue={d.editedBody ?? d.body ?? ""} />
          </div>
          <div className={styles.draftActions}>
            <button className={styles.primary} type="submit">Save edit</button>
          </div>
        </form>
      ))}

      {sentDrafts.length > 0 && (
        <>
          <h3 className={styles.panelTitle} style={{ fontSize: 12.5, marginTop: 16 }}>Recently sent</h3>
          {sentDrafts.map((d) => (
            <div className={styles.previewCard} key={d.id}>
              <div className={styles.previewTo}>Sent to {leadName(d.leadId)}</div>
              <div className={styles.previewSubject}>{d.editedSubject ?? d.subject}</div>
              <div className={styles.previewBody}>{d.editedBody ?? d.body}</div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function AnalyticsTab({ detail }: { detail: Detail }) {
  const days = 14;
  const sendSeries = bucketByDay(detail.sends.filter((s) => s.sentAt).map((s) => s.sentAt as string), days);
  const replySeries = bucketByDay(detail.replies.map((r) => r.createdAt), days);
  const maxSend = Math.max(1, ...sendSeries.map((d) => d.count));
  const maxReply = Math.max(1, ...replySeries.map((d) => d.count));

  const steps = Array.from({ length: detail.config.sequence.length }, (_, i) => i + 1).map((step) => {
    const rows = detail.sends.filter((s) => s.step === step);
    return {
      step,
      goal: detail.config.sequence[step - 1]?.goal ?? "",
      planned: rows.length,
      sent: rows.filter((s) => s.status === "sent").length,
      dropped: rows.filter((s) => s.status === "skipped" || s.status === "failed").length,
    };
  });

  return (
    <div className={styles.detailGrid}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Sends & replies — last {days} days</h2>
        <p className={styles.panelSub}>Daily delivered emails and replies received on this campaign.</p>
        {sendSeries.map((d, i) => (
          <div className={styles.barRow} key={d.label}>
            <span>{d.label}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${(d.count / maxSend) * 100}%` }} /></div>
              <div className={styles.barTrack} style={{ height: 6 }}>
                <div className={styles.barFill} style={{ width: `${(replySeries[i].count / maxReply) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
              </div>
            </div>
            <b>{d.count}·{replySeries[i].count}</b>
          </div>
        ))}
        <p className={styles.hint} style={{ marginTop: 8 }}>Blue = sends, purple = replies. Numbers: sends·replies.</p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Per-step performance</h2>
        <p className={styles.panelSub}>How each touch in the sequence is doing.</p>
        {steps.map((s) => (
          <div className={styles.draftCard} key={s.step}>
            <div className={styles.draftHead}>
              <strong>Step {s.step}</strong>
              <span className={`${styles.badge} ${styles.bMuted}`}>{s.sent}/{s.planned} sent{s.dropped ? ` · ${s.dropped} dropped` : ""}</span>
            </div>
            <p className={styles.hint}>{s.goal}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// ── small pieces ─────────────────────────────────────────

function StatusPill({ status }: { status: Detail["status"] }) {
  const meta = {
    draft: { label: "Awaiting approval", cls: "stDraft", icon: FileText },
    running: { label: "Running", cls: "stRunning", icon: Play },
    paused: { label: "Paused", cls: "stPaused", icon: Pause },
    completed: { label: "Completed", cls: "stDone", icon: CheckCircle2 },
  }[status];
  const Icon = meta.icon;
  return (
    <span className={`${styles.pill} ${styles[meta.cls]}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function bucketByDay(timestamps: string[], days: number): { label: string; count: number }[] {
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), key: d.toDateString(), count: 0 };
  });
  const index = new Map(out.map((o, i) => [o.key, i]));
  for (const ts of timestamps) {
    const key = new Date(ts).toDateString();
    const i = index.get(key);
    if (i !== undefined) out[i].count += 1;
  }
  return out;
}
