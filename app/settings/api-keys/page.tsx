import { KeyRound } from "lucide-react";
import { PageHeader, PageShell } from "@/components/premium";
import { ApiKeyManager } from "./api-key-manager";

export default async function ApiKeysPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Developer settings"
        title="API keys"
        description="Create secret keys for server-side Veldo integrations. Full keys are shown once at creation."
        actions={<a className="btn primary" href="#create-api-key"><KeyRound size={16} /> Generate new API key</a>}
      />
      <ApiKeyManager initialKeys={[]} initialError={null} />
    </PageShell>
  );
}
