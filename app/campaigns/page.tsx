import { redirect } from "next/navigation";

// Campaigns moved into the Sales pillar (Sales → Campaigns).
export default function LegacyCampaignsPage() {
  redirect("/sales/campaigns");
}
