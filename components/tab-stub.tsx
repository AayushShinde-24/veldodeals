import { Hourglass } from "lucide-react";
import { EmptyState, GlassCard, PageHeader, PageShell } from "@/components/premium";

// Placeholder body for tabs whose structure is locked but whose features
// arrive in a later phase. Keeps the nav fully clickable with no dead ends.
export function TabStub({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <PageShell>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <GlassCard>
        <EmptyState
          icon={Hourglass}
          title="Structure locked — build-out coming"
          description="This tab is part of the final navigation. Its features land in an upcoming phase."
        />
      </GlassCard>
    </PageShell>
  );
}
