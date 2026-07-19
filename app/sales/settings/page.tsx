import { CheckCircle2, Save, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { AUTONOMY_MODES } from "@/lib/autonomy/modes";
import { SALES_TIMEZONES, SALES_TONES } from "@/lib/sales/settings";
import type { UiSearchParams } from "@/lib/ui/data";
import styles from "../sales.module.css";
import { loadSalesSettings, saveSalesSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

// Sales Settings — the guardrails. Every field here changes live behavior:
// the autonomy mode drives the approval gates, caps drive the sequence engine.
export default async function SalesSettingsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const { autonomy, settings } = await loadSalesSettings(user.id);

  const saved = params?.saved === "1";
  const error = params?.error === "1";

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>
            Sales <span className={styles.titleGrad}>Settings</span>
          </h1>
          <p className={styles.sub}>
            How autonomous, how aggressive, and how expensive the sales engine may be. Changes apply
            immediately — no redeploy, no restart.
          </p>
        </div>
      </section>

      {saved ? (
        <div className={styles.banner}>
          <CheckCircle2 size={15} /> Settings saved — Vel is now operating under the new guardrails.
        </div>
      ) : null}
      {error ? (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <XCircle size={15} /> Could not save — check the database connection and try again.
        </div>
      ) : null}

      <form action={saveSalesSettingsAction} className={styles.wrap}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span>Autonomy</span>
            <span className={styles.tag}>the single source of &ldquo;does this need a human?&rdquo;</span>
          </div>
          <div className={styles.modes}>
            {AUTONOMY_MODES.map((mode) => (
              <label className={styles.mode} key={mode.id}>
                <input type="radio" name="autonomy" value={mode.id} defaultChecked={autonomy === mode.id} />
                <div>
                  <strong>
                    {mode.name} {mode.recommended ? <i>RECOMMENDED</i> : null}
                  </strong>
                  <p>{mode.tagline}</p>
                  <p>{mode.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <div className={styles.sGrid}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span>Volume & timing</span>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="daily_emails">Daily email cap</label>
                <input id="daily_emails" name="daily_emails" type="number" min={1} max={2000} defaultValue={settings.dailyEmails} />
              </div>
              <div className={styles.field}>
                <label htmlFor="daily_calls">Daily call cap</label>
                <input id="daily_calls" name="daily_calls" type="number" min={0} max={500} defaultValue={settings.dailyCalls} />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="send_start">Sending window start</label>
                <input id="send_start" name="send_start" type="time" defaultValue={settings.sendStart} />
              </div>
              <div className={styles.field}>
                <label htmlFor="send_end">Sending window end</label>
                <input id="send_end" name="send_end" type="time" defaultValue={settings.sendEnd} />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="timezone">Timezone</label>
                <select id="timezone" name="timezone" defaultValue={settings.timezone}>
                  {SALES_TIMEZONES.map((tz) => (
                    <option value={tz} key={tz}>
                      {tz.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="monthly_budget">Monthly credit budget</label>
                <input id="monthly_budget" name="monthly_budget" type="number" min={0} max={1000000} defaultValue={settings.monthlyBudget} />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span>Voice & approvals</span>
            </div>
            <div className={styles.field}>
              <label>Tone of voice</label>
              <div className={styles.chips}>
                {SALES_TONES.map((tone) => (
                  <label className={styles.chip} key={tone.id}>
                    <input type="radio" name="tone" value={tone.id} defaultChecked={settings.tone === tone.id} />
                    <span>{tone.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className={styles.toggleRow}>
                <span>
                  Approve every email before send
                  <small>Off = emails send automatically inside the caps above</small>
                </span>
                <input type="checkbox" name="approve_emails" defaultChecked={settings.approvals.emails} />
              </div>
              <div className={styles.toggleRow}>
                <span>
                  Approve every AI call
                  <small>Calls cost 10 credits each — gate them while dialing in</small>
                </span>
                <input type="checkbox" name="approve_calls" defaultChecked={settings.approvals.calls} />
              </div>
              <div className={styles.toggleRow}>
                <span>
                  Approve meeting bookings
                  <small>Vel proposes, you approve — recommended</small>
                </span>
                <input type="checkbox" name="approve_meetings" defaultChecked={settings.approvals.meetings} />
              </div>
            </div>
          </section>
        </div>

        <div className={styles.saveBar}>
          <button className={styles.primary} type="submit">
            <Save size={14} /> Save settings
          </button>
        </div>
      </form>
    </div>
  );
}
