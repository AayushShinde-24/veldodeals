"use client";

import { AlertCircle, ArrowLeft, RefreshCcw } from "lucide-react";

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="premium-content">
      <div className="error-boundary-card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <span className="error-boundary-icon">
          <AlertCircle size={24} />
        </span>
        <h2>Campaign could not be loaded</h2>
        <p>
          {error.message?.includes("not found") || error.message?.includes("access")
            ? "This campaign does not exist or you do not have access to it."
            : "An error occurred while loading campaign data. Try refreshing."}
        </p>
        <div className="error-boundary-actions">
          <button className="btn primary" type="button" onClick={reset}>
            <RefreshCcw size={15} /> Retry
          </button>
          <a className="btn" href="/campaigns">
            <ArrowLeft size={15} /> All campaigns
          </a>
        </div>
      </div>
    </div>
  );
}
