import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

// Provider-agnostic voice calling. A single interface over Vapi / Bland / Retell,
// selected by env. Without a key we return a mock handle so the pipeline (compliance,
// credits, persistence) is fully exercisable end-to-end without dialing anyone.

export interface PlaceCallInput {
  toPhone: string;
  script: string;
  fromNumber?: string;
  leadName?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceCallHandle {
  providerCallId: string;
  status: "queued" | "ringing" | "in_progress" | "mock";
  mock: boolean;
}

export interface VoiceProvider {
  name: string;
  placeCall(input: PlaceCallInput): Promise<VoiceCallHandle>;
}

class MockVoiceProvider implements VoiceProvider {
  name = "mock";
  async placeCall(): Promise<VoiceCallHandle> {
    return { providerCallId: `mock_${Date.now()}`, status: "mock", mock: true };
  }
}

class VapiProvider implements VoiceProvider {
  name = "vapi";
  constructor(private readonly apiKey: string) {}
  async placeCall(input: PlaceCallInput): Promise<VoiceCallHandle> {
    const res = await fetchWithRetry(
      "https://api.vapi.ai/call",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          customer: { number: input.toPhone, name: input.leadName },
          assistant: { firstMessage: input.script },
          metadata: input.metadata,
        }),
      },
      { provider: "vapi", endpoint: "call", shouldRetry: isTransientError, timeoutMs: 20_000 }
    );
    if (!res.ok) throw new Error(`Vapi error ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as { id?: string; status?: string };
    return { providerCallId: data.id ?? `vapi_${Date.now()}`, status: "queued", mock: false };
  }
}

class GenericBearerProvider implements VoiceProvider {
  constructor(public readonly name: string, private readonly url: string, private readonly apiKey: string) {}
  async placeCall(input: PlaceCallInput): Promise<VoiceCallHandle> {
    const res = await fetchWithRetry(
      this.url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          phone_number: input.toPhone,
          task: input.script,
          name: input.leadName,
          webhook: input.webhookUrl,
          metadata: input.metadata,
        }),
      },
      { provider: this.name, endpoint: "call", shouldRetry: isTransientError, timeoutMs: 20_000 }
    );
    if (!res.ok) throw new Error(`${this.name} error ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as { call_id?: string; id?: string };
    return { providerCallId: data.call_id ?? data.id ?? `${this.name}_${Date.now()}`, status: "queued", mock: false };
  }
}

/** Select the configured provider, or the mock when no key is present. */
export function getVoiceProvider(): VoiceProvider {
  const apiKey = process.env.VOICE_PROVIDER_API_KEY ?? "";
  if (!apiKey) return new MockVoiceProvider();
  const provider = (process.env.VOICE_PROVIDER ?? "vapi").toLowerCase();
  switch (provider) {
    case "vapi":
      return new VapiProvider(apiKey);
    case "bland":
      return new GenericBearerProvider("bland", "https://api.bland.ai/v1/calls", apiKey);
    case "retell":
      return new GenericBearerProvider("retell", "https://api.retellai.com/v2/create-phone-call", apiKey);
    default:
      return new VapiProvider(apiKey);
  }
}

export function isVoiceConfigured(): boolean {
  return !!process.env.VOICE_PROVIDER_API_KEY;
}
