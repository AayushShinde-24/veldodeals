import type { LucideIcon } from "lucide-react";

const LABELS: Record<string, string> = {
  needs_review: "Needs review",
  catch_all: "Catch-all",
  setup_required: "Setup required",
};

export function StatusPill({
  status,
  icon: Icon,
  label,
}: {
  status: string;
  icon?: LucideIcon;
  label?: string;
}) {
  const display = label ?? LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span className={`status ${status}`}>
      {Icon && <Icon size={11} />}
      {display}
    </span>
  );
}
