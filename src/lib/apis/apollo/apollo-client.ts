import "server-only";

import { fetchApolloPeople } from "@/lib/integrations/apollo";

export async function searchApolloLeads(query: Record<string, unknown>, userId: string) {
  return fetchApolloPeople(query, userId);
}
