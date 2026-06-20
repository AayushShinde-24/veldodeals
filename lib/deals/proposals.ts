import { createServiceClient } from "@/lib/integrations/supabase";
import { generateText } from "@/lib/ai/router";
import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";
import { updateDealStage } from "@/src/lib/crm/deals";

// ─────────────────────────────────────────────────────────
// Deal-closing automation: generate a proposal, send it for e-signature, and advance
// the deal to closed_won when signed (which fires Veldo's 2.5% success fee).
// ─────────────────────────────────────────────────────────

export interface Proposal {
  id: string;
  dealId: string | null;
  title: string;
  content: string;
  status: string;
}

/** Draft a proposal for a deal using the model router and persist it. */
export async function generateProposal(input: { userId: string; dealId: string }): Promise<Proposal> {
  const db = createServiceClient();
  const { data: deal } = await db
    .from("deals")
    .select("name, company, value, contact_email, notes")
    .eq("id", input.dealId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!deal) throw new Error("Deal not found.");

  const title = `Proposal — ${deal.company || deal.name || "Untitled"}`;
  let content = `# ${title}\n\nScope and pricing to be confirmed.`;
  try {
    const result = await generateText({
      system:
        "You are a B2B sales engineer drafting a concise, professional proposal. Include: summary, scope of work, pricing, timeline, and next steps. Use only the facts provided; mark anything unknown as '[to confirm]'. Keep it tight and credible.",
      messages: [
        {
          role: "user",
          content: [
            `Company: ${deal.company ?? "[to confirm]"}`,
            `Deal: ${deal.name ?? ""}`,
            deal.value ? `Indicative value: $${Number(deal.value).toLocaleString()}` : "",
            deal.notes ? `Notes: ${deal.notes}` : "",
            "\nDraft the proposal in markdown.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tier: "deep",
      maxTokens: 1200,
    });
    if (result.text.trim()) content = result.text.trim();
  } catch {
    // Fall back to the template when no model is configured.
  }

  const { data, error } = await db
    .from("proposals")
    .insert({
      user_id: input.userId,
      deal_id: input.dealId,
      title,
      content,
      value: deal.value ?? null,
      signer_email: deal.contact_email ?? null,
      status: "draft",
      created_at: new Date().toISOString(),
    })
    .select("id, deal_id, title, content, status")
    .single();

  if (error || !data) throw new Error(`Failed to save proposal: ${error?.message}`);
  return { id: data.id, dealId: data.deal_id, title: data.title, content: data.content, status: data.status };
}

// ── E-sign provider abstraction (DocuSign / PandaDoc + mock) ──────────────

export function esignProviderName(): string {
  if (!process.env.ESIGN_PROVIDER_API_KEY) return "mock";
  return (process.env.ESIGN_PROVIDER ?? "docusign").toLowerCase();
}

/** Send a proposal for e-signature. Mock returns a simulated request id without a key. */
export async function sendForSignature(input: { userId: string; proposalId: string; signerEmail?: string }): Promise<{ status: string; esignRequestId: string; provider: string }> {
  const db = createServiceClient();
  const { data: proposal } = await db
    .from("proposals")
    .select("id, title, signer_email, content")
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!proposal) throw new Error("Proposal not found.");

  const signer = input.signerEmail ?? proposal.signer_email;
  const provider = esignProviderName();
  let esignRequestId = `mock_${Date.now()}`;

  if (provider !== "mock" && signer) {
    const res = await fetchWithRetry(
      process.env.ESIGN_API_URL ?? "https://api.pandadoc.com/public/v1/documents",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.ESIGN_PROVIDER_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ name: proposal.title, recipients: [{ email: signer }], content: proposal.content }),
      },
      { provider: "esign", endpoint: "documents", shouldRetry: isTransientError, timeoutMs: 20_000 }
    ).catch(() => null);
    if (res && res.ok) {
      const data = (await res.json()) as { id?: string; uuid?: string };
      esignRequestId = data.id ?? data.uuid ?? esignRequestId;
    }
  }

  await db
    .from("proposals")
    .update({ status: "sent", esign_provider: provider, esign_request_id: esignRequestId, signer_email: signer ?? null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", input.proposalId);

  return { status: "sent", esignRequestId, provider };
}

/**
 * Handle an e-sign completion webhook: mark the proposal signed and advance the deal to
 * closed_won, which records the 2.5% success fee.
 */
export async function handleSignatureComplete(input: { esignRequestId: string; signed: boolean }): Promise<{ updated: boolean }> {
  const db = createServiceClient();
  const { data: proposal } = await db
    .from("proposals")
    .select("id, user_id, deal_id")
    .eq("esign_request_id", input.esignRequestId)
    .maybeSingle();
  if (!proposal) return { updated: false };

  await db
    .from("proposals")
    .update({ status: input.signed ? "signed" : "declined", signed_at: input.signed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", proposal.id);

  if (input.signed && proposal.deal_id && proposal.user_id) {
    await updateDealStage(proposal.user_id, proposal.deal_id, "closed_won").catch(() => {});
  }

  return { updated: true };
}
