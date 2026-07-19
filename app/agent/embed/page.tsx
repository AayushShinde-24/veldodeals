import { PageShell } from "@/components/premium";
import { VeldoChatClient } from "@/app/agent/veldo-chat-client";

// Bare Vel chat for the floating dock iframe — AppFrame skips its chrome for
// this route, so only the chat renders inside the panel.
export default function VeldoAgentEmbedPage() {
  return (
    <PageShell className="vel-embed">
      <VeldoChatClient />
    </PageShell>
  );
}
