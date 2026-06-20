import { createServiceClient } from "@/lib/integrations/supabase";

// New mailboxes must ramp send volume gradually to build sender reputation. Day 1
// starts low and increases until the mailbox is "warmed up" (~3 weeks), after which
// the plan/compliance daily limit governs.
export const WARMUP_START_CAP = 20;
export const WARMUP_DAILY_INCREMENT = 15;
export const WARMUP_DAYS = 21;
export const WARMUP_MAX_CAP = 200;

export interface WarmupState {
  day: number;
  dailyCap: number;
  warmedUp: boolean;
}

/**
 * Pure warmup ramp (unit-testable). Given the warmup day (1-based) and an upper bound,
 * returns the day's send cap. Linear ramp from WARMUP_START_CAP, clamped to maxCap.
 */
export function warmupDailyCap(day: number, maxCap: number = WARMUP_MAX_CAP): number {
  if (day >= WARMUP_DAYS) return maxCap;
  const d = Math.max(1, Math.floor(day));
  const cap = WARMUP_START_CAP + (d - 1) * WARMUP_DAILY_INCREMENT;
  return Math.min(maxCap, cap);
}

/** Days elapsed (1-based) since warmup began. */
export function warmupDayFrom(startedAt: Date | null, now: Date = new Date()): number {
  if (!startedAt) return 1;
  const elapsedDays = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, elapsedDays + 1);
}

/** Compute warmup state from a start date and the plan's daily ceiling. */
export function computeWarmupState(startedAt: Date | null, maxCap: number = WARMUP_MAX_CAP, now: Date = new Date()): WarmupState {
  const day = warmupDayFrom(startedAt, now);
  return { day, dailyCap: warmupDailyCap(day, maxCap), warmedUp: day >= WARMUP_DAYS };
}

/**
 * Load (and lazily initialize) the mailbox warmup state for a user. The first call
 * stamps warmup_started_at so the ramp begins from the mailbox's first health check.
 */
export async function getWarmupState(userId: string, maxCap: number = WARMUP_MAX_CAP): Promise<WarmupState> {
  const db = createServiceClient();
  const { data } = await db
    .from("google_tokens")
    .select("warmup_started_at, warmup_paused")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    // No mailbox; treat as fully warmed (the send path enforces connection separately).
    return { day: WARMUP_DAYS, dailyCap: maxCap, warmedUp: true };
  }

  if (data.warmup_paused) {
    return { day: 1, dailyCap: WARMUP_START_CAP, warmedUp: false };
  }

  let startedAt = data.warmup_started_at ? new Date(data.warmup_started_at) : null;
  if (!startedAt) {
    startedAt = new Date();
    await db.from("google_tokens").update({ warmup_started_at: startedAt.toISOString() }).eq("user_id", userId);
  }

  return computeWarmupState(startedAt, maxCap);
}

/** Effective daily send cap = the lower of the plan/compliance limit and the warmup cap. */
export async function effectiveDailyCap(userId: string, planLimit: number): Promise<number> {
  const { dailyCap } = await getWarmupState(userId, planLimit);
  return Math.min(planLimit, dailyCap);
}
