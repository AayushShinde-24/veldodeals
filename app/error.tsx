"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { captureError } from "@/lib/observability/sentry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest, boundary: "route" });
    if (process.env.NODE_ENV !== "production") {
      console.error("[Veldo error boundary]", error);
    }
  }, [error]);

  return (
    <div className="error-boundary-root">
      <div className="error-boundary-card">
        <span className="error-boundary-icon">
          <AlertCircle size={28} />
        </span>
        <h2>Something went wrong</h2>
        <p>{sanitizeErrorMessage(error.message)}</p>
        {error.digest ? <code className="error-boundary-digest">{error.digest}</code> : null}
        <div className="error-boundary-actions">
          <button className="btn primary" type="button" onClick={reset}>
            <RefreshCcw size={15} /> Try again
          </button>
          <a className="btn" href="/dashboard">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function sanitizeErrorMessage(message: string) {
  if (/key|secret|token|password|authorization/iu.test(message)) {
    return "A secure service dependency is unavailable. Check your configuration.";
  }
  if (/database|supabase|postgres|relation|column/iu.test(message)) {
    return "The workspace data could not be loaded. Run the Supabase migrations and try again.";
  }
  return message || "An unexpected error occurred. Please try again.";
}
