import { PageShell } from "@/components/premium";
import { VeldoChatClient } from "@/app/agent/veldo-chat-client";

export default function VeldoAgentPage() {
  return (
    <PageShell>
      <VeldoChatClient />
    </PageShell>
  );
}
