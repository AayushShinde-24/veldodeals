import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Filter,
  KeyRound,
  LayoutDashboard,
  Linkedin,
  LockKeyhole,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  UserCircle,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PageProps = { params: Promise<{ slug?: string[] }> };
type Stat = { label: string; value: string; trend: string; icon: ReactNode; color?: string };
type BadgeTone = "blue" | "green" | "violet" | "orange" | "red";

const navItems: Array<[string, string, LucideIcon]> = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["leads", "Leads", Users],
  ["personalization", "Personalization", Bot],
  ["campaigns", "Campaigns", Send],
  ["inbox", "Inbox", Mail],
  ["analytics", "Analytics", BarChart3],
  ["crm", "CRM", UserCircle],
  ["agents", "Agents", Bot],
  ["divider", "", Settings],
  ["billing", "Billing", WalletCards],
  ["workspace", "Settings", Settings],
];

const stats: Stat[] = [
  { label: "Emails Sent", value: "128,540", trend: "↗ 23.6% vs. Apr 12 - May 11", icon: <Send size={24} />, color: "blue" },
  { label: "Reply Rate", value: "11.7%", trend: "↗ 2.1pp vs. Apr 12 - May 11", icon: <Reply size={24} />, color: "violet" },
  { label: "Meetings Booked", value: "356", trend: "↗ 28.4% vs. Apr 12 - May 11", icon: <Calendar size={24} />, color: "cyan" },
  { label: "Pipeline Influenced", value: "$1.24M", trend: "↗ 31.7% vs. Apr 12 - May 11", icon: <CircleDollarSign size={24} />, color: "violet" },
];

const people = ["Jane Smith", "Mark Johnson", "Sarah Lee", "Daniel Kim", "Emily Davis", "Michael Brown", "Priya Patel", "James Wilson"];
const companies = ["Clearbit", "Ramp", "Leeway", "Vanta", "Notion", "Brex", "Rippling", "Carta"];

export default async function VeldoPreviewPage({ params }: PageProps) {
  const slug = (await params).slug ?? ["landing"];
  const screen = slug.join("/");

  if (screen === "landing") return <LandingPage />;
  if (screen === "pricing") return <PricingPage />;
  if (screen === "auth") return <AuthPage />;

  return (
    <VeldoShell active={activeFromScreen(screen)}>
      {renderScreen(screen)}
    </VeldoShell>
  );
}

function renderScreen(screen: string) {
  switch (screen) {
    case "dashboard":
      return <DashboardPage />;
    case "crm":
      return <CrmPage />;
    case "agents":
      return <AgentsPage />;
    case "workspace":
      return <WorkspacePage />;
    case "team":
      return <TeamPage />;
    case "sending-accounts":
      return <SendingAccountsPage />;
    case "integrations":
      return <IntegrationsPage />;
    case "billing":
      return <BillingPage />;
    case "security":
      return <SecurityPage />;
    case "profile":
      return <ProfilePage />;
    case "leads":
      return <LeadsPage />;
    case "leads/profile":
      return <LeadProfilePage />;
    case "personalization":
      return <PersonalizationPage />;
    case "campaigns":
      return <CampaignBuilderPage />;
    case "inbox":
      return <InboxPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "api-keys":
      return <ApiKeysPage />;
    default:
      return <DashboardPage />;
  }
}

function activeFromScreen(screen: string) {
  if (screen.startsWith("leads")) return "leads";
  if (["workspace", "team", "sending-accounts", "integrations", "security", "api-keys"].includes(screen)) return "workspace";
  return screen;
}

export function VeldoShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="vp-root">
      <div className="vp-shell">
        <Sidebar active={active} />
        <main className="vp-main">
          <TopNav cta={active === "agents" ? "New Agent" : active === "sending-accounts" ? "Add Account" : "New Campaign"} />
          {children}
        </main>
      </div>
    </div>
  );
}

export function Sidebar({ active }: { active: string }) {
  return (
    <aside className="vp-sidebar">
      <Logo />
      <p className="vp-tagline">AI Outreach. Intelligent Automation. Real Growth.</p>
      <nav className="vp-nav">
        {navItems.map(([key, label, Icon]) =>
          key === "divider" ? (
            <div className="vp-nav-separator" key={key} />
          ) : (
            <a className={`vp-nav-link ${active === key ? "active" : ""}`} href={`/veldo-ui-preview/${key}`} key={key}>
              <Icon size={18} />
              <span>{label}</span>
              {key === "inbox" ? <span className="vp-nav-badge">12</span> : null}
            </a>
          ),
        )}
      </nav>
      <div className="vp-sidebar-spacer" />
      <UsageCard title={active === "sending-accounts" ? "Sending Overview" : "Growth Plan"} />
      <div className="vp-user-card">
        <span className="vp-avatar">AC</span>
        <div>
          <strong style={{ fontSize: 13 }}>Acme Corp</strong>
          <p className="vp-muted" style={{ margin: "3px 0 0", fontSize: 13 }}>Andrew Carter</p>
        </div>
        <ChevronDown size={16} style={{ marginLeft: "auto" }} />
      </div>
    </aside>
  );
}

export function TopNav({ cta = "New Campaign" }: { cta?: string }) {
  return (
    <div className="vp-topnav">
      <SearchInput placeholder="Search anything..." />
      <div className="vp-top-actions">
        <span className="vp-icon-btn"><Bell size={20} /></span>
        <span className="vp-workspace"><span className="vp-workspace-icon">A</span> Acme Corp <ChevronDown size={15} /></span>
        <GradientButton><Plus size={18} /> {cta}</GradientButton>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="vp-logo-row">
      <span className="vp-logo-mark">V</span>
      <span className="vp-logo-text">Veldo</span>
    </div>
  );
}

export function SearchInput({ placeholder = "Search anything..." }: { placeholder?: string }) {
  return <div className="vp-search"><Search size={17} /> <span>{placeholder}</span><span className="vp-kbd">⌘ K</span></div>;
}

export function GradientButton({ children }: { children: ReactNode }) {
  return <span className="vp-btn primary">{children}</span>;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`vp-badge ${tone}`}>{children}</span>;
}

export function GlassCard({ children, className = "", pad = true, style }: { children: ReactNode; className?: string; pad?: boolean; style?: CSSProperties }) {
  return <section className={`vp-card ${pad ? "pad" : ""} ${className}`} style={style}>{children}</section>;
}

export function StatCard({ stat }: { stat: Stat }) {
  return (
    <GlassCard className="vp-stat" pad={false}>
      <div className="vp-stat-top">
        <span className="vp-stat-icon">{stat.icon}</span>
        <Sparkline color={stat.color} />
      </div>
      <div>
        <h3>{stat.label}</h3>
        <div className="vp-stat-value">{stat.value}</div>
        <div className="vp-trend">{stat.trend}</div>
      </div>
    </GlassCard>
  );
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <table className="vp-table">
      <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Sparkline({ color = "blue" }: { color?: string }) {
  const stroke = color === "cyan" ? "#22d3ee" : color === "violet" ? "#8b5cf6" : "#3b82f6";
  return (
    <svg className="vp-spark" viewBox="0 0 96 42" aria-hidden="true">
      <path d="M2 34 C12 34 13 31 21 31 S29 27 35 29 43 21 48 27 58 33 64 15 75 37 94 8" fill="none" stroke={stroke} strokeWidth="2.5" />
      <path d="M2 42 C20 41 36 38 48 34 S70 27 94 15 L94 42 Z" fill={stroke} opacity=".16" />
    </svg>
  );
}

function LineChart({ tall = false, color = "#3b82f6" }: { tall?: boolean; color?: string }) {
  return (
    <svg className="vp-line-chart" style={{ height: tall ? 242 : undefined }} viewBox="0 0 640 230">
      {[40, 82, 124, 166, 208].map((y) => <line key={y} x1="40" y1={y} x2="620" y2={y} stroke="rgba(255,255,255,.06)" />)}
      <path d="M42 204 L64 192 L87 190 L110 172 L133 166 L156 150 L178 156 L203 132 L226 138 L248 112 L270 109 L294 94 L316 96 L339 88 L363 86 L386 72 L408 74 L432 62 L456 48 L478 44 L501 25 L525 34 L548 18 L572 12 L618 5" fill="none" stroke={color} strokeWidth="3" />
      <path d="M42 204 L64 192 L87 190 L110 172 L133 166 L156 150 L178 156 L203 132 L226 138 L248 112 L270 109 L294 94 L316 96 L339 88 L363 86 L386 72 L408 74 L432 62 L456 48 L478 44 L501 25 L525 34 L548 18 L572 12 L618 5 L618 220 L42 220 Z" fill={color} opacity=".22" />
      <circle cx="386" cy="72" r="5" fill="#fff" stroke={color} strokeWidth="4" />
    </svg>
  );
}

function Header({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="vp-heading-row">
      <div><h1 className="vp-title">{title}</h1><p className="vp-subtitle">{subtitle}</p></div>
      {actions ? <div className="vp-top-actions">{actions}</div> : null}
    </div>
  );
}

export function UsageCard({ title = "Growth Plan" }: { title?: string }) {
  return (
    <div className="vp-side-card">
      <h3>{title}</h3>
      <p>Usage this month</p>
      <div className="vp-row" style={{ margin: "8px 0 7px" }}><strong>78,420 <span className="vp-muted" style={{ fontWeight: 400 }}>/ 100,000</span></strong><span className="vp-muted">78%</span></div>
      <div className="vp-progress"><span style={{ width: "78%" }} /></div>
      <div className="vp-btn" style={{ width: "100%", marginTop: 14 }}>Upgrade Plan <ArrowRight size={15} style={{ marginLeft: "auto" }} /></div>
    </div>
  );
}

function DashboardPage() {
  return (
    <>
      <Header title="Overview" subtitle="Your outreach performance at a glance." actions={<><span className="vp-btn">May 12 - Jun 10, 2024 <Calendar size={15} /></span><span className="vp-btn">vs. Apr 12 - May 11, 2024 <ChevronDown size={15} /></span></>} />
      <div className="vp-grid stats">{stats.map((s) => <StatCard stat={s} key={s.label} />)}</div>
      <div className="vp-grid dash-main" style={{ marginTop: 14 }}>
        <ChartCard />
        <FunnelCard />
        <ActivityFeed title="Recent Replies" />
      </div>
      <div className="vp-grid dash-main" style={{ marginTop: 14 }}>
        <CampaignTable />
        <ActiveAgents />
        <InsightsCard />
      </div>
    </>
  );
}

export function ChartCard({ title = "Pipeline Influenced" }: { title?: string }) {
  return (
    <GlassCard>
      <div className="vp-section-head"><div><h2 className="vp-card-title">{title}</h2><div className="vp-stat-value">$1.24M <Badge tone="green">↗ 31.7%</Badge></div><p className="vp-muted">$947K vs. Apr 12 - May 11, 2024</p></div><span className="vp-btn">Daily <ChevronDown size={14} /></span></div>
      <LineChart tall />
    </GlassCard>
  );
}

function FunnelCard() {
  const steps = [["12,458", 100], ["4,892", 84], ["1,506", 68], ["356", 52], ["85", 36]];
  return (
    <GlassCard>
      <h2 className="vp-card-title">Lead Source Funnel</h2>
      <div className="vp-funnel">{steps.map(([v, w], i) => <div className="vp-funnel-step" style={{ width: `${w}%`, background: i === 4 ? "linear-gradient(135deg,#22d3ee,#0f766e)" : undefined }} key={v}>{v}</div>)}</div>
      <div className="vp-row"><span className="vp-muted">Conversion rate</span><span className="vp-trend">0.7%</span></div>
    </GlassCard>
  );
}

export function ActivityFeed({ title = "Team Activity" }: { title?: string }) {
  return (
    <GlassCard>
      <div className="vp-section-head"><h2 className="vp-card-title">{title}</h2><a className="vp-muted">View all</a></div>
      <div className="vp-list" style={{ marginTop: 12 }}>
        {people.slice(0, 5).map((person, i) => (
          <div className="vp-list-row" key={person}>
            <span className="vp-mini-avatar photo" />
            <div style={{ minWidth: 0 }}><strong style={{ fontSize: 13 }}>{person}</strong><p className="vp-muted" style={{ margin: "2px 0 0", fontSize: 12 }}>{i % 2 ? "Reply Agent booked a meeting" : "Thanks for reaching out! Veldo looks..."}</p></div>
            <span className="vp-muted" style={{ marginLeft: "auto", fontSize: 12 }}>{i ? `${i * 15}m ago` : "2m ago"}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function CampaignTable() {
  const rows = [
    ["Q2 Enterprise Outreach", "Active", "42,128", "13.2%", "142", "$521K"],
    ["SaaS Founders - US", "Active", "31,245", "11.8%", "98", "$286K"],
    ["FinTech - Decision Makers", "Paused", "18,754", "9.6%", "54", "$192K"],
    ["Mid-Market Expansion", "Active", "21,843", "12.1%", "62", "$241K"],
    ["Product Launch - Q2", "Completed", "14,570", "10.4%", "28", "$74K"],
  ];
  return (
    <GlassCard>
      <div className="vp-section-head"><h2 className="vp-card-title">Campaign Performance</h2><a className="vp-muted">View all</a></div>
      <Table headers={["Campaign", "Status", "Emails Sent", "Reply Rate", "Meetings", "Pipeline"]} rows={rows.map((r) => [r[0], <Badge tone={r[1] === "Paused" ? "orange" : r[1] === "Completed" ? "blue" : "green"}>{r[1]}</Badge>, r[2], r[3], r[4], r[5]])} />
    </GlassCard>
  );
}

function ActiveAgents() {
  const rows = [["Research Agent", "12,458", "blue"], ["Personalization Agent", "8,942", "cyan"], ["Follow-up Agent", "6,231", "orange"], ["Reply Agent", "356", "violet"]];
  return (
    <GlassCard>
      <div className="vp-section-head"><h2 className="vp-card-title">Active Agents</h2><a className="vp-muted">View all</a></div>
      <div className="vp-list" style={{ marginTop: 12 }}>{rows.map(([a, n, tone]) => <div className="vp-list-row" key={a}><Badge tone={tone as BadgeTone}><Bot size={14} /></Badge><div><strong>{a}</strong><p className="vp-muted" style={{ margin: 0, fontSize: 12 }}>Running</p></div><span className="vp-badge blue" style={{ marginLeft: "auto" }}>{n}</span></div>)}</div>
    </GlassCard>
  );
}

function InsightsCard() {
  return (
    <GlassCard>
      <div className="vp-section-head"><h2 className="vp-card-title">Tasks & Insights</h2><a className="vp-muted">View all</a></div>
      <div className="vp-list" style={{ marginTop: 12 }}>
        {["AI Insight", "High Intent Leads", "Follow-ups Due", "A/B Test Result"].map((x, i) => <div className="vp-list-row" key={x}><Badge tone={["violet", "blue", "orange", "green"][i] as BadgeTone}>{i === 0 ? <Sparkles size={14} /> : i === 1 ? "23" : i === 2 ? "48" : <Zap size={14} />}</Badge><div><strong>{x}</strong><p className="vp-muted" style={{ margin: 0, fontSize: 12 }}>Reply rate is 2.1pp higher than industry average.</p></div><ChevronDown size={15} style={{ transform: "rotate(-90deg)", marginLeft: "auto" }} /></div>)}
      </div>
    </GlassCard>
  );
}

function LeadsPage() {
  const leadRows = people.slice(0, 8).map((p, i) => [<span className="vp-row" style={{ justifyContent: "flex-start" }}><span className="vp-mini-avatar photo" />{p}</span>, ["VP of Marketing", "Head of Sales", "Director of Revenue Operations"][i % 3], companies[i], <Badge tone={i % 2 ? "green" : "blue"}>{i % 2 ? "Verified" : "Deliverable"}</Badge>, <span className="vp-score-ring" style={{ width: 42, height: 42 }}><span style={{ width: 32, height: 32, fontSize: 12 }}>{92 - i * 3}</span></span>, ["High", "High", "Medium", "Medium", "Low"][i % 5]]);
  return (
    <>
      <Header title="Find Leads" subtitle="Discover and connect with the right prospects using real-time signals and filters." actions={<><span className="vp-btn"><Database size={16} /> Load Saved Search</span><span className="vp-btn"><ShieldCheck size={16} /> Save Search</span></>} />
      <GlassCard>
        <div className="vp-form-grid">{["Industry", "Role", "Company Size", "Region", "Intent", "Tech Stack"].map((f, i) => <div className="vp-field" key={f}><label>{f}</label><div className="vp-select">{["SaaS", "VP, Director", "51-200", "North America", "High Intent", "Salesforce, HubSpot"][i]} <ChevronDown size={14} /></div></div>)}</div>
      </GlassCard>
      <div className="vp-grid" style={{ gridTemplateColumns: "250px 1fr", marginTop: 14 }}>
        <GlassCard><div className="vp-section-head"><h2 className="vp-card-title">Saved Segments</h2><a>+ New Segment</a></div><div className="vp-list" style={{ marginTop: 12 }}>{["High Intent SaaS", "North America Expansion", "Mid-Market Leaders", "Sales Leaders - Q2", "Product Leaders", "Marketing Leaders"].map((s, i) => <div className="vp-row" key={s}><span>{s}</span><span style={{ color: "#3b82f6" }}>{[1248, 842, 623, 512, 423, 398][i]}</span></div>)}</div></GlassCard>
        <GlassCard><div className="vp-section-head"><h2 className="vp-card-title">1,248 leads found</h2><SearchInput placeholder="Search leads..." /></div><Table headers={["Lead", "Title", "Company", "Email Status", "Fit Score", "Intent Score"]} rows={leadRows} /></GlassCard>
      </div>
    </>
  );
}

function LeadProfilePage() {
  return (
    <>
      <div className="vp-row" style={{ justifyContent: "flex-start", gap: 22, marginBottom: 24 }}><span className="vp-mini-avatar photo" style={{ width: 98, height: 98 }} /><div><h1 className="vp-title">Jessica Lee <Linkedin size={21} color="#3b82f6" /></h1><p className="vp-subtitle">VP of Marketing</p><p className="vp-muted">Clearbit · San Francisco, CA, USA</p></div><Badge tone="red">Hot Lead</Badge><Badge tone="green">High Intent</Badge></div>
      <div className="vp-tabs"><span className="vp-tab active">Overview</span><span className="vp-tab">Activity</span><span className="vp-tab">Personalization</span><span className="vp-tab">Notes</span></div>
      <div className="vp-grid crm">
        <div className="vp-stack"><div className="vp-grid cols3"><SettingsCard title="About Jessica" items={["Jessica leads global marketing at Clearbit, driving demand generation and growth marketing.", "10+ years in B2B marketing", "Expert in ABM and SaaS GTM"]} /><SettingsCard title="Firmographic Data" items={["Company Clearbit", "Industry Software", "Company Size 201-500 employees", "Revenue $50M - $100M", "Founded 2013"]} /><SettingsCard title="Intent Signals" items={["Visited pricing page", "Downloaded 2024 Data Enrichment", "Viewed case study: Ramp x Clearbit", "Company growth", "Funding news"]} /></div><div className="vp-grid cols3"><ActivityFeed title="Engagement History" /><GlassCard><h2 className="vp-card-title">Enrichment Confidence</h2><div className="vp-row" style={{ justifyContent: "flex-start", marginTop: 18 }}><span className="vp-score-ring"><span>92%</span></span><p className="vp-muted">Profile accuracy is very high based on 28 data points.</p></div></GlassCard><SettingsCard title="AI Insights" items={["Best Contact Window Tue - Thu, 9:00 AM - 11:00 AM PST", "Preferred Channels Email, LinkedIn", "Pain Points Data quality, enrichment scalability", "Likely Interests ABM strategies"]} /></div></div>
        <GlassCard><h2 className="vp-card-title">Actions</h2><div className="vp-stack" style={{ marginTop: 14 }}><GradientButton><Send size={16} /> Add to Campaign</GradientButton><span className="vp-btn primary"><Sparkles size={16} /> Generate Intro Email</span><span className="vp-btn"><Linkedin size={16} /> Start LinkedIn Outreach</span><span className="vp-btn"><UserCircle size={16} /> Assign Owner</span></div><ActivityFeed title="Ownership" /></GlassCard>
      </div>
    </>
  );
}

function CrmPage() {
  return (
    <div className="vp-grid crm">
      <div>
        <Header title="CRM" subtitle="Manage your pipeline, deals, and relationships." actions={<><span className="vp-btn"><SlidersHorizontal size={16} /> Views</span><span className="vp-btn"><Upload size={16} /> Import</span><GradientButton><Plus size={16} /> Add Deal</GradientButton></>} />
        <div className="vp-grid stats">{["Total Pipeline|$2.78M|↗ 28.6%", "Closed Won|$842K|↗ 34.2%", "Active Deals|67|↗ 12.5%", "Avg. Deal Size|$41.2K|↗ 8.7%"].map((x) => { const [l, v, t] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: t, icon: <TrendingUp size={24} /> }} />; })}</div>
        <div className="vp-tabs" style={{ marginTop: 18 }}><span className="vp-tab active">Pipeline</span><span className="vp-tab">All Deals</span><span className="vp-tab">Forecast</span><span className="vp-tab">Won</span><span className="vp-tab">Lost</span></div>
        <KanbanBoard />
        <div className="vp-grid cols3" style={{ marginTop: 10 }}><ActivityFeed title="Contacts" /><ActivityFeed title="Activity Timeline" /><SettingsCard title="Tasks" items={["Follow up with GlobalTech", "Prepare proposal for Stratus", "Call Emma Thompson", "Send case study to InfraCore", "Demo with Northbridge Group"]} /></div>
      </div>
      <GlassCard><div className="vp-section-head"><Badge tone="blue"><Building2 size={28} /></Badge><MoreHorizontal size={18} /></div><h2 style={{ margin: "14px 0 6px" }}>GlobalTech Industries</h2><Badge tone="green">Negotiation</Badge><div className="vp-stat-value" style={{ marginTop: 18 }}>$200,000</div><div className="vp-tabs" style={{ gap: 14 }}><span className="vp-tab active">Overview</span><span className="vp-tab">Activity</span><span className="vp-tab">Contacts</span></div><SettingsCard title="Deal Summary" items={["Deal Owner Andrew Carter", "Stage Negotiation", "Probability 75%", "Expected Close May 24, 2024", "Campaign Enterprise Outreach Q2"]} /><ActivityFeed title="Contacts (2)" /><SettingsCard title="Deal Notes" items={["Strong interest in AI-powered outreach automation.", "Budget confirmed. Need to align on implementation timeline and data migration."]} /></GlassCard>
    </div>
  );
}

export function KanbanBoard() {
  const stages = ["New Leads", "Qualified", "Demo Booked", "Proposal", "Negotiation", "Won"];
  const colors = ["#3b82f6", "#8b5cf6", "#22d3ee", "#ec4899", "#f59e0b", "#22c55e"];
  return <div className="vp-kanban">{stages.map((stage, i) => <div className="vp-kanban-col" style={{ borderTopColor: colors[i] }} key={stage}><div className="vp-row"><strong>{stage}</strong><span className="vp-muted">{[12, 14, 10, 8, 6, 7][i]} deals</span></div>{[0, 1, 2].map((n) => <div className="vp-deal-card" key={n}><div className="vp-row"><strong>{["TechNova Solutions", "InfraCore Inc.", "BluePeak Analytics", "Summit Partners", "GlobalTech Industries", "Pioneer Ventures"][i]}</strong><MoreHorizontal size={13} /></div><p>{["$25,000", "$45,000", "$55,000", "$120,000", "$200,000", "$180,000"][i]}</p><p className="vp-muted">{people[(i + n) % people.length]}</p></div>)}<p style={{ textAlign: "center", color: "#c6cfdd" }}>+ Add Deal</p></div>)}</div>;
}

function AgentsPage() {
  const agentNames = ["Lead Research Agent", "Personalization Agent", "Follow-up Agent", "Reply Agent", "Meeting Booker", "CEO Agent", "Finance Agent"];
  return (
    <>
      <Header title="AI Agents" subtitle="Deploy autonomous agents that research, engage, and convert-24/7." actions={<span className="vp-btn"><LayoutDashboard size={16} /> View: Grid <ChevronDown size={14} /></span>} />
      <div className="vp-grid stats5">{["Total Agents|7", "Active|6", "Tasks Completed|12,458", "Success Rate|94.3%", "Total Time Saved|312h"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "↗ 2 vs. last 7 days", icon: <Bot size={24} /> }} />; })}</div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 254px", marginTop: 14 }}><div><div className="vp-grid cols4">{agentNames.map((a, i) => <AgentCard key={a} name={a} index={i} />)}</div><AutomationFlow /></div><div className="vp-stack"><ActivityFeed title="Team Activity" /><SettingsCard title="Agent Performance" items={agentNames.map((a, i) => `${a} ${[97.2, 96.1, 95.6, 94.8, 93.7, 93.2, 91.9][i]}%`)} /><SettingsCard title="System Health" items={["All systems operational", "API Usage 68%", "Response Time 312ms", "Uptime 99.98%"]} /></div></div>
    </>
  );
}

export function AgentCard({ name, index }: { name: string; index: number }) {
  return <GlassCard><div className="vp-row"><Badge tone={["blue", "violet", "orange", "violet", "green"][index % 5] as BadgeTone}><Bot size={20} /></Badge><Badge tone={index === 3 ? "blue" : "green"}>{index === 3 ? "Idle" : "Running"}</Badge></div><h2 style={{ margin: "12px 0 8px", fontSize: 16 }}>{name}</h2><p className="vp-muted" style={{ minHeight: 44 }}>Finds, writes, follows up, and converts prospects automatically.</p><div className="vp-grid cols3" style={{ margin: "14px 0" }}><div><p className="vp-muted">Completed</p><strong>{[2458, 1842, 2631, 2134, 1506, 842, 1045][index]}</strong></div><div><p className="vp-muted">Queue</p><strong>{[128, 96, 184, 67, 54, 31, 73][index]}</strong></div><div><p className="vp-muted">Success</p><strong>{[96.1, 93.7, 94.8, 95.6, 97.2, 91.9, 93.2][index]}%</strong></div></div><div className="vp-row"><span className="vp-icon-btn"><Send size={15} /></span><span className="vp-btn" style={{ flex: 1 }}>{index === 3 ? "Start" : "Pause"}</span><span className="vp-icon-btn"><MoreHorizontal size={15} /></span></div></GlassCard>;
}

function AutomationFlow() {
  return <GlassCard className="soft" style={{ marginTop: 14 }}><div className="vp-section-head"><div><h2 className="vp-card-title">Automation Flow</h2><p className="vp-muted">End-to-end autonomous workflow</p></div><span className="vp-btn">Edit Workflow</span></div><div className="vp-row" style={{ marginTop: 24 }}>{["Lead Research Agent", "Personalization Agent", "Follow-up Agent", "Reply Agent", "Meeting Booker", "Won Deal"].map((s, i) => <span className="vp-row" style={{ gap: 12 }} key={s}><Badge tone={["blue", "violet", "orange", "violet", "green", "orange"][i] as BadgeTone}>{s}</Badge>{i < 5 ? <ArrowRight size={20} /> : null}</span>)}</div></GlassCard>;
}

function PersonalizationPage() {
  return (
    <>
      <Header title="AI Personalization" subtitle="Create hyper-personalized outreach that gets replies." actions={<><span className="vp-btn">How it works</span><span className="vp-btn">View History</span></>} />
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 340px" }}><div className="vp-stack"><SettingsCard title="1 Select Leads / Campaign Context" items={["Jane Smith - High Fit - Clearbit", "Q2 Enterprise Outreach Active", "Prospecting Step 1 of 5"]} /><div className="vp-grid" style={{ gridTemplateColumns: "270px 1fr" }}><SettingsCard title="2 Customize Your Message" items={["Goal Book a meeting", "Tone Professional", "Focus Value", "Length Short", "Key points: AI-driven lead enrichment"]} /><GlassCard className="glow"><h2 className="vp-card-title">3 AI-Generated Intros <Badge tone="blue">6 Variations</Badge></h2>{["Clearbit's mission to make go-to-market data more actionable really stands out.", "Loved your recent post on building more efficient demand engines.", "Noticed Clearbit is scaling fast."].map((t, i) => <div className="vp-list-row" style={{ alignItems: "start", marginTop: 12 }} key={t}><p style={{ lineHeight: 1.55 }}>Hi Jane,<br />{t} We help marketing teams like yours enrich leads in real-time and drive more qualified pipeline.<br />Open to a quick chat this week?</p><span className="vp-score-ring" style={{ width: 58, height: 58 }}><span style={{ width: 42, height: 42, fontSize: 14 }}>{[92, 89, 85][i]}</span></span></div>)}<div className="vp-row"><GradientButton>Save to Campaign</GradientButton><span className="vp-btn">A/B Test</span></div></GlassCard></div></div><div className="vp-stack"><SettingsCard title="4 Personalization Variables" items={["{{first_name}} Jane", "{{company_name}} Clearbit", "{{job_title}} VP of Marketing", "{{industry}} Marketing Software", "{{location}} San Francisco, CA"]} /><SettingsCard title="5 Company Research" items={["Recent News Clearbit raised $30M Series B", "Tech Stack Segment, AWS, Snowflake, Salesforce", "Pain Signals Hiring growth in Marketing team"]} /><GlassCard><h2 className="vp-card-title">6 Quality Score</h2><div className="vp-row" style={{ marginTop: 18 }}><span className="vp-score-ring"><span>92</span></span><div className="vp-list"><Badge tone="green">Personalization High</Badge><Badge tone="green">Relevance High</Badge><Badge tone="green">Clarity High</Badge><Badge tone="orange">Call to Action Good</Badge></div></div></GlassCard></div></div>
    </>
  );
}

function CampaignBuilderPage() {
  return (
    <>
      <Header title="Campaign Builder" subtitle="Build and launch personalized outreach campaigns that drive real results." actions={<><span className="vp-btn">Save Draft</span><GradientButton>Launch Campaign</GradientButton></>} />
      <div className="vp-tabs"><span className="vp-tab active">1. Campaign</span><span className="vp-tab">2. Audience</span><span className="vp-tab">3. Sequence</span><span className="vp-tab">4. Review & Launch</span></div>
      <div className="vp-grid" style={{ gridTemplateColumns: "230px 310px 1fr 284px" }}><SettingsCard title="Campaign Name" items={["Q2 Enterprise Outreach", "Campaign Goal Generate Meetings", "Audience Enterprise - SaaS Companies", "Estimated Reach 12,458", "Send Limits", "Safety Settings enabled"]} /><SettingsCard title="Sequence Steps" items={["Email 1 Initial Outreach", "Follow-up 1 Value Follow-up", "Follow-up 2 Case Study Share", "+ Add Step", "Send Schedule May 13, 2024 9:00 AM"]} /><GlassCard><h2 className="vp-card-title">Email 1: Initial Outreach</h2><div className="vp-input" style={{ margin: "12px 0" }}>Subject: Noticed your team's growth at &#123;&#123;company_name&#125;&#125; 🚀</div><div className="vp-card pad" style={{ minHeight: 420 }}>Hi &#123;&#123;first_name&#125;&#125;,<br /><br />I noticed &#123;&#123;company_name&#125;&#125; has been growing rapidly in the &#123;&#123;industry&#125;&#125; space. Congratulations on the impressive expansion!<br /><br />Many &#123;&#123;title&#125;&#125; teams I work with are facing similar challenges around &#123;&#123;pain_point&#125;&#125;.<br /><br />Would you be open to a brief 15-minute conversation next week?<br /><br />Best regards,<br />&#123;&#123;sender_name&#125;&#125;</div></GlassCard><GlassCard><h2 className="vp-card-title">Live Preview</h2><div className="vp-card pad" style={{ marginTop: 12 }}>Subject: Noticed your team's growth at Acme Corp 🚀<br /><br />Hi Jane,<br /><br />I noticed Acme Corp has been growing rapidly in the SaaS space. Congratulations on the impressive expansion!</div><SettingsCard title="AI Suggestions" items={["Improve subject line +23% open rate", "Add social proof +18% reply rate", "Shorten email length +12% reply rate"]} /></GlassCard></div>
    </>
  );
}

function InboxPage() {
  return (
    <>
      <Header title="Inbox" subtitle="Manage conversations and engage with your leads." actions={<span className="vp-btn">May 12 - Jun 10, 2024 <Calendar size={15} /></span>} />
      <GlassCard pad={false}><div className="vp-tabs" style={{ padding: "14px 18px 0", marginBottom: 0 }}><span className="vp-tab active">All 142</span><span className="vp-tab">Unread 12</span><span className="vp-tab">Interested 38</span><span className="vp-tab">Follow-up 24</span><span className="vp-tab">Closed 68</span></div><div className="vp-grid" style={{ gridTemplateColumns: "380px 1fr", gap: 0 }}><div style={{ borderRight: "1px solid var(--vp-border)", padding: 14 }}><div className="vp-row"><span className="vp-btn">Sort: Newest</span><span className="vp-btn"><Filter size={15} /> Filters</span></div><div className="vp-list" style={{ marginTop: 14 }}>{people.map((p, i) => <div className="vp-list-row" style={{ borderColor: i === 0 ? "#3b82f6" : undefined }} key={p}><span className="vp-mini-avatar photo" /><div><strong>{p}</strong><p className="vp-muted" style={{ margin: 0 }}>{companies[i % companies.length]} · This is exactly what we've been...</p></div><Badge tone={i % 3 ? "blue" : "green"}>{i % 3 ? "Unread" : "Interested"}</Badge></div>)}</div></div><div style={{ padding: 16 }}><div className="vp-row"><div className="vp-row"><span className="vp-mini-avatar photo" /><div><strong>Jane Smith</strong><p className="vp-muted" style={{ margin: 0 }}>VP of Marketing @ Clearbit</p></div></div><Badge tone="green">Interested</Badge></div>{["Thanks for reaching out! Veldo looks really interesting.", "Hi Jane, Thanks for your response! I'd be happy to share more details on pricing and how Veldo compares.", "Yes, that would be great. How about Thursday at 2 PM ET?"].map((m, i) => <div className="vp-card pad" style={{ marginTop: 14 }} key={m}><strong>{i === 1 ? "Andrew Carter" : "Jane Smith"}</strong><p style={{ lineHeight: 1.55 }}>{m}</p></div>)}<div className="vp-row" style={{ marginTop: 14 }}><span className="vp-btn">Reply</span><span className="vp-btn">Reply All</span><span className="vp-btn">Forward</span><span className="vp-btn">Add Note</span></div><SettingsCard title="AI Reply Assistant" items={["Confirm & Add Value", "Share Case Study", "Confirm & Qualify"]} /></div></div></GlassCard>
    </>
  );
}

function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics / Revenue" subtitle="Understand revenue impact, pipeline contribution, and outreach effectiveness." actions={<><span className="vp-btn">Filters <Filter size={15} /></span><span className="vp-btn"><Download size={15} /> Export Report</span></>} />
      <div className="vp-grid stats5">{["Revenue Influenced|$1.24M", "Pipeline Influenced|$4.82M", "Meetings Booked|356", "Reply Rate|11.7%", "Opps Created|85"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "↗ 31.7%", icon: <TrendingUp size={24} /> }} />; })}</div>
      <div className="vp-grid cols3" style={{ marginTop: 14 }}><ChartCard title="Revenue Influenced Over Time" /><GlassCard><h2 className="vp-card-title">Pipeline Influenced by Campaign</h2><div className="vp-row" style={{ marginTop: 22, justifyContent: "flex-start" }}><div className="vp-donut" data-label="$4.82M Total" /><div className="vp-list">{["Q2 Enterprise Outreach $1.58M", "SaaS Founders - US $1.12M", "FinTech $0.86M", "Mid-Market $0.74M", "Product Launch $0.32M"].map((x) => <span key={x}>{x}</span>)}</div></div></GlassCard><ChartCard title="Reply Rate Trends" /></div>
      <div className="vp-grid cols3" style={{ marginTop: 14 }}><FunnelCard /><SettingsCard title="Revenue Influenced by Cohort" items={["Feb '24 $634K", "Mar '24 $602K", "Apr '24 $412K", "May '24 $221K", "Jun '24 $93K"]} /><CampaignTable /></div>
    </>
  );
}

function WorkspacePage() {
  return <SettingsPage title="Workspace Settings" subtitle="Manage your organization settings, preferences, and access." tabs={["Organization", "Members", "Teams", "Security", "Integrations", "Billing"]} />;
}

function SettingsPage({ title, subtitle, tabs }: { title: string; subtitle: string; tabs: string[] }) {
  return (
    <div className="vp-grid settings"><div><Header title={title} subtitle={subtitle} /><div className="vp-tabs">{tabs.map((t, i) => <span className={`vp-tab ${i === 0 ? "active" : ""}`} key={t}>{t}</span>)}</div><div className="vp-grid cols3"><SettingsCard title="Workspace Profile" items={["Workspace Name Acme Corp", "Workspace Logo A", "Recommended: 512x512px"]} /><SettingsCard title="Brand Colors" items={["Primary #5B6BFF", "Secondary #8B5CF6", "Accent #22D3EE"]} /><SettingsCard title="Custom Domain" items={["https://acme.veldo.ai", "SSL is enabled and auto-renewed."]} /><SettingsCard title="Default Sending Timezone" items={["(GMT-04:00) America/New York"]} /><SettingsCard title="Data Retention" items={["12 months", "Data older than 12 months will be archived."]} /><SettingsCard title="Usage Limits" items={["Emails per month 100,000", "Leads 250,000", "AI Credits 50,000"]} /></div><div className="vp-grid cols2" style={{ marginTop: 14 }}><SettingsCard title="Notification Defaults" items={["Campaign alerts In-app Email", "Lead activity In-app Email Slack", "Product updates In-app Email", "Weekly digest Email"]} /><SettingsCard title="Regional Settings" items={["Language English (US)", "Date Format May 12, 2024", "Currency USD"]} /><SettingsCard title="Workspace Members" items={["42 members across 6 teams", "Manage Members"]} /><SettingsCard title="Permission Presets" items={["Admin Full access", "Manager Manage teams", "Member Create campaigns", "Viewer View only"]} /></div></div><div className="vp-stack"><SettingsCard title="Help & Resources" items={["Workspace Settings", "Custom Domain", "Data & Security", "Contact Support"]} /><SettingsCard title="Workspace ID" items={["ws_7f3a9c2b8d", "Created Jan 14, 2024 by Andrew Carter"]} /></div></div>
  );
}

export function SettingsCard({ title, items }: { title: string; items: ReactNode[] }) {
  return <GlassCard><h2 className="vp-card-title">{title}</h2><div className="vp-list" style={{ marginTop: 14 }}>{items.map((item, i) => <div className="vp-row" key={i}><span>{item}</span>{i % 2 === 0 ? <Badge tone="green">Active</Badge> : null}</div>)}</div></GlassCard>;
}

function TeamPage() {
  const rows = people.slice(0, 7).map((p, i) => [<span className="vp-row" style={{ justifyContent: "flex-start" }}><span className="vp-mini-avatar photo" />{p}</span>, ["Owner", "Admin", "Manager", "Member", "Viewer"][i % 5], companies[i], <Badge tone={i % 2 ? "blue" : "green"}>{i % 2 ? "Invited" : "Active"}</Badge>, `${i + 1}h ago`]);
  return (
    <>
      <Header title="Team Management" subtitle="Manage members, roles, invitations, and permission coverage." actions={<GradientButton><Plus size={16} /> Invite Member</GradientButton>} />
      <div className="vp-grid stats">{["Team Members|42", "Active Seats|36", "Pending Invites|6", "Permission Presets|4"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "↗ healthy", icon: <Users size={24} /> }} />; })}</div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 320px", marginTop: 14 }}><GlassCard><div className="vp-section-head"><h2 className="vp-card-title">Members</h2><SearchInput placeholder="Search members..." /></div><Table headers={["Member", "Role", "Team", "Status", "Last Active"]} rows={rows} /></GlassCard><div className="vp-stack"><SettingsCard title="Invite Panel" items={["Work email", "Role Member", "Team Sales", "Send invite"]} /><SettingsCard title="Pending Invites" items={["emma@acme.com Manager", "liam@acme.com Member", "sophia@acme.com Viewer"]} /><ActivityFeed title="Team Activity" /></div></div>
    </>
  );
}

function SendingAccountsPage() {
  const rows = ["andrew@acmecorp.com", "jane@acmecorp.com", "growth@acmecorp.com", "outreach@acmecorp.com", "sales@acmecorp.com", "bd@acmecorp.com"].map((a, i) => [a, <Badge tone={i < 2 ? "green" : i < 4 ? "orange" : "red"}>{["Excellent", "Excellent", "Good", "Good", "Fair", "Poor"][i]}</Badge>, `${[100, 82, 56, 34, 12, 0][i]}%`, <span className="vp-row" style={{ justifyContent: "flex-start" }}><Badge tone="green">SPF</Badge><Badge tone={i > 3 ? "red" : "green"}>DKIM</Badge><Badge tone={i > 2 ? "orange" : "green"}>DMARC</Badge></span>, `${[14.2, 11.3, 9.8, 8.6, 6.3, 0][i]}%`, <MoreHorizontal size={16} />]);
  return (
    <>
      <Header title="Sending Accounts" subtitle="Manage your email accounts, deliverability, and sending performance." actions={<><span className="vp-btn">Sending best practices <ExternalLink size={14} /></span></>} />
      <div className="vp-grid stats5">{["Connected Accounts|9", "Emails Sent (7D)|128,540", "Avg. Reply Rate (7D)|11.7%", "Avg. Bounce Rate (7D)|1.2%", "Domain Reputation|Excellent"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "↗ 23.6%", icon: <Mail size={24} /> }} />; })}</div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 250px", marginTop: 14 }}><div className="vp-stack"><GlassCard><div className="vp-row"><SearchInput placeholder="Search accounts..." /><span className="vp-btn">All statuses <ChevronDown size={14} /></span></div><Table headers={["Account", "Health", "Warm-up", "Authentication", "Performance", "Actions"]} rows={rows} /></GlassCard><div className="vp-grid cols2"><ChartCard title="Performance Over Time" /><GlassCard><h2 className="vp-card-title">Domain Reputation Distribution</h2><div className="vp-row" style={{ justifyContent: "flex-start", marginTop: 18 }}><div className="vp-donut" data-label="9 Accounts" /><div className="vp-list"><span>Excellent 6 (67%)</span><span>Good 2 (22%)</span><span>Fair 1 (11%)</span><span>Poor 0 (0%)</span></div></div></GlassCard></div></div><div className="vp-stack"><SettingsCard title="Account Setup Checklist" items={["Connect your email account", "Verify your domain", "Set up SPF record", "Set up DKIM record", "Set up DMARC policy", "Complete warm-up"]} /><SettingsCard title="Warm-up Tips" items={["Keep your warm-up going", "Consistent sending improves reputation faster."]} /><SettingsCard title="Need Help?" items={["Contact Support"]} /></div></div>
    </>
  );
}

function IntegrationsPage() {
  return (
    <>
      <Header title="Integrations" subtitle="Connect your favorite tools. Sync data. Automate workflows." />
      <div className="vp-tabs"><span className="vp-tab active">All Integrations</span><span className="vp-tab">Connected 7</span><span className="vp-tab">Available 12</span></div>
      <div className="vp-grid stats">{["Connected Integrations|7 of 19", "Successful Syncs|98.7%", "Records Synced|542,128", "Syncs Today|24"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "↗ 18.4%", icon: <Database size={24} /> }} />; })}</div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 350px", marginTop: 18 }}><div><h2 className="vp-card-title" style={{ marginBottom: 12 }}>Connected Integrations</h2><div className="vp-grid cols3">{["CRM", "Sales hub", "Team chat", "Docs", "Mailbox", "Outlook"].map((x, i) => <IntegrationCard name={x} connected={i < 5} key={x} />)}</div><h2 className="vp-card-title" style={{ margin: "28px 0 12px" }}>Available Integrations</h2><div className="vp-grid cols3">{["Automation", "Workflow builder", "Lead search", "Data enrichment", "Billing"].map((x) => <IntegrationCard name={x} key={x} />)}</div></div><GlassCard><div className="vp-section-head"><h2>CRM</h2><Badge tone="green">Connected</Badge></div><p className="vp-muted">Sync leads, contacts, accounts, and opportunities in real-time.</p><GradientButton>Configure Integration</GradientButton><SettingsCard title="Sync Overview" items={["Last sync 2 minutes ago", "Next sync In 8 minutes", "Sync frequency Every 10 minutes", "Records synced 128,540", "Sync status Healthy"]} /><ChartCard title="Recent Sync Health (7 days)" /><SettingsCard title="Actions" items={["Resync Now", "Disconnect Integration"]} /></GlassCard></div>
    </>
  );
}

export function IntegrationCard({ name, connected = false }: { name: string; connected?: boolean }) {
  return <GlassCard className={name === "Salesforce" ? "glow" : ""}><div className="vp-row"><Badge tone={connected ? "green" : "violet"}>{name.slice(0, 2)}</Badge>{connected ? <Badge tone="green">Connected</Badge> : null}</div><h2 style={{ fontSize: 16, margin: "14px 0 5px" }}>{name}</h2><p className="vp-muted">Contacts, accounts, opportunities and workflow automation.</p><div className="vp-row" style={{ marginTop: 16 }}><a style={{ color: "#60a5fa" }}>{connected ? "Configure" : "Connect"}</a><MoreHorizontal size={16} /></div></GlassCard>;
}

function BillingPage() {
  return (
    <>
      <Header title="Billing" subtitle="Manage your subscription, payments, and usage." />
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 310px" }}><BillingCard /><GlassCard><h2 className="vp-card-title">Upcoming Renewal</h2><div className="vp-stat-value">Jun 10, 2024</div><p className="vp-muted">In 28 days</p><div className="vp-row" style={{ marginTop: 18 }}><span>Renewal amount</span><strong>$599.00</strong></div><SettingsCard title="Auto-renew" items={["Your subscription will automatically renew on Jun 10, 2024."]} /></GlassCard></div>
      <div className="vp-grid cols3" style={{ marginTop: 14 }}><UsageBars /><ChartCard title="Usage Trend" /><SettingsCard title="Overage Estimates" items={["Emails Within limit", "AI Credits Within limit", "Need more? View add-ons"]} /></div>
      <div className="vp-grid cols4" style={{ marginTop: 14 }}><SettingsCard title="Invoice History" items={["May 10, 2024 $599 Paid", "Apr 10, 2024 $599 Paid", "Mar 10, 2024 $599 Paid", "Feb 10, 2024 $599 Paid"]} /><SettingsCard title="Payment Method" items={["Visa ending in 4242", "Expires 04/2027", "Billing address Acme Corp"]} /><SettingsCard title="Team & Seats" items={["6 / 10 seats used", "Invite team members", "$29 / seat / month"]} /><SettingsCard title="Billing Contacts" items={["Andrew Carter Primary contact", "Jane Smith Billing contact"]} /></div>
    </>
  );
}

export function BillingCard() {
  return <GlassCard><div className="vp-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}><div><h2>Current Plan</h2><h3 style={{ marginTop: 18 }}>Growth Plan <Badge tone="green">Active</Badge></h3><div className="vp-list" style={{ marginTop: 14 }}><span>100,000 emails / month</span><span>20,000 AI personalization credits / month</span><span>10 team seats</span><span>Advanced analytics & reporting</span></div><div className="vp-row" style={{ marginTop: 18 }}><span className="vp-btn">Manage Plan</span><GradientButton>Upgrade Plan</GradientButton></div></div><div><h2>Monthly</h2><div className="vp-price">$599 <span className="vp-muted" style={{ fontSize: 14 }}>/ month</span></div><p className="vp-muted">Billed monthly</p><p style={{ marginTop: 30 }}>Next renewal<br /><strong>Jun 10, 2024</strong></p></div><div><h2>Annual <Badge tone="green">Save 20%</Badge></h2><div className="vp-price">$5,749 <span className="vp-muted" style={{ fontSize: 14 }}>/ year</span></div><p className="vp-trend">$1,439 / year saved</p><span className="vp-btn" style={{ marginTop: 44, width: "100%" }}>Switch to Annual</span></div></div></GlassCard>;
}

function UsageBars() {
  return <GlassCard><h2 className="vp-card-title">Usage This Month</h2>{[["Emails Sent", 78], ["AI Personalization Credits", 71], ["Team Seats", 60], ["Automations", 36]].map(([l, v]) => <div key={l as string} style={{ marginTop: 16 }}><div className="vp-row"><span>{l}</span><span>{v}%</span></div><div className="vp-progress"><span style={{ width: `${v}%` }} /></div></div>)}</GlassCard>;
}

function SecurityPage() {
  return (
    <>
      <Header title="Security" subtitle="Manage authentication, access controls, and security settings." />
      <div className="vp-tabs"><span className="vp-tab active">Overview</span><span className="vp-tab">Authentication</span><span className="vp-tab">Access</span><span className="vp-tab">Monitoring</span><span className="vp-tab">Policies</span><span className="vp-tab">Integrations</span></div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 410px" }}><div className="vp-stack"><SecurityCard /><div className="vp-grid cols4">{["Login Security", "Two-Factor Authentication", "Single Sign-On (SSO)", "Session Management"].map((x) => <SettingsCard title={x} items={["Status Enabled", "Manage"]} key={x} />)}</div><div className="vp-grid cols3"><SettingsCard title="Trusted Devices" items={["MacBook Pro - Chrome", "iPhone 15 Pro - iOS", "Windows 11 - Chrome"]} /><SettingsCard title="Password Policy" items={["Min length 12 characters", "Require numbers Enabled", "Require symbols Enabled"]} /><SettingsCard title="Access Rules" items={["IP allowlist Enabled", "Geo restrictions Enabled", "Session timeout 30 min"]} /></div><SettingsCard title="API Access Controls" items={["vk_live_campaigns Active", "analytics_readonly Active", "webhook_events Revoked"]} /></div><div className="vp-stack"><GlassCard className="glow"><div className="vp-row"><Badge tone="red">Medium Risk Alert</Badge><span className="vp-btn">Review activity</span></div><p className="vp-muted">Unusual sign-in activity detected from Moscow, Russia</p></GlassCard><SettingsCard title="Security Score Breakdown" items={["Authentication 95/100", "Access Controls 88/100", "Data Protection 93/100", "Monitoring 90/100", "Device Security 92/100"]} /><SettingsCard title="Audit Logs" items={["User login Andrew Carter 2m ago", "Password changed Jane Smith 1h ago", "MFA enabled Mark Johnson 2h ago", "API key created Sarah Lee 5h ago"]} /><SettingsCard title="Security Alerts" items={["Unusual sign-in location Medium", "Multiple failed login attempts High", "New device signed in Low"]} /></div></div>
    </>
  );
}

export function SecurityCard() {
  return <GlassCard><div className="vp-row" style={{ justifyContent: "flex-start", gap: 34 }}><ShieldCheck size={110} color="#3b82f6" /><div><h2>Security Score</h2><div className="vp-price">92<span className="vp-muted">/100</span> <Badge tone="green">Excellent</Badge></div><p className="vp-muted">You're doing great. Keep up the good work.</p><div className="vp-progress" style={{ width: 300, marginTop: 18 }}><span style={{ width: "92%" }} /></div></div><div className="vp-list"><Badge tone="green">MFA is enabled</Badge><Badge tone="green">Strong password policy</Badge><Badge tone="green">No critical alerts</Badge></div></div></GlassCard>;
}

function ProfilePage() {
  return (
    <>
      <Header title="Profile" subtitle="Manage your personal information, preferences, and account settings." actions={<span className="vp-btn">View Public Profile <ExternalLink size={14} /></span>} />
      <div className="vp-tabs"><span className="vp-tab active">Overview</span><span className="vp-tab">Preferences</span><span className="vp-tab">Notifications</span><span className="vp-tab">Account</span></div>
      <div className="vp-grid" style={{ gridTemplateColumns: "1fr 340px 400px" }}><div className="vp-stack"><ProfileCard /><SettingsCard title="Notification Preferences" items={["Email Notifications on", "In-App Notifications on", "Campaign Alerts on", "Lead & Reply Alerts on", "Weekly Digest on", "Product Updates off"]} /></div><div className="vp-stack"><GlassCard><h2 className="vp-card-title">Email Signature</h2><div className="vp-card glow pad" style={{ marginTop: 18 }}>Andrew Carter<br />Growth Marketing Manager<br />Acme Corp<br /><br />+1 (415) 555-9876<br />andrew.carter@acmecorp.com<br />www.acmecorp.com</div><span className="vp-btn" style={{ width: "100%", marginTop: 18 }}>Copy Signature</span></GlassCard><SettingsCard title="Appearance" items={["Theme Dark", "Accent Color violet", "Density Comfortable", "Font Size A"]} /><SettingsCard title="Quick Profile Actions" items={["Download My Data", "Export Activity Log", "Delete Account"]} /></div><div className="vp-stack"><div className="vp-grid cols2">{stats.map((s) => <StatCard stat={s} key={s.label} />)}</div><ActivityFeed title="Recent Activity" /><SettingsCard title="Connected Accounts" items={["Mailbox Connected", "Calendar Connected", "Professional network Connected", "Team chat Connected"]} /></div></div>
    </>
  );
}

export function ProfileCard() {
  return <GlassCard><div className="vp-row" style={{ justifyContent: "flex-start", alignItems: "start", gap: 26 }}><span className="vp-mini-avatar photo" style={{ width: 114, height: 114 }} /><div><h2 style={{ fontSize: 21, margin: 0 }}>Andrew Carter <Badge tone="violet">Pro</Badge></h2><p>Growth Marketing Manager</p><p>Acme Corp</p><div className="vp-list" style={{ marginTop: 18 }}><span>Email andrew.carter@acmecorp.com <Badge tone="green">Verified</Badge></span><span>Phone +1 (415) 555-9876 <Badge tone="green">Verified</Badge></span><span>Timezone America/New_York</span><span>Member since Feb 18, 2024</span></div></div></div><SettingsCard title="About you" items={["Growth marketer with a passion for data-driven strategies, automation, and building meaningful customer relationships."]} /></GlassCard>;
}

function ApiKeysPage() {
  const rows = [["Production Key", "Production", "Read / Write", "2 minutes ago", "12,458 req", "Active"], ["Automation Service", "Production", "Read / Write", "1 hour ago", "8,942 req", "Active"], ["Analytics Exporter", "Staging", "Read Only", "1 day ago", "1,230 req", "Active"], ["Dev Sandbox", "Development", "Read / Write", "3 days ago", "542 req", "Inactive"]];
  return (
    <>
      <Header title="API Keys" subtitle="Manage API access, webhooks, and connected integrations." actions={<><span className="vp-btn">API Documentation</span><GradientButton><Plus size={16} /> Create API Key</GradientButton></>} />
      <GlassCard><h2 className="vp-card-title">Your API Keys</h2><Table headers={["Name", "Environment", "Permissions", "Last Used", "Usage (30D)", "Status"]} rows={rows.map((r) => [r[0], <Badge tone={r[1] === "Staging" ? "violet" : r[1] === "Development" ? "blue" : "green"}>{r[1]}</Badge>, r[2], r[3], r[4], <Badge tone={r[5] === "Active" ? "green" : "blue"}>{r[5]}</Badge>])} /></GlassCard>
      <div className="vp-grid cols2" style={{ marginTop: 14 }}><SettingsCard title="Webhook Endpoints" items={["https://hooks.acme.com/veldo/events Primary", "https://api.acme.com/integrations/veldo Healthy"]} /><SettingsCard title="Connected Providers" items={["Slack Connected", "Zapier Connected", "Make Connected"]} /></div>
      <div className="vp-grid cols3" style={{ marginTop: 14 }}><SettingsCard title="API Usage (30 Days)" items={["Total Requests 22,458", "Rate Limit 100,000/mo", "Remaining 77,542"]} /><SettingsCard title="Rate Limits" items={["Per Minute 600 requests", "Per Hour 10,000 requests", "Per Day 200,000 requests"]} /><GlassCard className="glow"><h2 style={{ color: "#fb7185" }}>Danger Zone</h2><div className="vp-list" style={{ marginTop: 18 }}><span>Revoke All Keys</span><span>Delete All Webhooks</span></div></GlassCard></div>
    </>
  );
}

function LandingPage() {
  return (
    <div className="vp-root">
      <div className="vp-landing-nav"><Logo /><div className="vp-landing-nav-links"><span>Product⌄</span><span>Solutions⌄</span><span>Pricing</span><span>Resources⌄</span><span>Company⌄</span></div><div className="vp-top-actions"><span>Sign in</span><GradientButton>Start Free Trial</GradientButton></div></div>
      <section className="vp-hero"><div className="vp-hero-grid"><div><span className="vp-eyebrow">✦ AI-Powered Outreach Platform</span><h1>AI Outreach.<br />Intelligent Automation.<br /><span className="vp-gradient-text">Real Growth.</span></h1><p className="vp-subtitle" style={{ fontSize: 18, lineHeight: 1.5, maxWidth: 520 }}>Veldo helps revenue teams find the right leads, craft personalized outreach, and automate follow-ups that get replies.</p><div className="vp-top-actions" style={{ marginTop: 24 }}><GradientButton>Start Free Trial <ArrowRight size={18} /></GradientButton><span className="vp-btn">Book a Demo</span></div><p className="vp-muted" style={{ marginTop: 28 }}>✓ No credit card required &nbsp;&nbsp; ✓ 14-day free trial &nbsp;&nbsp; ✓ Cancel anytime</p><p className="vp-muted" style={{ marginTop: 34 }}>TRUSTED BY GROWING TEAMS</p><p className="vp-muted" style={{ fontSize: 17 }}>Acme Corp &nbsp;&nbsp; northzone &nbsp;&nbsp; RAPIDLY &nbsp;&nbsp; Cloudwalk &nbsp;&nbsp; Datasmith</p></div><ProductPreview /></div></section>
      <div className="vp-metrics-strip">{stats.map((s) => <div className="vp-metric-strip-item" key={s.label}><span className="vp-stat-icon">{s.icon}</span><div><strong style={{ fontSize: 22 }}>{s.value}</strong><p className="vp-muted">{s.label}</p></div></div>)}</div>
      <div className="vp-marketing-wrap"><h2 style={{ textAlign: "center", fontSize: 28 }}>Everything you need to <span className="vp-gradient-text">scale outbound</span></h2><div className="vp-grid cols5" style={{ gridTemplateColumns: "repeat(5,1fr)", marginTop: 28 }}>{["Personalization at Scale", "Smart Campaigns", "Inbox Automation", "Advanced Analytics", "AI Agents"].map((x, i) => <GlassCard key={x}><Badge tone={["violet", "blue", "orange", "violet", "violet"][i] as BadgeTone}><Sparkles size={18} /></Badge><h3 style={{ marginTop: 16 }}>{x}</h3><p className="vp-muted">AI-powered workflow that keeps pipeline moving.</p><a style={{ color: "#60a5fa" }}>Learn more →</a></GlassCard>)}</div></div>
    </div>
  );
}

function ProductPreview() {
  return <div className="vp-product-preview"><div className="vp-grid" style={{ gridTemplateColumns: "150px 1fr", gap: 18 }}><div><Logo /><div className="vp-nav" style={{ marginTop: 22 }}>{["Dashboard", "Leads", "Personalization", "Campaigns", "Inbox", "Analytics", "AI Agents", "Settings"].map((x, i) => <div className={`vp-nav-link ${i === 0 ? "active" : ""}`} key={x}>{x}</div>)}</div></div><div><SearchInput /><h2 style={{ marginTop: 18 }}>Overview</h2><div className="vp-grid stats" style={{ marginTop: 12 }}>{stats.map((s) => <StatCard stat={s} key={s.label} />)}</div><div className="vp-grid dash-main" style={{ marginTop: 12 }}><ChartCard /><FunnelCard /><ActivityFeed title="Recent Replies" /></div></div></div></div>;
}

function PricingPage() {
  const plans = [["Free", "$0", "150 credits / month"], ["Starter", "$49", "500 credits / month"], ["Go", "$99", "1,000 credits / month"], ["Pro", "$179", "2,000 credits / month"], ["Plus", "$249", "3,000 credits / month"], ["Grow", "$499", "5,000 credits / month"], ["Expand", "$999", "10,000 credits / month"], ["Advanced Expansion", "$1,999", "20,000 credits / month"], ["Custom Enterprise", "Custom", "Custom credits"]];
  return (
    <div className="vp-root">
      <div className="vp-landing-nav"><Logo /><div className="vp-landing-nav-links"><span>Product⌄</span><span>Solutions⌄</span><span>Resources⌄</span><strong>Pricing</strong><span>Company⌄</span></div><div className="vp-top-actions"><span className="vp-btn">Sign in</span><GradientButton>Book a demo <ArrowRight size={16} /></GradientButton></div></div>
      <div className="vp-marketing-wrap" style={{ paddingTop: 26 }}><div style={{ textAlign: "center" }}><span className="vp-eyebrow">Pricing</span><h1 style={{ fontSize: 44 }}>Simple pricing. Predictable <span className="vp-gradient-text">growth.</span></h1><p className="vp-subtitle" style={{ fontSize: 18 }}>Everything you need to scale AI-powered outreach-start free, upgrade when you're ready.</p><div className="vp-btn" style={{ marginTop: 26 }}>Pay monthly&nbsp;&nbsp;&nbsp; Pay yearly <Badge tone="violet">Save 20%</Badge></div></div><div className="vp-pricing-grid" style={{ marginTop: 28 }}>{plans.map((p, i) => <GlassCard className={`vp-price-card ${i === 1 ? "glow" : ""}`} key={p[0]}><div className="vp-section-head"><div><h2>{p[0]}</h2><p className="vp-muted">{p[2]}</p></div>{i === 1 ? <Badge tone="violet">MOST POPULAR</Badge> : null}</div><div className="vp-price">{p[1]}{p[1] !== "Custom" ? <span className="vp-muted" style={{ fontSize: 14 }}>/month</span> : null}</div><span className={`vp-btn ${i === 1 ? "primary" : ""}`} style={{ width: "100%", margin: "22px 0" }}>{i === 3 ? "Contact sales" : "Start free trial"}</span><div className="vp-list">{["25,000 emails / month", "10,000 personalization credits", "5 agent workflows", "Advanced analytics & reporting", "CRM integrations", "Inbox automation", "A/B testing", "Priority support"].map((f) => <span key={f}>○ {i === 3 ? f.replace(/^[^ ]+/, "Unlimited") : f}</span>)}</div><p className="vp-muted" style={{ marginTop: 24 }}>14-day free trial · No credit card</p></GlassCard>)}</div><GlassCard style={{ marginTop: 24 }}><div className="vp-grid cols2"><div><h2>Trusted by high-performing teams</h2><p className="vp-muted">Join 10,000+ companies accelerating their pipeline with Veldo.</p><p style={{ marginTop: 22 }}>★★★★★ 4.9/5 from 1,200+ reviews</p></div><div><h2>Frequently asked questions</h2><div className="vp-list" style={{ marginTop: 14 }}>{["Can I change plans later?", "What happens after my trial?", "Do you offer yearly billing discounts?"].map((q) => <div className="vp-faq-row" key={q}>{q}<ChevronDown size={14} /></div>)}</div></div></div></GlassCard></div>
    </div>
  );
}

function AuthPage() {
  return (
    <div className="vp-root vp-auth">
      <div className="vp-auth-brand"><Logo /><span style={{ height: 42, width: 1, background: "var(--vp-border)" }} /><span className="vp-muted">AI Outreach. Intelligent Automation. Real Growth.</span></div>
      <div className="vp-auth-grid"><div className="vp-auth-panel"><div className="vp-tabs"><span className="vp-tab active">Sign in</span><span className="vp-tab">Sign up</span></div><h1 style={{ fontSize: 36, textAlign: "center", marginTop: 32 }}>Welcome back</h1><p className="vp-subtitle" style={{ textAlign: "center" }}>Sign in to continue to your Veldo workspace.</p><div className="vp-stack" style={{ marginTop: 30 }}><div className="vp-field"><label>Work email</label><div className="vp-input"><Mail size={18} /> name@company.com</div></div><div className="vp-field"><label>Password</label><div className="vp-input"><LockKeyhole size={18} /> Enter your password</div></div><GradientButton>Sign In <ArrowRight size={18} /></GradientButton><div className="vp-btn">Continue with mailbox</div><div className="vp-btn">Continue with SSO</div></div></div><div className="vp-auth-panel"><span className="vp-eyebrow">AI-Powered Outreach</span><h1 style={{ fontSize: 44 }}>Outreach that works.<br /><span className="vp-gradient-text">Growth</span> that lasts.</h1><p className="vp-subtitle" style={{ fontSize: 18 }}>Veldo automates research, personalizes outreach, and helps your team close more conversations - 24/7.</p><div className="vp-grid stats" style={{ marginTop: 34 }}>{["AI Research Agents", "Personalized Outreach", "Multi-Channel Sequences", "Real-time Analytics"].map((x) => <GlassCard key={x}><Badge tone="blue"><Bot size={18} /></Badge><p>{x}</p></GlassCard>)}</div><GlassCard style={{ marginTop: 28 }}><h2>Overview</h2><div className="vp-grid stats" style={{ marginTop: 14 }}>{["Total Agents|12", "Conversations|248", "Emails Sent|1,245", "Reply Rate|17.2%"].map((x) => { const [l, v] = x.split("|"); return <StatCard key={l} stat={{ label: l, value: v, trend: "20.0%", icon: <Bot size={24} /> }} />; })}</div><LineChart /></GlassCard></div></div>
    </div>
  );
}
