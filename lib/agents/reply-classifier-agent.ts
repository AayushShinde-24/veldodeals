import { createServiceClient } from "@/lib/integrations/supabase";
import { generateStructured } from "@/lib/agents/structured";

export type ReplyClass =
  | "positive"
  | "interested"
  | "neutral"
  | "objection"
  | "not_interested"
  | "unsubscribe"
  | "out_of_office"
  | "wrong_person"
  | "auto_reply";

export interface ReplyClassification {
  replyClass: ReplyClass;
  sentiment: "positive" | "neutral" | "negative";
  nextAction: string;
  shouldCreateDeal: boolean;
  shouldStopSequence: boolean;
}

interface ReplyPayload {
  reply_class: string;
  sentiment: string;
  next_action: string;
  should_create_deal: boolean;
  should_stop_sequence: boolean;
}

const VALID_CLASSES: ReplyClass[] = [
  "positive", "interested", "neutral", "objection", "not_interested",
  "unsubscribe", "out_of_office", "wrong_person", "auto_reply",
];

/**
 * Classify an inbound reply: intent, sentiment, the recommended next action, and the
 * two automation flags (create a deal / stop the sequence). Persists to email_replies
 * (and updates reply_events when a provider message id is known).
 */
export async function classifyReply(input: {
  userId: string;
  leadId?: string | null;
  campaignId?: string | null;
  replyId?: string | null;
  text: string;
}): Promise<ReplyClassification> {
  const db = createServiceClient();
  const text = (input.text ?? "").trim();
  if (!text) throw new Error("No reply text to classify.");

  const { data } = await generateStructured<ReplyPayload>({
    system:
      "You classify B2B sales email replies. Choose reply_class from: positive, interested, neutral, objection, not_interested, unsubscribe, out_of_office, wrong_person, auto_reply. should_create_deal=true only for genuine buying intent. should_stop_sequence=true for not_interested, unsubscribe, or wrong_person. Give a short next_action.",
    prompt: `Reply:\n"""${text.slice(0, 2000)}"""\n\nReturn JSON: { "reply_class": string, "sentiment": "positive"|"neutral"|"negative", "next_action": string, "should_create_deal": boolean, "should_stop_sequence": boolean }`,
    tier: "fast",
    maxTokens: 300,
  });

  const replyClass: ReplyClass = VALID_CLASSES.includes(data.reply_class as ReplyClass)
    ? (data.reply_class as ReplyClass)
    : "neutral";
  const sentiment = ["positive", "neutral", "negative"].includes(data.sentiment) ? (data.sentiment as ReplyClassification["sentiment"]) : "neutral";
  const nextAction = (data.next_action ?? "Review reply").trim();
  const shouldCreateDeal = data.should_create_deal === true;
  const shouldStopSequence =
    data.should_stop_sequence === true || ["not_interested", "unsubscribe", "wrong_person"].includes(replyClass);

  await db.from("email_replies").insert({
    user_id: input.userId,
    lead_id: input.leadId ?? null,
    classification: replyClass,
    reply_class: replyClass,
    sentiment,
    next_action: nextAction,
    should_create_deal: shouldCreateDeal,
    body: text,
    raw_reply: text,
    created_at: new Date().toISOString(),
  });

  if (input.replyId) {
    await db
      .from("reply_events")
      .update({
        reply_class: replyClass,
        sentiment,
        next_action: nextAction,
        should_create_deal: shouldCreateDeal,
        should_stop_sequence: shouldStopSequence,
      })
      .eq("user_id", input.userId)
      .eq("provider_message_id", input.replyId);
  }

  return { replyClass, sentiment, nextAction, shouldCreateDeal, shouldStopSequence };
}
