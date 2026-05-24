import { spawn } from "node:child_process";

const baseUrl = (process.env.VELDO_AUDIT_BASE_URL ?? "http://localhost:3000").replace(/\/$/u, "");
const routes = [
  "/",
  "/login",
  "/signup",
  "/agent",
  "/dashboard",
  "/campaigns",
  "/campaigns/new",
  "/leads",
  "/lead-finder",
  "/leads/import",
  "/inbox",
  "/analytics",
  "/integrations",
  "/sending-accounts",
  "/onboarding",
  "/settings/compliance",
  "/settings/api-keys",
];

const bannedTerms = /Supabase|Apollo|GPT|OpenAI|Claude|Anthropic|Gmail|Google|Resend|Firecrawl|Tavily|ZeroBounce|Clay/u;
const errorMarkers = /Application error|Unhandled Runtime Error|Hydration failed|nextjs-portal|__nextjs_original-stack-frames|Internal Server Error/u;

let serverProcess;

try {
  await ensureServer();
  const results = [];

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    const response = await fetch(url, { redirect: "manual" });
    const html = await response.text().catch(() => "");
    const heading = extractHeading(html);
    const issues = [];

    if (response.status >= 500) issues.push(`HTTP ${response.status}`);
    if (errorMarkers.test(html)) issues.push("app error or hydration overlay marker");
    if (bannedTerms.test(html)) issues.push("banned provider/model term in public HTML");
    if (response.status >= 300 && response.status < 400 && !response.headers.get("location")) issues.push("redirect missing location");

    results.push({ route, status: response.status, heading, issues });
  }

  const failures = results.filter((result) => result.issues.length > 0);
  for (const result of results) {
    const issueText = result.issues.length ? ` - ${result.issues.join("; ")}` : "";
    console.log(`${result.status} ${result.route} ${result.heading ? `- ${result.heading}` : ""}${issueText}`);
  }

  if (failures.length) {
    console.error(`Website audit failed on ${failures.length} route(s).`);
    process.exitCode = 1;
  }
} finally {
  if (serverProcess) serverProcess.kill();
}

async function ensureServer() {
  if (await isReachable()) return;
  if (process.env.VELDO_AUDIT_NO_START === "true") {
    throw new Error(`No server is reachable at ${baseUrl}. Start the app or unset VELDO_AUDIT_NO_START.`);
  }

  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "3000");
  serverProcess = spawn(/^win/i.test(process.platform) ? "npm.cmd" : "npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", port], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, BROWSER: "none" },
    stdio: "ignore",
  });

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await isReachable()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${baseUrl}.`);
}

async function isReachable() {
  try {
    const response = await fetch(baseUrl, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function extractHeading(html) {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/isu);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim();
}
