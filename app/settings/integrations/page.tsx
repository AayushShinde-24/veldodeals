import { PageHeader } from "@/components/premium";
import { IntegrationsCatalog } from "./integrations-catalog";

export default function SettingsIntegrationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings › Integrations"
        title="Connect your tools"
        description="Link your own accounts — mailbox, calendar, CRM, ad platforms, and investor tools — so Veldo can work across sales, marketing, and fundraising on your behalf."
      />
      <IntegrationsCatalog />
    </>
  );
}
