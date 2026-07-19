"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Coins, Lock, Mail, Rocket,
  Search, Send, Sparkles, Target, Users,
} from "lucide-react";
import { SALES_TIMEZONES } from "@/lib/sales/settings";
import type { CampaignEstimate, SequenceStep } from "@/lib/sales/campaign-config";
import {
  createCampaignAction,
  estimateResultsAction,
  generatePreviewsAction,
  searchAudienceAction,
  type AudiencePerson,
  type PreviewEmail,
} from "./actions";
import styles from "../campaigns.module.css";

export interface CrmLead {
  id: string;
  email: string;
  name: string;
  company: string;
  title: string;
}

interface WizardProps {
  sourcingConfigured: boolean;
  mailboxConnected: boolean;
  balance: number;
  crmLeads: CrmLead[];
  defaults: { dailyCap: number; windowStart: string; windowEnd: string; timezone: string };
}

const STEP_LABELS = ["Audience", "Sequence", "Sending", "Review & launch"];

export function CampaignWizard({ sourcingConfigured, mailboxConnected, balance, crmLeads, defaults }: WizardProps) {
  const [step, setStep] = useState(0);

  // basics
  const [name, setName] = useState("");
  const [offer, setOffer] = useState("");
  const [goal, setGoal] = useState("");

  // audience
  const [source, setSource] = useState<"crm" | "veldo_ai">(crmLeads.length || !sourcingConfigured ? "crm" : "veldo_ai");
  const [crmSelected, setCrmSelected] = useState<Set<string>>(new Set());
  const [titles, setTitles] = useState("");
  const [keywords, setKeywords] = useState("");
  const [searching, startSearch] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [found, setFound] = useState<AudiencePerson[]>([]);
  const [foundTotal, setFoundTotal] = useState(0);
  const [foundSelected, setFoundSelected] = useState<Set<string>>(new Set());

  // sequence
  const [sequence, setSequence] = useState<SequenceStep[]>([
    { goal: "Introduce the offer with one specific hook and ask for a quick call", waitDays: 0 },
  ]);
  const [previews, setPreviews] = useState<PreviewEmail[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [previewing, startPreview] = useTransition();

  // sending
  const [dailyCap, setDailyCap] = useState(defaults.dailyCap);
  const [windowStart, setWindowStart] = useState(defaults.windowStart);
  const [windowEnd, setWindowEnd] = useState(defaults.windowEnd);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [verify, setVerify] = useState(true);
  const [sender, setSender] = useState<"managed" | "gmail">(mailboxConnected ? "gmail" : "managed");

  // launch
  const [estimate, setEstimate] = useState<CampaignEstimate | null>(null);
  const [estimating, startEstimate] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shortfall, setShortfall] = useState<{ needed: number; balance: number } | null>(null);

  const contacts = useMemo(
    () => (source === "crm" ? crmSelected.size : foundSelected.size),
    [source, crmSelected, foundSelected]
  );
  const audienceSummary = useMemo(() => {
    if (source === "crm") return `${crmSelected.size} contacts · imported list`;
    const parts = [titles, keywords].map((s) => s.trim()).filter(Boolean).join(", ");
    return `${foundSelected.size} contacts${parts ? ` · ${parts}` : " · Veldo AI sourced"}`;
  }, [source, crmSelected, foundSelected, titles, keywords]);

  const stepValid =
    step === 0
      ? name.trim() && offer.trim() && goal.trim() && contacts > 0
      : step === 1
        ? sequence.every((s) => s.goal.trim().length > 0)
        : true;

  function goNext() {
    const next = Math.min(step + 1, 3);
    setStep(next);
    if (next === 3) {
      setSubmitError(null);
      setShortfall(null);
      startEstimate(async () => {
        const est = await estimateResultsAction({ contacts, steps: sequence.length, verify });
        setEstimate(est);
      });
    }
  }

  function runSearch(page = 1) {
    setSearchError(null);
    startSearch(async () => {
      const res = await searchAudienceAction({ titles, keywords, page });
      if (!res.ok) {
        setSearchError(res.error ?? "Search failed.");
        return;
      }
      setFound(res.people);
      setFoundTotal(res.total);
      setFoundSelected(new Set(res.people.map((p) => p.key)));
    });
  }

  function runPreviews() {
    setPreviewError(null);
    startPreview(async () => {
      const pool: { name: string; title: string; company: string; email: string }[] =
        source === "crm"
          ? crmLeads.filter((l) => crmSelected.has(l.id)).slice(0, 2)
          : found.filter((p) => foundSelected.has(p.key)).slice(0, 2);
      const res = await generatePreviewsAction({
        offer,
        goal,
        stepGoal: sequence[0]?.goal ?? "",
        feedback: feedback.trim() || undefined,
        samples: pool,
      });
      if (!res.ok) setPreviewError(res.error ?? "Preview failed.");
      setPreviews(res.previews);
    });
  }

  function submit(launch: boolean) {
    setSubmitError(null);
    setShortfall(null);
    startSubmit(async () => {
      const res = await createCampaignAction(
        {
          name,
          offer,
          goal,
          audienceSummary,
          audienceSource: source,
          crmLeadIds: source === "crm" ? Array.from(crmSelected) : [],
          sourcedPeople: source === "veldo_ai" ? found.filter((p) => foundSelected.has(p.key)) : [],
          sequence,
          sending: { dailyCap, windowStart, windowEnd, timezone, verify, sender },
        },
        launch
      );
      if (res.ok) {
        window.location.href = `/sales/campaigns/${res.campaignId}${res.launched ? "?launched=1" : "?saved=1"}`;
        return;
      }
      setSubmitError(res.error);
      if (res.needed !== undefined && res.balance !== undefined) setShortfall({ needed: res.needed, balance: res.balance });
      if (res.campaignId) {
        // Draft exists but launch was blocked — let the user finish from the detail page after topping up.
      }
    });
  }

  const total = estimate?.credits.total ?? 0;
  const canAffordLaunch = estimate ? balance >= total : true;

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>
            New <span className={styles.titleGrad}>campaign</span>
          </h1>
          <p className={styles.sub}>Four steps. Nothing sends and nothing is charged until you approve the launch card.</p>
        </div>
        <a className={styles.ghost} href="/sales/campaigns">
          <ArrowLeft size={13} /> All campaigns
        </a>
      </div>

      <div className={styles.steps}>
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={`${styles.stepDot} ${i === step ? styles.stepCurrent : i < step ? styles.stepDone : ""}`}>
            <b>{i < step ? "✓" : i + 1}</b> {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <Target size={15} /> Who are we selling, and to whom?
          </h2>
          <p className={styles.panelSub}>Name the campaign, describe the offer, then stage the audience.</p>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="cw-name">Campaign name</label>
              <input id="cw-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="US SaaS founders — July push" />
            </div>
            <div className={styles.field}>
              <label htmlFor="cw-goal">Campaign goal</label>
              <input id="cw-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Book qualified demos with revenue leaders" />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="cw-offer">Offer / product</label>
            <textarea id="cw-offer" rows={2} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="What you sell, for whom, and the one result it delivers." />
          </div>

          <div className={styles.sourceGrid}>
            <button
              type="button"
              className={`${styles.sourceCard} ${source === "veldo_ai" ? styles.sourceOn : ""}`}
              onClick={() => sourcingConfigured && setSource("veldo_ai")}
              disabled={!sourcingConfigured}
            >
              <strong>
                <Sparkles size={14} /> Find contacts with Veldo AI
              </strong>
              <p>Describe the ICP and Veldo AI sources verified B2B contacts with emails, titles, and companies.</p>
              {!sourcingConfigured && (
                <span className={styles.lockNote}>
                  <Lock size={11} /> Connect contact sourcing in <a href="/settings/integrations">Settings → Connections</a>
                </span>
              )}
            </button>
            <button type="button" className={`${styles.sourceCard} ${source === "crm" ? styles.sourceOn : ""}`} onClick={() => setSource("crm")}>
              <strong>
                <Users size={14} /> Use my imported contacts
              </strong>
              <p>
                Pick from the {crmLeads.length} unassigned contact{crmLeads.length === 1 ? "" : "s"} already in your pipeline (
                <a href="/leads/import" onClick={(e) => e.stopPropagation()}>import more</a>
                ).
              </p>
            </button>
          </div>

          {source === "veldo_ai" && sourcingConfigured && (
            <>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="cw-titles">Job titles (comma-separated)</label>
                  <input id="cw-titles" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="Founder, CEO, VP Sales" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="cw-keywords">Industry / keywords</label>
                  <input id="cw-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="B2B SaaS, fintech, United States" />
                </div>
              </div>
              <button type="button" className={styles.ghost} onClick={() => runSearch(1)} disabled={searching || (!titles.trim() && !keywords.trim())}>
                {searching ? <span className={styles.spin} /> : <Search size={13} />} Preview matching contacts
              </button>
              {searchError && <p className={styles.errNote} style={{ marginTop: 10 }}><AlertTriangle size={13} /> {searchError}</p>}
              {found.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p className={styles.hint} style={{ marginBottom: 8 }}>
                    {foundTotal.toLocaleString()} matches — previewing {found.length}, {foundSelected.size} selected.
                  </p>
                  <ContactTable
                    rows={found.map((p) => ({ key: p.key, name: p.name, title: p.title, company: p.company, email: p.email }))}
                    selected={foundSelected}
                    onToggle={(key) => setFoundSelected((prev) => toggleSet(prev, key))}
                    onToggleAll={(keys, on) => setFoundSelected(() => (on ? new Set(keys) : new Set()))}
                  />
                </div>
              )}
            </>
          )}

          {source === "crm" &&
            (crmLeads.length ? (
              <ContactTable
                rows={crmLeads.map((l) => ({ key: l.id, name: l.name || l.email, title: l.title, company: l.company, email: l.email }))}
                selected={crmSelected}
                onToggle={(key) => setCrmSelected((prev) => toggleSet(prev, key))}
                onToggleAll={(keys, on) => setCrmSelected(() => (on ? new Set(keys) : new Set()))}
              />
            ) : (
              <p className={styles.hint}>
                No unassigned contacts yet — <a href="/leads/import">import a list</a> or use Veldo AI sourcing.
              </p>
            ))}
        </section>
      )}

      {step === 1 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <Mail size={15} /> Sequence
          </h2>
          <p className={styles.panelSub}>
            Set the goal of each touch — Veldo AI writes a unique email per contact at send time. Previews below are samples.
          </p>

          {sequence.map((s, i) => (
            <div className={styles.seqStep} key={i}>
              <span className={styles.seqNum}>{i + 1}</span>
              <div className={styles.seqBody}>
                {i > 0 && (
                  <div className={styles.seqWait}>
                    Wait
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={s.waitDays}
                      onChange={(e) => updateStep(setSequence, i, { waitDays: Number(e.target.value) })}
                      aria-label={`Days to wait before step ${i + 1}`}
                    />
                    days after step {i}
                  </div>
                )}
                <div className={styles.field} style={{ marginBottom: 0 }}>
                  <label htmlFor={`cw-step-${i}`}>What should this email accomplish?</label>
                  <textarea
                    id={`cw-step-${i}`}
                    rows={2}
                    value={s.goal}
                    onChange={(e) => updateStep(setSequence, i, { goal: e.target.value })}
                    placeholder={i === 0 ? "Introduce the offer with one specific hook" : "Follow up briefly with a new angle"}
                  />
                </div>
              </div>
              {sequence.length > 1 && (
                <button type="button" className={styles.seqRemove} onClick={() => setSequence((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {sequence.length < 4 && (
              <button
                type="button"
                className={styles.ghost}
                onClick={() => setSequence((prev) => [...prev, { goal: "", waitDays: 3 }])}
              >
                + Add follow-up ({sequence.length}/4)
              </button>
            )}
            <button type="button" className={styles.ghost} onClick={runPreviews} disabled={previewing || contacts === 0}>
              {previewing ? <span className={styles.spin} /> : <Sparkles size={13} />} Generate previews
            </button>
          </div>

          {previewError && <p className={styles.errNote} style={{ marginTop: 10 }}><AlertTriangle size={13} /> {previewError}</p>}
          {previews.map((p) => (
            <div className={styles.previewCard} key={p.to}>
              <div className={styles.previewTo}>Sample for {p.to} — final copy is written per contact at send time</div>
              <div className={styles.previewSubject}>{p.subject}</div>
              <div className={styles.previewBody}>{p.body}</div>
            </div>
          ))}
          {previews.length > 0 && (
            <div className={styles.field} style={{ marginTop: 12 }}>
              <label htmlFor="cw-feedback">Not quite right? Tell Veldo AI what to change, then regenerate</label>
              <input id="cw-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Shorter. Lead with the ROI number. No exclamation marks." />
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <Send size={15} /> Sending
          </h2>
          <p className={styles.panelSub}>Who the emails come from, how fast they go out, and the safety checks before each send.</p>

          <div className={styles.senderGrid}>
            <button
              type="button"
              className={`${styles.sourceCard} ${sender === "gmail" ? styles.sourceOn : ""}`}
              onClick={() => mailboxConnected && setSender("gmail")}
              disabled={!mailboxConnected}
            >
              <strong>
                <Mail size={14} /> My connected mailbox
              </strong>
              <p>Send from your own address — best deliverability and replies land in your inbox.</p>
              {!mailboxConnected && (
                <span className={styles.lockNote}>
                  <Lock size={11} /> Connect Gmail in <a href="/settings/integrations">Settings → Connections</a>
                </span>
              )}
            </button>
            <button type="button" className={`${styles.sourceCard} ${sender === "managed" ? styles.sourceOn : ""}`} onClick={() => setSender("managed")}>
              <strong>
                <Rocket size={14} /> Veldo managed sending
              </strong>
              <p>Works out of the box — emails are sent for you as “{`{your name}`} via Veldo”.</p>
            </button>
          </div>

          <div className={styles.field}>
            <label htmlFor="cw-cap">Daily send cap</label>
            <div className={styles.rangeRow}>
              <input id="cw-cap" type="range" min={10} max={200} step={5} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} />
              <span className={styles.rangeVal}>{dailyCap}/day</span>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="cw-start">Send window start</label>
              <input id="cw-start" type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="cw-end">Send window end</label>
              <input id="cw-end" type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="cw-tz">Timezone</label>
            <select id="cw-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {SALES_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <label className={styles.toggle}>
            <span>
              <strong>Verify addresses before sending</strong>
              <small>Protects sender reputation — invalid addresses are skipped. +1 credit per contact.</small>
            </span>
            <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
          </label>
        </section>
      )}

      {step === 3 && (
        <section className={styles.launch}>
          <h2 className={styles.panelTitle}>
            <Rocket size={15} /> Launch card
          </h2>
          <p className={styles.panelSub}>
            The only place this campaign spends credits. Approve it and Veldo AI takes over — write, verify, send, follow up.
          </p>

          <div className={styles.launchGrid}>
            <div className={styles.launchList}>
              <div className={styles.launchRow}>
                <span>Audience</span>
                <b>{audienceSummary}</b>
              </div>
              <div className={styles.launchRow}>
                <span>Sequence</span>
                <b>
                  {sequence.length}-step email
                  {sequence.length > 1 ? ` · waits ${sequence.slice(1).map((s) => `${s.waitDays}d`).join(", ")}` : ""}
                </b>
              </div>
              <div className={styles.launchRow}>
                <span>Schedule</span>
                <b>
                  {dailyCap}/day · {windowStart}–{windowEnd} {timezone.split("/")[1]?.replace("_", " ")}
                </b>
              </div>
              <div className={styles.launchRow}>
                <span>Sender</span>
                <b>{sender === "gmail" ? "Your connected mailbox" : "Veldo managed sending"}</b>
              </div>
              {estimate && (
                <>
                  {estimate.credits.verify > 0 && (
                    <div className={styles.launchRow}>
                      <span>Address verification</span>
                      <b>{estimate.credits.verify.toLocaleString()} credits</b>
                    </div>
                  )}
                  <div className={styles.launchRow}>
                    <span>AI writing</span>
                    <b>{estimate.credits.write.toLocaleString()} credits</b>
                  </div>
                  <div className={styles.launchRow}>
                    <span>Sending</span>
                    <b>{estimate.credits.send.toLocaleString()} credits</b>
                  </div>
                  {estimate.credits.followups > 0 && (
                    <div className={styles.launchRow}>
                      <span>Follow-ups</span>
                      <b>{estimate.credits.followups.toLocaleString()} credits</b>
                    </div>
                  )}
                  <div className={`${styles.launchRow} ${styles.launchTotal}`}>
                    <span>Total</span>
                    <b>{estimate.credits.total.toLocaleString()} credits</b>
                  </div>
                </>
              )}
            </div>

            <div>
              {estimating || !estimate ? (
                <p className={styles.hint}>
                  <span className={styles.spin} /> Estimating results…
                </p>
              ) : (
                <>
                  <div className={styles.estBox}>
                    <h4>Estimated results</h4>
                    <div className={styles.estVal}>
                      ~{estimate.shown.repliesLo}–{estimate.shown.repliesHi} replies
                      <small>
                        ~{estimate.shown.meetingsLo}–{estimate.shown.meetingsHi} meetings booked
                      </small>
                    </div>
                  </div>
                  {canAffordLaunch ? (
                    <p className={styles.okNote}>
                      <CheckCircle2 size={13} /> Balance {balance.toLocaleString()} credits — {(balance - total).toLocaleString()} left after launch.
                    </p>
                  ) : (
                    <p className={styles.shortfall}>
                      <Coins size={13} /> You need {(total - balance).toLocaleString()} more credits.{" "}
                      <a href="/settings/billing">Top up in Billing</a>
                    </p>
                  )}
                </>
              )}
              {submitError && (
                <p className={styles.shortfall} style={{ marginTop: 10 }}>
                  <AlertTriangle size={13} /> {submitError}
                  {shortfall ? (
                    <>
                      {" "}
                      <a href="/settings/billing">Top up</a>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          </div>

          <div className={styles.navRow} style={{ marginTop: 16 }}>
            <button type="button" className={styles.ghost} onClick={() => submit(false)} disabled={submitting}>
              Save as draft
            </button>
            <button type="button" className={styles.primary} onClick={() => submit(true)} disabled={submitting || estimating || !estimate || !canAffordLaunch}>
              {submitting ? <span className={styles.spin} /> : <Rocket size={14} />} Approve & launch
            </button>
          </div>
        </section>
      )}

      {step < 3 && (
        <div className={styles.navRow}>
          <button type="button" className={styles.ghost} onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft size={13} /> Back
          </button>
          <button type="button" className={styles.primary} onClick={goNext} disabled={!stepValid}>
            {step === 0 && contacts > 0 ? `Continue with ${contacts} contact${contacts === 1 ? "" : "s"}` : "Continue"} <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────

function toggleSet(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

function updateStep(
  set: React.Dispatch<React.SetStateAction<SequenceStep[]>>,
  index: number,
  patch: Partial<SequenceStep>
) {
  set((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
}

function ContactTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
}: {
  rows: { key: string; name: string; title: string; company: string; email: string }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], on: boolean) => void;
}) {
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.key));
  return (
    <div className={styles.table}>
      <div className={styles.tHead}>
        <input
          type="checkbox"
          checked={allOn}
          onChange={(e) => onToggleAll(rows.map((r) => r.key), e.target.checked)}
          aria-label="Select all contacts"
        />
        <span>Name</span>
        <span>Title</span>
        <span>Company</span>
        <span>Email</span>
      </div>
      <div className={styles.tScroll}>
        {rows.map((r) => (
          <label className={styles.tRow} key={r.key}>
            <input type="checkbox" checked={selected.has(r.key)} onChange={() => onToggle(r.key)} aria-label={`Select ${r.name}`} />
            <strong>{r.name || "—"}</strong>
            <span>{r.title || "—"}</span>
            <span>{r.company || "—"}</span>
            <span>{r.email}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
