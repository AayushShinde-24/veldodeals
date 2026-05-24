export function StatusPill({ status }: { status?: string | null }) {
  const label = status ?? "queued";
  return <span className={`status ${label}`}>{label}</span>;
}
