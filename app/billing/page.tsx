import { redirect } from "next/navigation";

// Billing now lives under Settings. Keep this route working for old links,
// checkout return URLs (/billing?checkout=success), and bookmarks.
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const checkout = typeof params.checkout === "string" ? `?checkout=${params.checkout}` : "";
  redirect(`/settings/billing${checkout}`);
}
