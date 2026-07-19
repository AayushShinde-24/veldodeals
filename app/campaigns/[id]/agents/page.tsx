import { redirect } from "next/navigation";

// Per-campaign agent activity lives on the campaign detail's Activity tab now.
export default async function LegacyCampaignAgentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sales/campaigns/${id}?tab=activity`);
}
