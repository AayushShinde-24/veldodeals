import { createServiceClient } from "@/lib/integrations/supabase";

// Legal baseline for cold outreach. We don't give legal advice, but we enforce the
// concrete, checkable requirements of the major anti-spam regimes before allowing sends.
export interface ComplianceFields {
  company_name?: string | null;
  business_email?: string | null;
  physical_mailing_address?: string | null;
  outreach_purpose?: string | null;
  target_audience?: string | null;
  compliance_confirmation?: boolean | null;
}

export interface ComplianceReadiness {
  ready: boolean;
  missing: string[];
  regulations: { canSpam: boolean; gdpr: boolean; casl: boolean };
}

const has = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

/**
 * Pure readiness evaluation (unit-testable).
 * - CAN-SPAM (US): accurate sender identity + a valid physical postal address + unsubscribe.
 * - GDPR (EU): a stated lawful basis/purpose + identifiable sender contact.
 * - CASL (CA): sender identification + postal address + contactable business email.
 * `ready` is the hard baseline required to send at all: confirmed + CAN-SPAM satisfied.
 */
export function evaluateCompliance(fields: ComplianceFields): ComplianceReadiness {
  const canSpam = has(fields.company_name) && has(fields.physical_mailing_address);
  const gdpr = has(fields.outreach_purpose) && has(fields.business_email);
  const casl = has(fields.company_name) && has(fields.physical_mailing_address) && has(fields.business_email);

  const missing: string[] = [];
  if (!has(fields.company_name)) missing.push("company_name");
  if (!has(fields.physical_mailing_address)) missing.push("physical_mailing_address");
  if (!has(fields.business_email)) missing.push("business_email");
  if (!has(fields.outreach_purpose)) missing.push("outreach_purpose");
  if (fields.compliance_confirmation !== true) missing.push("compliance_confirmation");

  const ready = fields.compliance_confirmation === true && canSpam;
  return { ready, missing, regulations: { canSpam, gdpr, casl } };
}

/** CAN-SPAM requires a physical postal address in the message body. */
export function buildPostalIdentityLine(fields: ComplianceFields): string {
  const parts = [fields.company_name, fields.physical_mailing_address].filter(has) as string[];
  return parts.join(" · ");
}

export async function getComplianceReadiness(userId: string): Promise<ComplianceReadiness> {
  const db = createServiceClient();
  const { data } = await db
    .from("compliance_settings")
    .select("company_name, business_email, physical_mailing_address, outreach_purpose, target_audience, compliance_confirmation")
    .eq("user_id", userId)
    .maybeSingle();
  return evaluateCompliance((data ?? {}) as ComplianceFields);
}

/** Returns a block reason if the user isn't allowed to send yet, else null. */
export async function complianceBlockReason(userId: string): Promise<string | null> {
  const readiness = await getComplianceReadiness(userId);
  if (readiness.ready) return null;
  if (readiness.missing.includes("compliance_confirmation")) {
    return "Confirm your sending compliance in Settings → Compliance before sending.";
  }
  return `Compliance profile incomplete: add ${readiness.missing.join(", ")} in Settings → Compliance.`;
}
