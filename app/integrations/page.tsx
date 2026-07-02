import { redirect } from "next/navigation";

// Integrations now live under Settings. Keep this route working for old
// links, OAuth return URLs, and bookmarks.
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/settings/integrations${suffix}`);
}
