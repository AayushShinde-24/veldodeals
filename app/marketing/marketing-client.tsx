"use client";

import dynamic from "next/dynamic";

// Client-only render — the board is interactive (ad generator, toasts, live channel
// fetch) and this avoids the segment-loading hydration gotcha.
const Board = dynamic(() => import("./marketing-board").then((m) => m.MarketingBoard), {
  ssr: false,
  loading: () => <div style={{ padding: 40, color: "#98a2c0" }}>Loading marketing engine…</div>,
});

export function MarketingClient() {
  return <Board />;
}
