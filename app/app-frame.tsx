"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CreditCard,
  Database,
  FileText,
  Handshake,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Mail,
  Megaphone,
  Menu,
  Plug,
  PhoneCall,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserCircle,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import type { AuthProfile } from "@/lib/auth/server";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent", label: "Vel AI", icon: Bot },
  { href: "/campaigns", label: "Campaigns", icon: Target },
  { href: "/campaigns/new", label: "Builder", icon: FileText },
  { href: "/leads", label: "Leads", icon: Database },
  { href: "/lead-finder", label: "Lead finder", icon: Search },
  { href: "/personalization", label: "Personalization", icon: Mail },
  { href: "/inbox", label: "Replies", icon: Inbox },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/crm", label: "CRM deals", icon: Handshake },
  { href: "/fundraising", label: "Fundraising", icon: Megaphone },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/agents/tasks", label: "Tasks", icon: ListChecks },
  { href: "/agents/logs", label: "Logs", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
];

const accountNav = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/workspace", label: "Workspace", icon: Users },
  { href: "/team", label: "Team", icon: Users },
  { href: "/sending-accounts", label: "Sending accounts", icon: Send },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/security", label: "Security", icon: LockKeyhole },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
];

const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/acceptable-use",
  "/data-deletion",
  "/unsubscribe",
  "/unsubscribe/confirmed",
]);

export function AppFrame({ children, profile }: { children: React.ReactNode; profile: AuthProfile | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("veldo-sidebar-collapsed");
    setCollapsed(stored ? stored === "true" : window.matchMedia("(max-width: 760px)").matches);
  }, []);

  if (pathname?.startsWith("/veldo-ui-preview") || publicRoutes.has(pathname ?? "")) {
    return <>{children}</>;
  }

  const workspace = profile?.workspace_name || profile?.company_name || "Veldo Workspace";
  const name = profile?.full_name || profile?.email?.split("@")[0] || "Operator";
  const initials = workspace
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
  const activeHref = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("veldo-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <a className="brand" href="/dashboard" aria-label="Veldo dashboard">
            <BrandMark />
            <span>
              Veldo<small>AI Sales Team OS</small>
            </span>
          </a>
          <button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>
            <Menu size={20} />
          </button>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <a href={item.href} key={item.href} className={activeHref(item.href) ? "active" : undefined} title={item.label}>
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="account-menu">
          <a className="account-profile-link" href="/profile" title="Open profile">
            <span className="sidebar-avatar">{initials}</span>
            <span className="account-summary">
              <strong>{workspace}</strong>
              <small>{name}</small>
            </span>
          </a>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="sidebar-toggle mobile-toggle" type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Menu size={20} />
          </button>
          <div className="topbar-search">
            <Search size={16} />
            <span>Search campaigns, leads, agents...</span>
            <kbd>Ctrl K</kbd>
          </div>
          <div className="topbar-actions">
            <a className="icon-btn" href="/agents/logs" aria-label="Notifications">
              <Bell size={18} />
            </a>
            <a className="workspace-chip" href="/workspace">
              <span>{initials.slice(0, 1)}</span>
              <Building2 size={15} />
              {workspace}
            </a>
            <a className="btn primary" href="/campaigns/new">
              <Sparkles size={16} /> New campaign
            </a>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
