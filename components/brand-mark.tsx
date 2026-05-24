import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <span className="brand-v">V</span>
      <ClipboardCheck className="brand-spark" size={12} />
    </span>
  );
}
