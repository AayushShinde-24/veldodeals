import { generateText, hasProvider } from "@/lib/ai/router";
import { AD_CHANNELS, type AdChannelId, type AdFormat } from "@/lib/marketing/channels";

// ─────────────────────────────────────────────────────────────────────────
// Ad generation. Copy is written by the AI router; the visual creative (image/
// video) is produced via fal.ai (one key → Seedance 2.0 video + image models,
// swappable). Falls back to templated demo output when no keys are configured,
// so the whole flow is visible without credentials.
// ─────────────────────────────────────────────────────────────────────────

export interface AdGenInput {
  product: string;
  audience?: string;
  goal?: string;
  format: AdFormat;
  channels: AdChannelId[];
}

export interface ChannelVariant {
  channel: AdChannelId;
  headline: string;
  primaryText: string;
  cta: string;
}

export interface AdGenResult {
  product: string;
  format: AdFormat;
  variants: ChannelVariant[];
  /** Description of the visual concept; real media needs FAL_KEY. */
  creativeConcept: string;
  mediaUrl: string | null;
  mediaProvider: string;
  demo: boolean;
}

const FAL_VIDEO_MODEL = process.env.FAL_AD_VIDEO_MODEL ?? "fal-ai/bytedance/seedance"; // Seedance 2.0
const FAL_IMAGE_MODEL = process.env.FAL_AD_IMAGE_MODEL ?? "fal-ai/flux/dev";

const CTA_BY_GOAL: Record<string, string> = {
  signups: "Sign up free",
  sales: "Shop now",
  leads: "Get a demo",
  awareness: "Learn more",
};

export async function generateAd(input: AdGenInput): Promise<AdGenResult> {
  const channels = input.channels.length ? input.channels : (["meta", "google"] as AdChannelId[]);
  const cta = CTA_BY_GOAL[input.goal ?? "awareness"] ?? "Learn more";
  const aiReady = hasProvider("anthropic") || hasProvider("openai");

  let variants: ChannelVariant[];
  if (aiReady) {
    variants = await writeCopyWithAI(input, channels, cta);
  } else {
    variants = channels.map((channel) => templateVariant(channel, input, cta));
  }

  const creativeConcept = `${input.format === "video" ? "A 15s vertical video" : "A bold static creative"} for "${input.product}"${
    input.audience ? `, targeting ${input.audience}` : ""
  } — high-contrast, product-forward, with the headline overlaid.`;

  // Real media generation requires FAL_KEY; kept demo until configured.
  const falReady = !!process.env.FAL_KEY;
  const mediaProvider = input.format === "video" ? FAL_VIDEO_MODEL : FAL_IMAGE_MODEL;

  return {
    product: input.product,
    format: input.format,
    variants,
    creativeConcept,
    mediaUrl: null, // populated by the fal.ai job when FAL_KEY is set
    mediaProvider,
    demo: !falReady,
  };
}

function templateVariant(channel: AdChannelId, input: AdGenInput, cta: string): ChannelVariant {
  const name = AD_CHANNELS.find((c) => c.id === channel)?.name ?? channel;
  return {
    channel,
    headline: `${input.product} — built for ${input.audience ?? "modern teams"}`,
    primaryText: `Meet ${input.product}. ${input.goal ? `Designed to drive ${input.goal}.` : "Designed to get results."} Optimized for ${name}.`,
    cta,
  };
}

async function writeCopyWithAI(input: AdGenInput, channels: AdChannelId[], cta: string): Promise<ChannelVariant[]> {
  const results: ChannelVariant[] = [];
  for (const channel of channels) {
    const name = AD_CHANNELS.find((c) => c.id === channel)?.name ?? channel;
    try {
      const { text } = await generateText({
        tier: "fast",
        maxTokens: 300,
        system:
          "You are a senior performance-marketing copywriter. Return strict JSON " +
          '{"headline": string, "primaryText": string} — punchy, specific, compliant (no false claims).',
        messages: [
          {
            role: "user",
            content: `Write a ${name} ad for "${input.product}". Audience: ${input.audience ?? "general B2B"}. Goal: ${
              input.goal ?? "awareness"
            }. Headline <= 40 chars, primaryText <= 140 chars.`,
          },
        ],
      });
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
        headline?: string;
        primaryText?: string;
      };
      results.push({
        channel,
        headline: parsed.headline ?? templateVariant(channel, input, cta).headline,
        primaryText: parsed.primaryText ?? templateVariant(channel, input, cta).primaryText,
        cta,
      });
    } catch {
      results.push(templateVariant(channel, input, cta));
    }
  }
  return results;
}
