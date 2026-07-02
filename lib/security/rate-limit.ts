type Entry = { tokens: number; updatedAt: number };

const store = new Map<string, Entry>();

const POLICIES: Record<string, { max: number; windowMs: number }> = {
  email_write: { max: 30, windowMs: 60_000 },
  campaign_create: { max: 10, windowMs: 60_000 },
  agent_chat: { max: 40, windowMs: 60_000 },
  lead_import: { max: 5, windowMs: 60_000 },
  email_approve: { max: 60, windowMs: 60_000 },
  email_send: { max: 20, windowMs: 60_000 },
  research: { max: 20, windowMs: 60_000 },
  default: { max: 60, windowMs: 60_000 },
};

export function applyPolicy(userId: string, policy: string): boolean {
  const { max, windowMs } = POLICIES[policy] ?? POLICIES.default;
  const key = `${policy}:${userId}`;
  return consumeToken(key, max, windowMs);
}

export function consumeToken(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  const refillPerMs = max / windowMs;

  if (!entry) {
    store.set(key, { tokens: max - 1, updatedAt: now });
    return true;
  }

  const refilled = Math.min(max, entry.tokens + (now - entry.updatedAt) * refillPerMs);
  if (refilled < 1) {
    store.set(key, { tokens: refilled, updatedAt: now });
    return false;
  }
  store.set(key, { tokens: refilled - 1, updatedAt: now });
  return true;
}

export function getRemainingRequests(userId: string, policy: string): number {
  const { max, windowMs } = POLICIES[policy] ?? POLICIES.default;
  const key = `${policy}:${userId}`;
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return max;
  const refilled = Math.min(max, entry.tokens + (now - entry.updatedAt) * (max / windowMs));
  return Math.floor(Math.max(0, refilled));
}
