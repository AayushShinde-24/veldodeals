"use client";

import dynamic from "next/dynamic";

// Render the wizard client-only. It's a fully interactive tool (file upload, live
// parsing/validation) with no SEO value, and rendering it purely on the client avoids
// hydration reconciliation under the segment's Suspense/loading boundary.
const Wizard = dynamic(() => import("./lead-import-wizard").then((m) => m.LeadImportWizard), {
  ssr: false,
  loading: () => <div style={{ padding: 40, color: "#98a2c0" }}>Loading import workspace…</div>,
});

export function LeadImportClient() {
  return <Wizard />;
}
