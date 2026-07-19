"use client";

import {
  Bell,
  Building2,
  CreditCard,
  Database,
  Gauge,
  ShieldCheck,
  Users,
  UserCircle,
  Plug,
} from "lucide-react";
import { usePathname } from "next/navigation";

const settingsNav = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/workspace", label: "Workspace", icon: Building2 },
  { href: "/team", label: "Team & Seats", icon: Users },
  { href: "/settings/usage", label: "Usage", icon: Gauge },
  { href: "/settings/billing", label: "Billing & Plans", icon: CreditCard },
  { href: "/settings/integrations", label: "Connections", icon: Plug },
  { href: "/settings/data", label: "Data & Memory", icon: Database },
  { href: "/settings/compliance", label: "Security & Compliance", icon: ShieldCheck },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="settings-shell premium-content">
      <aside className="settings-subnav">
        <p className="settings-subnav-label">Settings</p>
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <a
              key={item.href}
              href={item.href}
              className={isActive ? "active" : undefined}
            >
              <Icon size={15} />
              {item.label}
            </a>
          );
        })}
      </aside>
      <div className="settings-content">{children}</div>
    </div>
  );
}
