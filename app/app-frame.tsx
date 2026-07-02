"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Database,
  FileText,
  Handshake,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
  Menu,
  PhoneCall,
  Radio,
  Search,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import type { AuthProfile } from "@/lib/auth/server";

// Core workflow only. Everything account/config-related now lives under Settings.
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
  { href: "/marketing", label: "Marketing", icon: Radio },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/agents/tasks", label: "Tasks", icon: ListChecks },
  { href: "/agents/logs", label: "Logs", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

// Routes that should highlight the single "Settings" entry.
const settingsRoots = ["/settings", "/billing", "/integrations", "/profile", "/workspace", "/team", "/sending-accounts", "/security"];

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
  "/pricing",
]);

export function AppFrame({ children, profile }: { children: React.ReactNode; profile: AuthProfile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("veldo-sidebar-collapsed");
    setCollapsed(stored ? stored === "true" : window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Cmd+K / Ctrl+K → navigate to Vel AI
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/agent");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  if (pathname?.startsWith("/veldo-ui-preview") || publicRoutes.has(pathname ?? "")) {
    return <>{children}</>;
  }

  const workspace = profile?.workspace_name || profile?.company_name || "Veldo Workspace";
  const name = profile?.full_name || profile?.email?.split("@")[0] || "Operator";
  const initials =
    workspace
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "V";

  const activeHref = (href: string) =>
    pathname === href || (href !== "/" && href !== "/campaigns" && pathname?.startsWith(`${href}/`))
      ? true
      : pathname === href;

  function toggleSidebar() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((current) => {
        const next = !current;
        window.localStorage.setItem("veldo-sidebar-collapsed", String(next));
        return next;
      });
    }
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const sidebarClass = [
    "sidebar",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`app${collapsed ? " sidebar-collapsed" : ""}`}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          ref={backdropRef}
          className="sidebar-backdrop"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside className={sidebarClass}>
        <div className="sidebar-head">
          <a className="brand" href="/dashboard" aria-label="Veldo dashboard">
            <BrandMark />
            <span>
              Veldo<small>AI Sales Team OS</small>
            </span>
          </a>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
            return (
              <a
                href={item.href}
                key={item.href}
                className={isActive ? "active" : undefined}
                title={item.label}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="nav-divider" aria-hidden="true" />

        <div className="account-menu">
          <a
            href="/settings"
            className={`account-settings-link ${settingsRoots.some((root) => pathname === root || pathname?.startsWith(`${root}/`)) ? "active" : ""}`}
            title="Settings"
          >
            <Settings size={16} />
            <span>Settings</span>
          </a>
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
          <button
            className="sidebar-toggle mobile-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <a className="topbar-search" href="/agent" aria-label="Ask Vel AI (Ctrl+K)">
            <Search size={16} />
            <span>Ask Vel to find leads, draft, review, or summarize...</span>
            <kbd>Ctrl K</kbd>
          </a>
          <div className="topbar-actions">
            <a className="icon-btn" href="/inbox" aria-label="Replies">
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
