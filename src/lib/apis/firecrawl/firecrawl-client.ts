import "server-only";

import { crawlCompanyWebsite } from "@/lib/integrations/firecrawl";

export async function researchCompanyWebsite(url: string, userId: string, campaignId?: string, leadId?: string) {
  return crawlCompanyWebsite(url, userId, campaignId, leadId);
}
