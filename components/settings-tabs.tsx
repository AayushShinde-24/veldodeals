"use client";

import { Activity, CreditCard, KeyRound, Plug, ShieldCheck, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings", label: "Usage", icon: Activity, match: (p: string) => p === "/settings" },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound, match: (p: string) => p.startsWith("/settings/api-keys") },
  { href: "/integrations", label: "Integrations", icon: Plug, match: (p: string) => p.startsWith("/integrations") },
  { href: "/billing", label: "Billing", icon: CreditCard, match: (p: string) => p.startsWith("/billing") },
  { href: "/profile", label: "Profile", icon: UserCircle, match: (p: string) => p.startsWith("/profile") },
  { href: "/settings/compliance", label: "Compliance", icon: ShieldCheck, match: (p: string) => p.startsWith("/settings/compliance") },
  { href: "/security", label: "Security", icon: ShieldCheck, match: (p: string) => p.startsWith("/security") },
];

export function SettingsTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <a key={tab.href} href={tab.href} className={tab.match(pathname) ? "active" : undefined}>
            <Icon size={15} />
            <span>{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
