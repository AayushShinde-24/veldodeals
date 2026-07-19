import { redirect } from "next/navigation";

// Campaign detail moved into the Sales pillar.
export default async function LegacyCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sales/campaigns/${id}`);
}
