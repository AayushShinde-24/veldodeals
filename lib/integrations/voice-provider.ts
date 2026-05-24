import "server-only";

import { getOptionalEnv } from "@/lib/security/env";

export type VoiceCallInput = {
  to: string;
  from?: string | null;
  script: string;
  disclosure: string;
};

export type VoiceCallResult = {
  provider: "configured" | "mock";
  status: "queued" | "needs_provider";
  providerCallId: string;
  message: string;
};

export async function queueVoiceCall(input: VoiceCallInput): Promise<VoiceCallResult> {
  const env = getOptionalEnv();
  if (!env?.VELDO_VOICE_PROVIDER_API_KEY) {
    return {
      provider: "mock",
      status: "needs_provider",
      providerCallId: `mock_call_${Date.now()}`,
      message: "Voice provider is not configured; call task was prepared for review only.",
    };
  }

  return {
    provider: "configured",
    status: "queued",
    providerCallId: `configured_call_${Date.now()}`,
    message: `Voice provider configured. Adapter boundary received script length ${input.script.length}.`,
  };
}
