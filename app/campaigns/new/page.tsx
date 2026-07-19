import { redirect } from "next/navigation";

// The campaign builder moved into the Sales pillar (Sales → Campaigns → New).
export default function LegacyNewCampaignPage() {
  redirect("/sales/campaigns/new");
}
