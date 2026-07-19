import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { getBalance } from "@/lib/billing/ledger";
import { resolveCreditAccount } from "@/lib/billing/account";
import { loadSalesSettings } from "@/app/sales/settings/actions";
import { CampaignWizard, type CrmLead } from "./wizard";

export const dynamic = "force-dynamic";

export default async function NewSalesCampaignPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = createServiceClient();
  const [{ data: pool }, { data: googleToken }, { settings }, account] = await Promise.all([
    db
      .from("leads")
      .select("id,email,first_name,last_name,full_name,company,title")
      .eq("user_id", user.id)
      .is("campaign_id", null)
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("google_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
    loadSalesSettings(user.id),
    resolveCreditAccount(user.id),
  ]);
  const balance = await getBalance(account.billingUserId);

  const crmLeads: CrmLead[] = (pool ?? [])
    .filter((l) => (l.email ?? "").includes("@"))
    .map((l) => ({
      id: l.id,
      email: l.email ?? "",
      name: l.full_name ?? [l.first_name, l.last_name].filter(Boolean).join(" "),
      company: l.company ?? "",
      title: l.title ?? "",
    }));

  return (
    <CampaignWizard
      sourcingConfigured={!!process.env.APOLLO_API_KEY}
      mailboxConnected={!!googleToken}
      balance={balance}
      crmLeads={crmLeads}
      defaults={{
        dailyCap: Math.min(50, settings.dailyEmails),
        windowStart: settings.sendStart,
        windowEnd: settings.sendEnd,
        timezone: settings.timezone,
      }}
    />
  );
}
