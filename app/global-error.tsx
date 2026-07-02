"use client";

// Root-level error boundary — catches errors thrown in the root layout itself,
// which app/error.tsx cannot cover. Must render its own <html>/<body>.
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
    captureError(error, { digest: error.digest, boundary: "root" });
    if (process.env.NODE_ENV !== "production") {
      console.error("[Veldo root error boundary]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0d0d14", color: "#e5e7eb", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: "#9ca3af", lineHeight: 1.6, marginBottom: 20 }}>
              Veldo hit an unexpected error while starting this page. Please try again.
            </p>
            {error.digest ? (
              <code style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 20 }}>{error.digest}</code>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{ background: "#39a7ff", color: "#fff", border: 0, borderRadius: 8, padding: "12px 24px", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
