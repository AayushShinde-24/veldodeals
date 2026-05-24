import { createServiceClient } from "@/lib/integrations/supabase";

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  provider: string;
  endpoint?: string;
  userId?: string;
  campaignId?: string;
  leadId?: string;
  taskId?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  await logApiError(options, lastError);
  throw lastError;
}

export async function logApiError(options: RetryOptions, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown external API error";
  const supabase = createServiceClient();

  await supabase.from("api_errors").insert({
    user_id: options.userId,
    campaign_id: options.campaignId,
    lead_id: options.leadId,
    task_id: options.taskId,
    provider: options.provider,
    endpoint: options.endpoint,
    error_message: message,
  });
}
