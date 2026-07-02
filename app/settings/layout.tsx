"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
  KeyRound,
  Mail,
  ShieldCheck,
  Users,
  UserCircle,
  Plug,
} from "lucide-react";
import { usePathname } from "next/navigation";

const settingsNav = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/workspace", label: "Workspace", icon: Building2 },
  { href: "/settings/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/settings/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/sending-accounts", label: "Sending", icon: Mail },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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
