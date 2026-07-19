import { redirect } from "next/navigation";

// Draft review lives on the campaign detail's Drafts tab now.
export default async function LegacyCampaignDraftsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sales/campaigns/${id}?tab=drafts`);
}
