import { PageShell } from "@/components/premium";
import { resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getCrmCommand } from "@/lib/ui/crm-command";
import { CrmBoard } from "./crm-board";

export default async function CrmPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getCrmCommand(userId);
  return (
    <PageShell>
      <CrmBoard data={data} />
    </PageShell>
  );
}
