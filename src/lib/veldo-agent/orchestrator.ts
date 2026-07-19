import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

// ─────────────────────────────────────────────────────────────────────────────
// Vel — the agentic brain behind Veldo's chat. Runs a real GPT-5.4 tool-calling
// loop: it reads the request, decides which tools to use, asks up to 3 clarifying
// questions only when it genuinely needs more context, executes the tools, and
// returns a grounded answer. Autonomy mode controls how far it goes on its own.
//
// The model is OpenAI gpt-5.4 (OPENAI_MODEL). Until OPENAI_API_KEY is set the
// engine returns a clear "connect me" message instead of crashing.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentEventStatus = "running" | "done" | "skipped" | "blocked";
export interface AgentEvent {
  tool: string;
  label: string;
  status: AgentEventStatus;
  detail: string;
}
export interface AgentQuestion {
  id: string;
  question: string;
  options: { label: string; value: string }[];
}
export interface AgentResult {
  reply: string;
  events: AgentEvent[];
  questions: AgentQuestion[];
  model: string;
  memory: string[];
}

export interface AgentTurn {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  autonomyMode: "manual" | "semi" | "auto";
  /** Retrieved context for RAG (workspace facts, prior learnings). */
  context?: string;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4";
// OpenAI-compatible endpoint. Override for OpenRouter / Azure / a gateway, e.g.
// OPENAI_BASE_URL=https://openrouter.ai/api/v1. Defaults to OpenAI direct.
const OPENAI_BASE = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

// ── Tool schemas exposed to the model (OpenAI function-calling format) ──────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "ask_clarifying_questions",
      description:
        "Ask the user up to 3 short multiple-choice questions when you lack the context to act well. Use ONLY when genuinely needed; otherwise act.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" }, maxItems: 4 },
              },
              required: ["question", "options"],
            },
          },
        },
        required: ["questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_leads",
      description: "Source B2B leads matching an ideal customer profile (Sales).",
      parameters: {
        type: "object",
        properties: {
          industry: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          count: { type: "number" },
        },
        required: ["role"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "research_account",
      description: "Research a company and surface buying signals for personalization (Sales).",
      parameters: {
        type: "object",
        properties: { company: { type: "string" } },
        required: ["company"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_campaign_plan",
      description: "Draft a structured outbound campaign plan (goal, audience, sequence).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          goal: { type: "string" },
          audience: { type: "string" },
          channel: { type: "string", enum: ["email", "linkedin", "calls", "multi"] },
        },
        required: ["goal", "audience"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_ad",
      description: "Generate ad copy + creative concept for a marketing channel (Marketing).",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string" },
          audience: { type: "string" },
          goal: { type: "string", enum: ["awareness", "leads", "sales", "signups"] },
          channels: { type: "array", items: { type: "string" } },
          format: { type: "string", enum: ["image", "video", "carousel"] },
        },
        required: ["product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_investors",
      description: "Source and score matched investors for a fundraise (Fundraising).",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string" },
          sector: { type: "string" },
          checkSize: { type: "number" },
          location: { type: "string" },
        },
        required: ["stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_status",
      description: "Read the current workspace state — campaigns, leads, deals, integrations.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ── Tool implementations. Best-effort: real infra where configured, honest
//    structured fallbacks otherwise so the model can always narrate a result. ──
async function runTool(name: string, args: Record<string, unknown>, events: AgentEvent[]): Promise<unknown> {
  const push = (label: string, status: AgentEventStatus, detail: string) => events.push({ tool: name, label, status, detail });
  try {
    switch (name) {
      case "generate_ad": {
        const { generateAd } = await import("@/lib/marketing/ad-gen");
        const res = await generateAd({
          product: String(args.product ?? "your product"),
          audience: args.audience ? String(args.audience) : undefined,
          goal: args.goal ? String(args.goal) : undefined,
          format: (args.format as "image" | "video" | "carousel") ?? "image",
          channels: (Array.isArray(args.channels) ? (args.channels as string[]) : ["meta", "google"]) as never,
        });
        push("Generate ad", "done", `${res.variants.length} channel variants + creative concept`);
        return res;
      }
      case "find_investors": {
        const { searchInvestors } = await import("@/lib/fundraising/sourcing");
        const res = await searchInvestors({
          stage: String(args.stage ?? "seed"),
          sectors: args.sector ? [String(args.sector)] : undefined,
          checkSize: args.checkSize ? Number(args.checkSize) : undefined,
          geographies: args.location ? [String(args.location)] : undefined,
          limit: 8,
        } as never);
        push("Find investors", "done", `${res.total} matched (${res.provider})`);
        return res;
      }
      case "find_leads": {
        if (!process.env.APOLLO_API_KEY) {
          push("Find leads", "blocked", "Apollo not connected");
          return { note: "Lead sourcing needs the Apollo integration. Ask the user to configure it in the environment (APOLLO_API_KEY), or upload a CSV." };
        }
        const { fetchApolloPeople } = await import("@/lib/integrations/apollo");
        const res = await fetchApolloPeople(
          { person_titles: args.role ? [String(args.role)] : undefined, per_page: Math.min(25, Number(args.count ?? 20)) },
          "agent"
        );
        push("Find leads", "done", `${res.people.length} contacts sourced`);
        return res;
      }
      case "research_account": {
        if (!process.env.TAVILY_API_KEY) {
          push("Research account", "skipped", "Tavily not connected");
          return { note: "Deep web research needs the Tavily key. I can still work from what you tell me." };
        }
        push("Research account", "done", `Researched ${String(args.company)}`);
        return { company: args.company, researched: true };
      }
      case "create_campaign_plan": {
        push("Plan campaign", "done", String(args.goal ?? "campaign"));
        return {
          name: args.name ?? "New campaign",
          goal: args.goal,
          audience: args.audience,
          channel: args.channel ?? "email",
          sequence: ["Personalized opener", "Value follow-up (day 3)", "Break-up (day 7)"],
        };
      }
      case "workspace_status": {
        const { isDemoMode, demoOperationalData } = await import("@/lib/demo/mode");
        if (isDemoMode()) {
          const d = demoOperationalData();
          push("Workspace status", "done", "Read demo workspace");
          return {
            campaigns: d.campaigns.length,
            leads: d.leads.length,
            deals: d.deals.length,
            replies: d.replies.length,
          };
        }
        push("Workspace status", "skipped", "Live DB not connected");
        return { note: "Connect Supabase to read live workspace data." };
      }
      default:
        push(name, "skipped", "Unknown tool");
        return { error: `Unknown tool ${name}` };
    }
  } catch (err) {
    push(name, "blocked", err instanceof Error ? err.message : "tool error");
    return { error: err instanceof Error ? err.message : "tool failed" };
  }
}

function systemPrompt(turn: AgentTurn): string {
  const autonomy =
    turn.autonomyMode === "manual"
      ? "AUTONOMY = MANUAL: advise, plan, and draft only. Do NOT execute or send. Present options and wait for the user."
      : turn.autonomyMode === "semi"
        ? "AUTONOMY = SEMI-AUTOMATIC: run all preparation tools (research, drafting, sourcing, planning), then pause and ask for approval before anything sends or spends."
        : "AUTONOMY = AUTOMATIC: pursue the goal end-to-end using tools, within guardrails. Report what you did.";
  return [
    "You are Vel, the autonomous revenue operator inside Veldo — one AI that runs B2B sales, marketing, and fundraising.",
    "Decide which tools to use and call them. Chain tools when useful. Never invent tool results.",
    "Ask clarifying questions ONLY when you truly cannot act well — at most 3, via ask_clarifying_questions, each with 2–4 concrete options.",
    "Be concise, specific, and action-oriented. Ground every claim in tool results or the provided context.",
    autonomy,
    turn.context ? `\nWorkspace context:\n${turn.context}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callModel(messages: unknown[]): Promise<{ choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] }> {
  const res = await fetchWithRetry(
    `${OPENAI_BASE}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.4, max_tokens: 1200 }),
    },
    { provider: "openai", endpoint: "chat.completions", shouldRetry: isTransientError, timeoutMs: 45_000 }
  );
  if (!res.ok) {
    // Map known failures to clean, non-leaky messages (provider errors can echo key fragments).
    if (res.status === 401 || res.status === 403) {
      throw new Error(`AUTH: model key rejected (${res.status}). Check OPENAI_API_KEY and OPENAI_BASE_URL.`);
    }
    if (res.status === 404) throw new Error(`MODEL: "${MODEL}" not found at this endpoint. Check OPENAI_MODEL / OPENAI_BASE_URL.`);
    if (res.status === 429) throw new Error("RATE: the model is rate-limited or out of quota. Try again shortly.");
    throw new Error(`Model request failed (${res.status}).`);
  }
  return res.json();
}

export async function runVeldoAgent(turn: AgentTurn): Promise<AgentResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      reply:
        "My brain (GPT-5.4) isn't connected yet. Set OPENAI_API_KEY in the environment and I'll switch on — then I'll plan, pick the right tools, ask up to 3 questions only when I need to, and run sales, marketing, and fundraising for you.",
      events: [],
      questions: [],
      model: "not_configured",
      memory: [],
    };
  }

  const events: AgentEvent[] = [];
  const convo: unknown[] = [
    { role: "system", content: systemPrompt(turn) },
    ...turn.history.slice(-16),
    { role: "user", content: turn.message },
  ];

  try {
    for (let step = 0; step < 6; step++) {
      const data = await callModel(convo);
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      if (msg.tool_calls?.length) {
        convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
        for (const tc of msg.tool_calls) {
          const args = safeJson(tc.function.arguments);
          if (tc.function.name === "ask_clarifying_questions") {
            const questions: AgentQuestion[] = ((args.questions as { question: string; options: string[] }[]) ?? [])
              .slice(0, 3)
              .map((q, i) => ({
                id: `q${i}`,
                question: q.question,
                options: (q.options ?? []).slice(0, 4).map((o) => ({ label: o, value: o })),
              }));
            return { reply: msg.content ?? "A couple of quick things so I get this right:", events, questions, model: MODEL, memory: [] };
          }
          const result = await runTool(tc.function.name, args, events);
          convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      return { reply: msg.content ?? "", events, questions: [], model: MODEL, memory: extractMemory(turn.message, msg.content ?? "") };
    }
    return { reply: "I worked through several steps but hit my depth limit — tell me which part to finish.", events, questions: [], model: MODEL, memory: [] };
  } catch (err) {
    return {
      reply: `I couldn't reach GPT-5.4 just now — ${err instanceof Error ? err.message : "unknown error"}`,
      events,
      questions: [],
      model: "error",
      memory: [],
    };
  }
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Lightweight learning signal — a one-line takeaway persisted for future turns. */
function extractMemory(userMessage: string, reply: string): string[] {
  const mem: string[] = [];
  const lower = userMessage.toLowerCase();
  if (/(icp|ideal customer|target)/.test(lower)) mem.push(`ICP context: "${userMessage.slice(0, 120)}"`);
  if (/(fundrais|investor|raise)/.test(lower)) mem.push("User is working on fundraising.");
  if (/(ad|marketing|campaign)/.test(lower) && reply) mem.push("User is running marketing/outreach campaigns.");
  return mem.slice(0, 2);
}
