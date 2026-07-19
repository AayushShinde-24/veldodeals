import { redirect } from "next/navigation";

// Campaign analytics lives on the campaign detail's Analytics tab now.
export default async function LegacyCampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sales/campaigns/${id}?tab=analytics`);
}
