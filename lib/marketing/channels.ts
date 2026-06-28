// Advertising channels Veldo can generate + publish ads to. The provider layer is
// pluggable; real publishing requires each platform's Ads API + OAuth (flagged in
// .env.example). Until configured, publishing runs in demo mode.

export type AdChannelId = "meta" | "google" | "tiktok" | "linkedin" | "x";
export type AdFormat = "image" | "video" | "carousel";

export interface AdChannel {
  id: AdChannelId;
  name: string;
  blurb: string;
  formats: AdFormat[];
  /** env var that, when set, marks this channel as connectable/live. */
  envKey: string;
}

export const AD_CHANNELS: AdChannel[] = [
  { id: "meta", name: "Meta Ads", blurb: "Facebook & Instagram", formats: ["image", "video", "carousel"], envKey: "META_ADS_ACCESS_TOKEN" },
  { id: "google", name: "Google Ads", blurb: "Search, Display & YouTube", formats: ["image", "video"], envKey: "GOOGLE_ADS_DEVELOPER_TOKEN" },
  { id: "tiktok", name: "TikTok Ads", blurb: "Short-form video", formats: ["video"], envKey: "TIKTOK_ADS_ACCESS_TOKEN" },
  { id: "linkedin", name: "LinkedIn Ads", blurb: "B2B targeting", formats: ["image", "carousel"], envKey: "LINKEDIN_ADS_ACCESS_TOKEN" },
  { id: "x", name: "X Ads", blurb: "Reach on X", formats: ["image", "video"], envKey: "X_ADS_ACCESS_TOKEN" },
];

export function isChannelConfigured(channel: AdChannel): boolean {
  return !!process.env[channel.envKey];
}

export function getChannel(id: string): AdChannel | undefined {
  return AD_CHANNELS.find((c) => c.id === id);
}
