"use client";

import dynamic from "next/dynamic";

// Client-only render — the board is fully interactive (filters, search, tabs) with no
// SEO value, and this avoids hydration reconciliation under segment loading boundaries.
const Board = dynamic(() => import("./lead-finder-board").then((m) => m.LeadFinderBoard), {
  ssr: false,
  loading: () => <div style={{ padding: 40, color: "#98a2c0" }}>Loading lead finder…</div>,
});

export function LeadFinderClient() {
  return <Board />;
}
