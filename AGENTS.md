# Veldo Agent Rules

Veldo is an AI Sales Team OS, not a single-purpose email tool. Every feature must reinforce a coordinated multi-agent workflow led by the Campaign Leader Agent.

## System Shape

- The Campaign Leader Agent owns routing, confidence checks, approval gates, credit checks, and pause/continue decisions.
- Specialist agents only perform their assigned task.
- All important outputs are persisted to Supabase.
- All decisions are logged in `agent_logs` and/or `agent_decisions`.
- Long prompts live in `lib/agents/prompts`; route handlers stay thin.
- All AI outputs are validated with Zod schemas before persistence.

## Data And Safety

- Use only user-provided, public, official API, or legally accessible business data.
- Never use private browsing history, watched reels, private likes, hidden social activity, private messages, or logged-in scraped data.
- Never invent facts about a lead or company.
- Never pretend a weak signal is strong.
- If confidence is low, set `needs_review=true`.
- Never expose API keys in frontend code.
- Never log secrets.
- Keep Supabase service role access server-only.

## Sending Gates

No email may be sent unless all gates pass:

1. Lead has email and company.
2. ICP fit score is at least 50.
3. Research confidence is at least 60.
4. Personalization risk is not high.
5. Email score is at least 75.
6. Email verification status is valid.
7. User approved the draft in the MVP.
8. Credits are available.

Credits are deducted only after a successful send usage event is recorded.

## Model Routing

- OpenAI is the control and structure brain: strict JSON, tool execution, scoring, classifications, routing, validation, analytics summaries.
- Claude is the premium reasoning and writing brain: company reasoning, personalization strategy, premium email writing, tone analysis, long summaries, nuanced rewrites.
