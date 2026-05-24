import "server-only";

export type SendGateInput = {
  lead?: Record<string, unknown> | null;
  icpScore?: Record<string, unknown> | null;
  research?: Record<string, unknown> | null;
  emailScore?: Record<string, unknown> | null;
  score?: Record<string, unknown> | null;
  verification?: Record<string, unknown> | null;
  strategy?: Record<string, unknown> | null;
  draft?: Record<string, unknown> | null;
  credits?: number;
  notUnsubscribed?: boolean;
  complianceReady?: boolean;
  dailySendingRemaining?: number;
  duplicateRecipient?: boolean;
  requireConnectedSendingAccount?: boolean;
  connectedSendingAccount?: boolean;
  requireAllowlist?: boolean;
  sendAllowlisted?: boolean;
};

export function evaluateSendGates(input: SendGateInput) {
  const lead = input.lead ?? {};
  const icpScore = input.icpScore ?? input.score ?? {};
  const emailQuality = input.emailScore ?? input.score ?? {};
  const fitScore = Number(icpScore.fit_score ?? lead.fit_score ?? 0);
  const researchConfidence = Number(input.research?.confidence ?? 0);
  const emailScore = Number(emailQuality.score ?? 0);
  const risk = String(input.strategy?.risk_level ?? "unknown");
  const verificationStatus = String(input.verification?.status ?? "unknown");
  const approval = String(input.draft?.approval_status ?? "needs_review");
  const credits = Number(input.credits ?? 0);
  const dailyRemaining = Number(input.dailySendingRemaining ?? 0);
  const requireConnectedSendingAccount = input.requireConnectedSendingAccount === true;
  const requireAllowlist = input.requireAllowlist === true;

  const checks = [
    {
      gate: "lead_has_email_and_company" as const,
      passed: Boolean(lead.email && lead.company),
      detail: lead.email && lead.company ? "Lead has both email and company." : "Lead must have email and company.",
    },
    {
      gate: "icp_fit_score" as const,
      passed: fitScore >= 50,
      detail: `ICP fit score is ${fitScore}; minimum is 50.`,
    },
    {
      gate: "research_confidence" as const,
      passed: researchConfidence >= 60,
      detail: `Research confidence is ${researchConfidence}; minimum is 60.`,
    },
    {
      gate: "personalization_risk" as const,
      passed: risk !== "high",
      detail: `Personalization risk is ${risk}.`,
    },
    {
      gate: "email_score" as const,
      passed: emailScore >= 75,
      detail: `Email score is ${emailScore}; minimum is 75.`,
    },
    {
      gate: "email_verification" as const,
      passed: verificationStatus === "valid",
      detail: `Email verification status is ${verificationStatus}.`,
    },
    {
      gate: "user_approval" as const,
      passed: approval === "approved",
      detail: `Draft approval status is ${approval}.`,
    },
    {
      gate: "credits_available" as const,
      passed: credits > 0,
      detail: credits > 0 ? `${credits} credits available.` : "Credits must be available.",
    },
    {
      gate: "not_unsubscribed" as const,
      passed: input.notUnsubscribed === true,
      detail: input.notUnsubscribed === true ? "Recipient is not unsubscribed." : "Recipient unsubscribe status must be clear.",
    },
    {
      gate: "compliance_ready" as const,
      passed: input.complianceReady === true,
      detail: input.complianceReady === true ? "Compliance profile is complete." : "Compliance profile must be complete.",
    },
    {
      gate: "daily_limit_available" as const,
      passed: dailyRemaining > 0,
      detail: dailyRemaining > 0 ? `${dailyRemaining} daily sends remaining.` : "Daily sending limit must have capacity.",
    },
    {
      gate: "no_duplicate_recipient" as const,
      passed: input.duplicateRecipient !== true,
      detail: input.duplicateRecipient === true ? "Duplicate recipient in this campaign." : "No duplicate recipient detected in this campaign.",
    },
    {
      gate: "sending_account_ready" as const,
      passed: !requireConnectedSendingAccount || input.connectedSendingAccount === true,
      detail: !requireConnectedSendingAccount || input.connectedSendingAccount === true ? "Connected sending account is ready." : "A connected mailbox sending account is required.",
    },
    {
      gate: "first_release_allowlist" as const,
      passed: !requireAllowlist || input.sendAllowlisted === true,
      detail: !requireAllowlist || input.sendAllowlisted === true ? "Recipient is allowed for this sending mode." : "Recipient is not in the first-release send allowlist.",
    },
  ];

  const failures = checks.filter((check) => !check.passed).map((check) => check.detail);

  return { pass: failures.length === 0, checks, failures };
}
