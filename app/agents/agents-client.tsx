"use client";

import dynamic from "next/dynamic";

// Client-only render — this segment has a loading.tsx boundary, which blocks
// hydration of interactive subtrees (see veldo-hydration-gotcha). The board's
// approvals/toggles must be interactive, so it renders purely on the client.
const Board = dynamic(() => import("./agents-board").then((m) => m.AgentsBoard), {
  ssr: false,
  loading: () => <div style={{ padding: 40, color: "#98a2c0" }}>Loading agent operations…</div>,
});

export function AgentsClient() {
  return <Board />;
}
