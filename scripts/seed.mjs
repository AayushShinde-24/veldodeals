#!/usr/bin/env node
// Seeds a demoable Veldo workspace for an existing auth user.
//
// Usage:
//   SEED_USER_ID=<auth-user-uuid> node scripts/seed.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment
// (loaded from .env.local if present). The user must already exist in auth.users
// (sign up through the app first), since the service key can't mint auth users here.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

// ---- load .env.local (lightweight) ----
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/u)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (!process.env[k.trim()]) process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/gu, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const USER_ID = process.env.SEED_USER_ID;

if (!URL || !KEY) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!USER_ID) {
  console.error("✗ Set SEED_USER_ID to an existing auth user id. Sign up in the app, then copy the id.");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });
const now = () => new Date().toISOString();

async function main() {
  console.log(`→ Seeding demo workspace for user ${USER_ID}…`);

  // Workspace + profile
  const { data: workspace } = await db
    .from("workspaces")
    .insert({ owner_id: USER_ID, name: "Acme Growth Co", website: "https://acme.example", industry: "B2B SaaS", company_size: "11-50", plan: "enterprise_scale", credits: 5500 })
    .select("id")
    .single();

  await db.from("profiles").upsert({
    id: USER_ID,
    email: "founder@acme.example",
    full_name: "Demo Founder",
    company_name: "Acme Growth Co",
    workspace_id: workspace?.id ?? null,
    workspace_name: "Acme Growth Co",
    plan: "enterprise_scale",
    credits: 5500,
    credits_balance: 5500,
    updated_at: now(),
  }, { onConflict: "id" });

  await db.from("compliance_settings").upsert({
    user_id: USER_ID,
    company_name: "Acme Growth Co",
    business_website: "https://acme.example",
    business_email: "founder@acme.example",
    physical_mailing_address: "1 Market St, San Francisco, CA",
    outreach_purpose: "B2B sales outreach",
    target_audience: "RevOps leaders at mid-market SaaS",
    compliance_confirmation: true,
    compliance_confirmed_at: now(),
    updated_at: now(),
  }, { onConflict: "user_id" });

  // Campaign
  const { data: campaign } = await db
    .from("campaigns")
    .insert({
      user_id: USER_ID, workspace_id: workspace?.id ?? null,
      name: "Q3 Mid-Market Outbound", goal: "Book 20 demos with RevOps leaders",
      status: "running", sending_mode: "approval_required",
      product_name: "Acme Pipeline", target_audience: "RevOps leaders",
      target_niche: "mid-market SaaS", location: "United States", workflow_progress: 40,
    })
    .select("id")
    .single();

  const campaignId = campaign?.id ?? null;

  // Leads
  const leadRows = [
    { first_name: "Jordan", last_name: "Lee", email: "jordan@northwind.example", company: "Northwind", title: "VP RevOps", stage: "personalized", score: 82, icp_score: 82 },
    { first_name: "Sam", last_name: "Rivera", email: "sam@globex.example", company: "Globex", title: "Head of Growth", stage: "verified", score: 74, icp_score: 74 },
    { first_name: "Priya", last_name: "Nair", email: "priya@initech.example", company: "Initech", title: "Director of Sales", stage: "new", score: 61, icp_score: 61 },
    { first_name: "Chris", last_name: "Okafor", email: "chris@umbrella.example", company: "Umbrella", title: "COO", stage: "approved", score: 90, icp_score: 90 },
  ].map((l) => ({ ...l, user_id: USER_ID, campaign_id: campaignId, source: "seed", full_name: `${l.first_name} ${l.last_name}` }));

  const { data: leads } = await db.from("leads").insert(leadRows).select("id");

  // One generated draft per lead
  if (leads?.length) {
    await db.from("generated_emails").insert(
      leads.map((lead, i) => ({
        user_id: USER_ID, campaign_id: campaignId, lead_id: lead.id,
        subject: `Quick idea for your pipeline`, subject_1: `Quick idea for your pipeline`,
        body: "Hi — noticed your team is scaling outbound. We help RevOps teams book more demos with less manual work. Worth a quick chat?",
        email_body: "Hi — noticed your team is scaling outbound…",
        status: i === 3 ? "approved" : "generated",
        approval_status: i === 3 ? "approved" : "pending",
        safety_status: "checked", email_score: 80 + i, personalization_reason: "Mentions their scaling motion",
      }))
    );
  }

  // A couple of sends + a reply + a deal so dashboards aren't empty
  await db.from("email_sends").insert([
    { user_id: USER_ID, campaign_id: campaignId, lead_id: leads?.[0]?.id ?? null, status: "sent", provider: "gmail", sent_at: now() },
    { user_id: USER_ID, campaign_id: campaignId, lead_id: leads?.[1]?.id ?? null, status: "sent", provider: "gmail", sent_at: now() },
  ]);

  await db.from("crm_deals").insert({
    user_id: USER_ID, lead_id: leads?.[3]?.id ?? null, campaign_id: campaignId,
    title: "Umbrella — Acme Pipeline", company: "Umbrella", stage: "meeting_booked", value: 24000, probability: 40,
  });

  await db.from("agent_logs").insert({
    user_id: USER_ID, campaign_id: campaignId, agent_name: "campaign_leader", log_level: "info",
    message: "Seed data initialized: 4 leads, 1 approved draft, 2 sends, 1 deal.",
  });

  console.log("✓ Seed complete. Open /dashboard to see live demo data.");
}

main().catch((err) => {
  console.error("✗ Seed failed:", err.message);
  process.exit(1);
});
