import { describe, it, expect } from "vitest";
import { planNextSendAt, evaluateStop, followupBundleAction, STEP_DELAYS_DAYS } from "@/lib/sequences/engine";

describe("sequence scheduling", () => {
  const from = new Date("2026-01-01T00:00:00Z");

  it("schedules the first follow-up after the first delay", () => {
    const next = planNextSendAt(0, 3, from);
    expect(next).not.toBeNull();
    const days = (next!.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(STEP_DELAYS_DAYS[0]);
  });

  it("returns null once all steps are sent (sequence complete)", () => {
    expect(planNextSendAt(3, 3, from)).toBeNull();
    expect(planNextSendAt(5, 5, from)).toBeNull();
  });

  it("uses increasing gaps for later steps", () => {
    expect(planNextSendAt(1, 3, from)!.getTime()).toBeGreaterThan(planNextSendAt(0, 3, from)!.getTime());
  });
});

describe("follow-up bundle pricing action", () => {
  it("maps step count to the confirmed bundle (3→followup_3, 5→followup_5)", () => {
    expect(followupBundleAction(3)).toBe("followup_3");
    expect(followupBundleAction(2)).toBe("followup_3");
    expect(followupBundleAction(5)).toBe("followup_5");
    expect(followupBundleAction(4)).toBe("followup_5");
  });
});

describe("sequence stop conditions", () => {
  const none = { replied: false, unsubscribed: false, meetingBooked: false, leadStage: null };

  it("continues when no stop signal", () => {
    expect(evaluateStop(none).stop).toBe(false);
  });

  it("stops on reply, unsubscribe, or booked meeting", () => {
    expect(evaluateStop({ ...none, replied: true })).toEqual({ stop: true, reason: "replied" });
    expect(evaluateStop({ ...none, unsubscribed: true }).reason).toBe("unsubscribed");
    expect(evaluateStop({ ...none, meetingBooked: true }).reason).toBe("meeting_booked");
  });

  it("stops when the lead advances to a late-funnel stage", () => {
    expect(evaluateStop({ ...none, leadStage: "won" }).stop).toBe(true);
    expect(evaluateStop({ ...none, leadStage: "new" }).stop).toBe(false);
  });
});
