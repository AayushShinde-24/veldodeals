import "server-only";

import { getDb, logAgent, saveDecision } from "@/lib/agents/agent-helpers";
import { billingCreditsOutputSchema, type AgentContext, type BillingCreditsOutput } from "@/lib/agents/schemas";

export async function runBillingCreditsAgent(input: Record<string, unknown>, context: AgentContext): Promise<BillingCreditsOutput> {
  const db = getDb();
  const creditChange = Number(input.credit_change ?? 0);
  const reason = typeof input.reason === "string" ? input.reason : "manual_adjustment";
  if (creditChange > 0 && input.approved_by_admin !== true && input.payment_webhook !== true) {
    throw new Error("Credits cannot be granted without payment webhook or admin approval.");
  }

  const { data: user } = await db.from("users").select("*").eq("id", context.userId).single();
  if (!user) throw new Error("User not found.");
  const newBalance = Math.max(0, Number(user.credits_balance ?? 0) + creditChange);

  await db.from("users").update({ credits_balance: newBalance }).eq("id", context.userId);
  await db.from("credits_ledger").insert({
    user_id: context.userId,
    credit_change: creditChange,
    reason,
    new_balance: newBalance,
  });

  const output = billingCreditsOutputSchema.parse({
    user_id: context.userId,
    credit_change: creditChange,
    reason,
    new_balance: newBalance,
    ledger_saved: true,
  });

  await logAgent(db, { ...context, agentName: "billing_credits" }, "Credits ledger updated.", "info", { credit_change: creditChange });
  await saveDecision(db, { ...context, agentName: "billing_credits" }, output, 100, false);
  return output;
}
