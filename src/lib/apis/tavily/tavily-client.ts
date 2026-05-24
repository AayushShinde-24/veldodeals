import "server-only";

import { searchPublicSignals } from "@/lib/integrations/tavily";

export async function searchTavilySignals(query: string, userId: string, campaignId?: string, leadId?: string) {
  return searchPublicSignals(query, userId, campaignId, leadId);
}
