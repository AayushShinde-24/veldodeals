import { PageShell } from "@/components/premium";
import { resolveUserId, type UiSearchParams } from "@/lib/ui/data";
import { getFundraisingCommand } from "@/lib/ui/fundraising-command";
import { FundraisingBoard } from "./fundraising-board";

export default async function FundraisingPage({ searchParams }: { searchParams: UiSearchParams }) {
  const userId = await resolveUserId(searchParams);
  const data = await getFundraisingCommand(userId);
  return (
    <PageShell>
      <FundraisingBoard data={data} />
    </PageShell>
  );
}
