"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  ChevronDown,
  Handshake,
  LayoutDashboard,
  Menu,
  Radio,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { VelDock } from "@/components/vel-dock";
import type { AuthProfile } from "@/lib/auth/server";

// Structure: Dashboard → three pillar groups → global tabs → Settings group.
// Pillar groups expand/collapse in place; opening one closes the others.
type NavChild = { href: string; label: string };
type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  children: NavChild[];
};

const navGroups: NavGroup[] = [
  {
    key: "sales",
    label: "Sales",
    icon: Handshake,
    accent: "#3b82f6",
    children: [
      { href: "/sales", label: "Overview" },
      { href: "/sales/campaigns", label: "Campaigns" },
      { href: "/crm", label: "Pipeline" },
      { href: "/inbox", label: "Conversations" },
      { href: "/sales/meetings", label: "Meetings" },
      { href: "/sales/settings", label: "Settings" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Radio,
    accent: "#8b5cf6",
    children: [
      { href: "/marketing", label: "Overview" },
      { href: "/marketing/campaigns", label: "Campaigns" },
      { href: "/marketing/studio", label: "Studio" },
      { href: "/marketing/planner", label: "Planner" },
      { href: "/marketing/channels", label: "Channels" },
      { href: "/marketing/settings", label: "Settings" },
    ],
  },
  {
    key: "fundraising",
    label: "Fundraising",
    icon: Sparkles,
    accent: "#f6c453",
    children: [
      { href: "/fundraising", label: "Raise Dashboard" },
      { href: "/fundraising/setup", label: "Raise Setup" },
      { href: "/fundraising/investors", label: "Investors" },
      { href: "/fundraising/outreach", label: "Outreach" },
      { href: "/fundraising/close", label: "Meetings & Close" },
      { href: "/fundraising/settings", label: "Settings" },
    ],
  },
];

const globalNav = [
  { href: "/agent", label: "Vel AI", icon: Bot },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const settingsGroup: NavGroup = {
  key: "settings",
  label: "Settings",
  icon: Settings,
  accent: "#94a3b8",
  children: [
    { href: "/profile", label: "Profile" },
    { href: "/workspace", label: "Workspace" },
    { href: "/team", label: "Team & Seats" },
    { href: "/settings/usage", label: "Usage" },
    { href: "/settings/billing", label: "Billing & Plans" },
    { href: "/settings/integrations", label: "Connections" },
    { href: "/settings/data", label: "Data & Memory" },
    { href: "/settings/compliance", label: "Security & Compliance" },
    { href: "/settings/notifications", label: "Notifications" },
  ],
};

const allGroups = [...navGroups, settingsGroup];

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

function matchesHref(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

// Longest-prefix match across every leaf link, so "/marketing" is not
// highlighted while the user is on "/marketing/studio".
function bestMatchHref(pathname: string | null) {
  const leaves = [
    "/dashboard",
    ...globalNav.map((item) => item.href),
    ...allGroups.flatMap((group) => group.children.map((child) => child.href)),
  ];
  let best = "";
  for (const href of leaves) {
    if (matchesHref(pathname, href) && href.length > best.length) best = href;
  }
  return best;
}

function groupForPath(pathname: string | null) {
  if (pathname?.startsWith("/settings")) return "settings";
  for (const group of allGroups) {
    if (group.children.some((child) => matchesHref(pathname, child.href))) return group.key;
  }
  return null;
}

export function AppFrame({ children, profile }: { children: React.ReactNode; profile: AuthProfile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("veldo-sidebar-collapsed");
    setCollapsed(stored ? stored === "true" : window.matchMedia("(max-width: 768px)").matches);
  }, []);

  // Auto-expand the group that owns the current page; close mobile sidebar.
  useEffect(() => {
    setMobileOpen(false);
    const owner = groupForPath(pathname);
    if (owner) setOpenGroup(owner);
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

  if (
    pathname?.startsWith("/veldo-ui-preview") ||
    pathname?.startsWith("/agent/embed") ||
    publicRoutes.has(pathname ?? "")
  ) {
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

  const activeLeaf = bestMatchHref(pathname);

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

  function toggleGroup(group: NavGroup) {
    // Collapsed rail cannot show children — jump to the group's first tab.
    if (collapsed && !mobileOpen) {
      router.push(group.children[0].href);
      return;
    }
    setOpenGroup((current) => (current === group.key ? null : group.key));
  }

  const sidebarClass = [
    "sidebar",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function renderGroup(group: NavGroup) {
    const Icon = group.icon;
    const isOpen = openGroup === group.key;
    const ownsActive = group.children.some((child) => child.href === activeLeaf);
    return (
      <div
        key={group.key}
        className={`nav-group${isOpen ? " open" : ""}`}
        style={{ "--pillar": group.accent } as React.CSSProperties}
      >
        <button
          type="button"
          className={`nav-group-head${ownsActive ? " active" : ""}`}
          onClick={() => toggleGroup(group)}
          aria-expanded={isOpen}
          title={group.label}
        >
          <Icon size={16} />
          <span>{group.label}</span>
          <ChevronDown size={14} className="nav-chevron" aria-hidden="true" />
        </button>
        <div className="nav-sub">
          <div className="nav-sub-inner">
            {group.children.map((child) => (
              <a
                href={child.href}
                key={child.href}
                className={child.href === activeLeaf ? "active" : undefined}
                title={`${group.label} · ${child.label}`}
              >
                <span>{child.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          <a
            href="/dashboard"
            className={activeLeaf === "/dashboard" ? "active" : undefined}
            title="Dashboard"
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </a>

          {navGroups.map(renderGroup)}

          <div className="nav-divider" aria-hidden="true" />

          {globalNav.map((item) => {
            const Icon = item.icon;
            return (
              <a
                href={item.href}
                key={item.href}
                className={item.href === activeLeaf ? "active" : undefined}
                title={item.label}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}

          <div className="nav-divider" aria-hidden="true" />

          {renderGroup(settingsGroup)}
        </nav>

        <div className="nav-divider" aria-hidden="true" />

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
            <a className="btn primary" href="/sales/campaigns/new">
              <Sparkles size={16} /> New campaign
            </a>
          </div>
        </div>
        {children}
      </main>

      <VelDock pathname={pathname} />
    </div>
  );
}
