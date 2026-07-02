import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const publicFiles = [
  "app/page.tsx",
  "app/login/page.tsx",
  "app/signup/page.tsx",
  "app/agent/veldo-chat-client.tsx",
  "app/dashboard/page.tsx",
  "app/campaigns/page.tsx",
  "app/campaigns/new/page.tsx",
  "app/campaigns/[id]/page.tsx",
  "app/campaigns/[id]/drafts/page.tsx",
  "app/leads/page.tsx",
  "app/lead-finder/page.tsx",
  "app/leads/import/page.tsx",
  "app/inbox/page.tsx",
  "app/analytics/page.tsx",
  "app/integrations/page.tsx",
  "app/sending-accounts/page.tsx",
  "app/onboarding/page.tsx",
  "app/settings/compliance/page.tsx",
  "app/settings/api-keys/page.tsx",
  "app/agents/logs/page.tsx",
  "app/agents/tasks/page.tsx",
  "app/veldo-ui-preview/[[...slug]]/page.tsx",
];

const bannedTerms = [
  "Supabase",
  "Apollo",
  "GPT",
  "OpenAI",
  "Claude",
  "Anthropic",
  "Gmail",
  "Google",
  "Resend",
  "Firecrawl",
  "Tavily",
  "ZeroBounce",
  "Clay",
];

test("public routes and UI copy do not expose backend providers or model names", () => {
  const leaks = [];

  for (const file of publicFiles) {
    const lines = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (isInternalOnlyLine(line)) return;
      for (const term of bannedTerms) {
        if (line.includes(term)) leaks.push(`${file}:${index + 1} contains ${term}`);
      }
    });
  }

  assert.deepEqual(leaks, []);
});

test("campaign builder keeps the focused audience inputs", () => {
  const source = readFileSync(new URL("../app/campaigns/new/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Job titles/);
  assert.match(source, /Market sector/);
  assert.match(source, /Campaign name/);
  assert.match(source, /Target niche/);
  assert.match(source, /Offer \/ product/);
  assert.match(source, /Campaign goal/);
  assert.match(source, /Lead count/);

  assert.doesNotMatch(source, />\s*Location\s*</);
  assert.doesNotMatch(source, />\s*Tone\s*</);
  assert.doesNotMatch(source, />\s*Call to action\s*</);
  assert.doesNotMatch(source, />\s*Director\s*</);
  assert.doesNotMatch(source, />\s*Manager\s*</);
  assert.doesNotMatch(source, />\s*Senior\s*</);
});

function isInternalOnlyLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("import ") ||
    trimmed.includes(".replace(") ||
    trimmed.includes("getGoogleSetupState") ||
    trimmed.includes("googleUiState") ||
    trimmed.includes("const google") ||
    trimmed.includes("provider") ||
    trimmed.includes("\"gmail\"") ||
    trimmed.includes("\"resend\"") ||
    // Allowed exception: "Continue with Google" SSO is an intentional, user-facing
    // auth pattern (Google brand guidelines require showing the name). This does
    // not relax the ban on backend providers anywhere else.
    trimmed.includes("GoogleAuthButton") ||
    trimmed.includes("with Google")
  );
}
