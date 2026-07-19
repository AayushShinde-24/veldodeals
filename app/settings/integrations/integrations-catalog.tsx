"use client";

import { useState } from "react";
import { ArrowRight, Check, KeyRound, Plug, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./integrations.module.css";

type Method = "OAuth" | "API key";

interface Integration {
  name: string;
  initial: string;
  color: string;
  desc: string;
  method: Method;
  /** Real OAuth kickoff where wired; "#" otherwise (simulated in the UI). */
  connectUrl: string;
  connected?: boolean;
  /** What the admin needs to enable this connector (keys / where to get them). */
  requires: string;
  /** Link to the platform's developer/app console. */
  docsUrl: string;
}

interface Category {
  id: "sales" | "marketing" | "fundraising";
  label: string;
  blurb: string;
  items: Integration[];
}

// Only third-party tools a user connects THEIR OWN account to — never Veldo's own
// internal providers (Apollo, Anthropic, Tavily, ZeroBounce, Dodo), which power the
// product under the hood and are configured via environment variables, not here.
const CATEGORIES: Category[] = [
  {
    id: "sales",
    label: "Sales",
    blurb: "Connect the tools your outbound runs on — mailbox, calendar, and CRM.",
    items: [
      { name: "Gmail", initial: "G", color: "#ea4335", method: "OAuth", connectUrl: "/api/mailbox/connect", connected: true, desc: "Send, track opens & clicks, and sync replies from your Gmail.", requires: "Google OAuth app — GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, Gmail scope enabled.", docsUrl: "https://console.cloud.google.com/apis/credentials" },
      { name: "Google Calendar", initial: "C", color: "#4285f4", method: "OAuth", connectUrl: "/api/mailbox/connect", desc: "Auto-book meetings on your calendar the moment a lead says yes.", requires: "Same Google OAuth app with the Calendar scope enabled.", docsUrl: "https://console.cloud.google.com/apis/credentials" },
      { name: "Outlook", initial: "O", color: "#0078d4", method: "OAuth", connectUrl: "#", desc: "Send and sync replies from Outlook / Microsoft 365.", requires: "Azure AD app — MS_CLIENT_ID + MS_CLIENT_SECRET, Mail.Send + Mail.Read permissions.", docsUrl: "https://portal.azure.com" },
      { name: "Slack", initial: "S", color: "#611f69", method: "OAuth", connectUrl: "#", desc: "Get reply, meeting, and deal alerts in your Slack channels.", requires: "Slack app — SLACK_CLIENT_ID + SLACK_CLIENT_SECRET, chat:write scope.", docsUrl: "https://api.slack.com/apps" },
      { name: "HubSpot", initial: "H", color: "#ff7a59", method: "OAuth", connectUrl: "#", desc: "Two-way sync of contacts, companies, and deals.", requires: "HubSpot app — HUBSPOT_CLIENT_ID + HUBSPOT_CLIENT_SECRET, CRM scopes.", docsUrl: "https://developers.hubspot.com/" },
      { name: "Salesforce", initial: "S", color: "#00a1e0", method: "OAuth", connectUrl: "#", desc: "Push qualified leads and closed deals to Salesforce.", requires: "Connected App — SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET.", docsUrl: "https://developer.salesforce.com/" },
      { name: "Pipedrive", initial: "P", color: "#1a7a4c", method: "OAuth", connectUrl: "#", desc: "Keep your Pipedrive pipeline in sync with Veldo.", requires: "Pipedrive app — PIPEDRIVE_CLIENT_ID + PIPEDRIVE_CLIENT_SECRET.", docsUrl: "https://developers.pipedrive.com/" },
      { name: "Zoom", initial: "Z", color: "#2d8cff", method: "OAuth", connectUrl: "#", desc: "Auto-create Zoom links for every booked meeting.", requires: "Zoom app — ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET, meeting:write scope.", docsUrl: "https://marketplace.zoom.us/" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    blurb: "Plug in your ad accounts so Veldo can launch and manage campaigns.",
    items: [
      { name: "Meta Ads", initial: "M", color: "#1877f2", method: "OAuth", connectUrl: "#", desc: "Create and manage Facebook & Instagram ad campaigns.", requires: "Meta app + Marketing API — META_ADS_ACCESS_TOKEN + META_AD_ACCOUNT_ID.", docsUrl: "https://developers.facebook.com/" },
      { name: "Instagram", initial: "I", color: "#e4405f", method: "OAuth", connectUrl: "#", desc: "Publish and boost Instagram posts and reels.", requires: "Meta app (Instagram Graph API) — uses the Meta token above.", docsUrl: "https://developers.facebook.com/docs/instagram-api/" },
      { name: "TikTok Ads", initial: "T", color: "#ee1d52", method: "OAuth", connectUrl: "#", desc: "Run short-form video ad campaigns on TikTok.", requires: "TikTok Marketing API app — TIKTOK_ADS_ACCESS_TOKEN.", docsUrl: "https://ads.tiktok.com/marketing_api/" },
      { name: "Google Ads", initial: "G", color: "#fbbc05", method: "OAuth", connectUrl: "#", desc: "Search, Display, and YouTube ad campaigns.", requires: "Google Ads API — GOOGLE_ADS_DEVELOPER_TOKEN + GOOGLE_ADS_CUSTOMER_ID + OAuth.", docsUrl: "https://developers.google.com/google-ads/api/docs/start" },
      { name: "YouTube Ads", initial: "Y", color: "#ff0000", method: "OAuth", connectUrl: "#", desc: "Run video ad campaigns across YouTube.", requires: "Runs through the Google Ads API token above (video campaigns).", docsUrl: "https://developers.google.com/google-ads/api/docs/start" },
      { name: "LinkedIn Ads", initial: "L", color: "#0a66c2", method: "OAuth", connectUrl: "#", desc: "B2B-targeted ad campaigns on LinkedIn.", requires: "LinkedIn Marketing Developer Platform — LINKEDIN_ADS_ACCESS_TOKEN.", docsUrl: "https://learn.microsoft.com/linkedin/marketing/" },
    ],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    blurb: "Connect investor tools to source, share, and track your raise.",
    items: [
      { name: "Carta", initial: "C", color: "#4e5ff6", method: "OAuth", connectUrl: "#", desc: "Sync your cap table and keep investor records current.", requires: "Carta API partner access — CARTA_CLIENT_ID + CARTA_CLIENT_SECRET.", docsUrl: "https://developers.carta.com/" },
      { name: "AngelList", initial: "A", color: "#4b5563", method: "OAuth", connectUrl: "#", desc: "Reach angels and syndicates on AngelList.", requires: "AngelList / Wellfound API token — ANGELLIST_ACCESS_TOKEN.", docsUrl: "https://wellfound.com/" },
      { name: "Crunchbase", initial: "C", color: "#146aff", method: "API key", connectUrl: "#", desc: "Enrich investor, fund, and company data.", requires: "Crunchbase Enterprise API key — CRUNCHBASE_API_KEY.", docsUrl: "https://data.crunchbase.com/docs" },
      { name: "DocSend", initial: "D", color: "#2b6cb0", method: "OAuth", connectUrl: "#", desc: "Share your pitch deck and track investor engagement.", requires: "DocSend (Dropbox) API app — DOCSEND_CLIENT_ID + DOCSEND_CLIENT_SECRET.", docsUrl: "https://www.dropbox.com/developers" },
    ],
  },
];

function IntegrationCard({ item, index }: { item: Integration; index: number }) {
  const [opening, setOpening] = useState(false);
  const [showReq, setShowReq] = useState(false);

  function onConnect() {
    if (item.connectUrl && item.connectUrl !== "#") {
      window.location.href = item.connectUrl;
      return;
    }
    // Simulate the OAuth hand-off so the flow is clear in the prototype.
    setOpening(true);
    setTimeout(() => setOpening(false), 2600);
  }

  return (
    <div className={styles.card} style={{ animationDelay: `${index * 60}ms`, ["--brand" as string]: item.color }}>
      <div className={styles.cardTop}>
        <span className={styles.logo} aria-hidden="true">{item.initial}</span>
        {item.connected ? (
          <span className={`${styles.status} ${styles.statusOn}`}><Check size={12} strokeWidth={3} /> Connected</span>
        ) : (
          <span className={styles.method}><ShieldCheck size={11} /> {item.method}</span>
        )}
      </div>
      <div className={styles.cardName}>{item.name}</div>
      <p className={styles.cardDesc}>{item.desc}</p>

      <button className={styles.reqToggle} type="button" onClick={() => setShowReq((v) => !v)}>
        <KeyRound size={11} /> {showReq ? "Hide requirements" : "What you'll need"}
      </button>
      {showReq && (
        <div className={styles.reqBox}>
          <p>{item.requires}</p>
          <a href={item.docsUrl} target="_blank" rel="noreferrer">Open developer console →</a>
        </div>
      )}

      {item.connected ? (
        <button className={`${styles.connectBtn} ${styles.manageBtn}`} type="button">Manage</button>
      ) : opening ? (
        <div className={styles.opening}>Opening {item.name} sign-in…</div>
      ) : (
        <button className={styles.connectBtn} type="button" onClick={onConnect}>
          Connect <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

export function IntegrationsCatalog() {
  const [active, setActive] = useState(0);
  const cat = CATEGORIES[active];

  return (
    <div className={styles.catalog}>
      {/* how connecting works */}
      <div className={styles.howBand}>
        <div className={styles.howIcon}><Plug size={18} /></div>
        <div>
          <strong className={styles.howTitle}>How connecting works</strong>
          <p className={styles.howText}>
            Click <b>Connect</b> on any tool → you&apos;re sent to that platform to sign in and
            authorize Veldo (only the access it needs) → you&apos;re back, connected. Veldo never
            sees your password, tokens are encrypted, and you can revoke access here anytime.
          </p>
        </div>
      </div>

      {/* cylindrical 3-way toggle — Sales / Marketing / Fundraising */}
      <div className={styles.toggleWrap}>
        <div className={styles.toggle} role="tablist" aria-label="Integration categories">
          <span className={styles.thumb} style={{ transform: `translateX(${active * 100}%)` }} />
          {CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={i === active}
              className={`${styles.segBtn} ${i === active ? styles.segActive : ""}`}
              onClick={() => setActive(i)}
            >
              {c.label}
              <span className={styles.segCount}>{c.items.length}</span>
            </button>
          ))}
        </div>
      </div>
      <p className={styles.catSub}><Sparkles size={13} /> {cat.blurb}</p>

      {/* cards */}
      <div className={styles.grid} key={cat.id}>
        {cat.items.map((item, i) => (
          <IntegrationCard key={item.name} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
