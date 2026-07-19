import { ok, fail } from "@/lib/api/responses";
import { isDemoMode } from "@/lib/demo/mode";
import { AD_CHANNELS, isChannelConfigured } from "@/lib/marketing/channels";

// Connection state for marketing channels. Real env-key detection; in demo mode the
// channels present as connected so the full engine is visible without credentials.
export async function GET() {
  try {
    const demo = isDemoMode();
    const base: { id: string; name: string; configured: boolean }[] = AD_CHANNELS.map((c) => ({
      id: c.id,
      name: c.name,
      configured: demo || isChannelConfigured(c),
    }));
    // Extra distribution surfaces shown in the engine (YouTube rides the Google Ads
    // token; Mailchimp has its own key).
    base.push(
      { id: "youtube", name: "YouTube Ads", configured: demo || !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN },
      { id: "mailchimp", name: "Mailchimp", configured: demo || !!process.env.MAILCHIMP_API_KEY }
    );
    return ok(base);
  } catch (error) {
    return fail(error);
  }
}
