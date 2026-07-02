import { createServiceClient } from "@/lib/integrations/supabase";
import { isSuppressed } from "@/lib/deliverability/suppressions";
import { effectiveDailyCap } from "@/lib/deliverability/warmup";
import { complianceBlockReason } from "@/lib/deliverability/compliance-policy";

export interface ComplianceConfig {
  unsubscribeListEnabled: boolean;
  dailySendLimit: number;
  hourlySendLimit: number;
  cooldownHours: number;
  requireApproval: boolean;
  company_name?: string | null;
  business_website?: string | null;
  business_email?: string | null;
  physical_mailing_address?: string | null;
  outreach_purpose?: string | null;
  target_audience?: string | null;
  compliance_confirmation?: boolean | null;
  compliance_confirmed_at?: string | null;
  [key: string]: unknown;
}

const DEFAULTS: ComplianceConfig = {
  unsubscribeListEnabled: true,
  dailySendLimit: 200,
  hourlySendLimit: 40,
  cooldownHours: 72,
  requireApproval: true,
};

export async function getUserCompliance(userId: string): Promise<ComplianceConfig> {
  const db = createServiceClient();
  const { data } = await db
    .from("compliance_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...DEFAULTS, ...(data ?? {}) };
}

export async function checkSendCompliance(
  userId: string,
  email: string
): Promise<{ allowed: boolean; reason?: string; remainingDaily?: number; remainingHourly?: number }> {
  const db = createServiceClient();
  const config = await getUserCompliance(userId);
  const normalizedEmail = email.toLowerCase();

  // Hard legal baseline (CAN-SPAM/GDPR/CASL): no sending until the sender's compliance
  // profile is complete and confirmed.
  const blockReason = await complianceBlockReason(userId);
  if (blockReason) {
    return { allowed: false, reason: blockReason };
  }

  if (await isSuppressed({ email: normalizedEmail, userId })) {
    return { allowed: false, reason: "Email address is suppressed." };
  }

  // Check unsubscribe list
  if (config.unsubscribeListEnabled) {
    const { data: unsub } = await db
      .from("unsubscribes")
      .select("id")
      .eq("user_id", userId)
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (unsub) return { allowed: false, reason: "Email address is on the unsubscribe list." };
  }

  // Check daily send limit — capped by mailbox warmup ramp for new mailboxes.
  const dailyLimit = await effectiveDailyCap(userId, config.dailySendLimit);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await db
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("created_at", dayStart.toISOString());

  if ((count ?? 0) >= dailyLimit) {
    const warmupNote = dailyLimit < config.dailySendLimit ? " (mailbox is still warming up)" : "";
    return { allowed: false, reason: `Daily send limit of ${dailyLimit} reached${warmupNote}.` };
  }

  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);
  const { count: hourlyCount } = await db
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("created_at", hourStart.toISOString());

  if ((hourlyCount ?? 0) >= config.hourlySendLimit) {
    return { allowed: false, reason: `Hourly send limit of ${config.hourlySendLimit} reached.` };
  }

  return {
    allowed: true,
    remainingDaily: Math.max(0, dailyLimit - (count ?? 0)),
    remainingHourly: Math.max(0, config.hourlySendLimit - (hourlyCount ?? 0)),
  };
}

export async function saveUserCompliance(
  userId: string,
  config: Partial<ComplianceConfig>
): Promise<ComplianceConfig> {
  const db = createServiceClient();
  const { data } = await db
    .from("compliance_settings")
    .upsert({ user_id: userId, ...config, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  return { ...DEFAULTS, ...(data ?? {}), ...config };
}
