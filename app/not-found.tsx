import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="error-boundary-root">
      <div className="error-boundary-card">
        <span className="error-boundary-icon" style={{ color: "var(--muted)" }}>
          <Compass size={28} />
        </span>
        <h2>Page not found</h2>
        <p>This page does not exist or you do not have access to it.</p>
        <div className="error-boundary-actions">
          <a className="btn primary" href="/dashboard">
            Go to dashboard
          </a>
          <a className="btn" href="/campaigns">
            View campaigns
          </a>
        </div>
      </div>
    </div>
  );
}
