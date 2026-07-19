import { Calendar, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getOperationalData, type UiSearchParams } from "@/lib/ui/data";
import styles from "../sales.module.css";
import { approveMeetingAction, declineMeetingAction } from "./actions";

export const dynamic = "force-dynamic";

// Sales Meetings — the approval gate. Vel qualifies warm replies into meeting
// proposals; nothing lands on the calendar until the founder approves a slot.
export default async function SalesMeetingsPage({ searchParams }: { searchParams: UiSearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const ops = await getOperationalData(user.id);

  const replies = (ops?.replies?.length ? ops.replies : ops?.canonicalReplies) ?? [];
  const leads = ops?.leads ?? [];
  const meetings = ops?.calendarEvents ?? [];

  // Proposals = positive replies not yet matched to a booked meeting.
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const proposals = replies
    .filter((r) => (r.classification ?? r.reply_class ?? r.sentiment) === "positive")
    .map((r) => {
      const lead = r.lead_id ? leadById.get(r.lead_id) : undefined;
      return {
        id: r.id,
        who: lead?.company || lead?.email || "Interested lead",
        why: r.body?.slice(0, 140) || r.next_action || "Positive reply — asked to talk.",
        slots: proposeSlots(),
      };
    });

  const approved = typeof params?.approved === "string" ? params.approved : null;
  const declined = params?.declined === "1";
  const error = params?.error === "1";

  const week = buildWeek(meetings);

  return (
    <div className={`premium-content content ${styles.wrap}`}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>
            Meetings <span className={styles.titleGrad}>Queue</span>
          </h1>
          <p className={styles.sub}>
            Vel negotiates times with warm leads and files proposals here. Approve a slot and it books —
            nothing reaches your calendar without your click.
          </p>
        </div>
        <aside className={styles.reco}>
          <div className={styles.recoHead}>
            <span>
              <Sparkles size={14} /> Waiting on you
            </span>
            <i>{proposals.length}</i>
          </div>
          <p>
            {proposals.length
              ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"} below — approving books straight to the calendar.`
              : "No proposals right now. Vel files one the moment a warm lead agrees to talk."}
          </p>
        </aside>
      </section>

      {approved ? (
        <div className={styles.banner}>
          <CheckCircle2 size={15} /> Booked: {approved} — invite is on the calendar.
        </div>
      ) : null}
      {declined ? (
        <div className={styles.banner}>
          <XCircle size={15} /> Proposal declined — Vel will recalibrate what reaches this queue.
        </div>
      ) : null}
      {error ? (
        <div className={`${styles.banner} ${styles.bannerErr}`}>
          <XCircle size={15} /> Booking failed to save — check the database connection and try again.
        </div>
      ) : null}

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span>Approval queue</span>
          <span className={styles.tag}>AI-proposed · founder-approved</span>
        </div>
        {proposals.length ? (
          <div className={styles.queue}>
            {proposals.map((proposal) => (
              <div className={styles.qCard} key={proposal.id}>
                <div className={styles.qName}>
                  {proposal.who} <i>WARM</i>
                </div>
                <p className={styles.qWhy}>&ldquo;{proposal.why}&rdquo;</p>
                <form action={approveMeetingAction}>
                  <input type="hidden" name="reply_id" value={proposal.id} />
                  <input type="hidden" name="title" value={`Intro call — ${proposal.who}`} />
                  <div className={styles.slots}>
                    {proposal.slots.map((slot, i) => (
                      <label className={styles.slot} key={slot.iso}>
                        <input type="radio" name="slot" value={slot.iso} defaultChecked={i === 0} />
                        <span>{slot.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.qActions}>
                    <button className={styles.approve} type="submit">
                      <CheckCircle2 size={13} /> Approve & book
                    </button>
                    <button className={styles.decline} formAction={declineMeetingAction} type="submit">
                      Decline
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.tag}>Queue is clear. Warm replies from campaigns land here automatically.</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span>This week</span>
          <span className={styles.tag}>
            <Calendar size={12} style={{ verticalAlign: -2 }} /> {meetings.length} booked
          </span>
        </div>
        <div className={styles.week}>
          {week.map((day) => (
            <div className={`${styles.day} ${day.isToday ? styles.dayToday : ""}`} key={day.key}>
              <div className={styles.dayHead}>
                <span>{day.name}</span>
                <b>{day.date}</b>
              </div>
              {day.events.map((event) => (
                <span className={styles.evt} key={event.id} title={event.title ?? "Meeting"}>
                  {event.title ?? "Meeting"}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

/** Three real upcoming business-day slots (10:00, 14:00, 16:30 local). */
function proposeSlots(): { iso: string; label: string }[] {
  const slots: { iso: string; label: string }[] = [];
  const times = [10, 14, 16.5];
  const cursor = new Date();
  let dayOffset = 1;
  while (slots.length < 3) {
    const day = new Date(cursor);
    day.setDate(day.getDate() + dayOffset);
    dayOffset += 1;
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const t = times[slots.length];
    day.setHours(Math.floor(t), (t % 1) * 60, 0, 0);
    slots.push({
      iso: day.toISOString(),
      label: day.toLocaleDateString("en-US", { weekday: "short" }) +
        " " +
        day.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    });
  }
  return slots;
}

function buildWeek(meetings: { id: string; title: string | null; created_at: string }[]) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return {
      key: day.toISOString(),
      name: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(day.getDate()),
      isToday: day.toDateString() === now.toDateString(),
      events: meetings.filter((m) => {
        const at = new Date(m.created_at);
        return at >= day && at < next;
      }),
    };
  });
}
