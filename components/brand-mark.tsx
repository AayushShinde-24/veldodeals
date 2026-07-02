import { Zap } from "lucide-react";

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="brand-mark"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52) }}
      aria-hidden="true"
    >
      <span className="brand-v">V</span>
      <Zap size={Math.round(size * 0.28)} className="brand-spark" />
    </span>
  );
}
