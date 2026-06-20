"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

/**
 * Client-side PostHog provider.
 *
 * Bootstraps the PostHog JS snippet when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Fires a $pageview event on every client-side navigation.
 *
 * To use the full SDK: `npm install posthog-js` and replace the snippet
 * approach with `import posthog from 'posthog-js'`.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  usePostHog();
  return <>{children}</>;
}

function usePostHog() {
  const pathname = usePathname();

  // Bootstrap PostHog snippet on first mount
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    // Avoid double-injection
    if (window.__posthog_loaded) return;
    window.__posthog_loaded = true;

    // Inject the PostHog JS snippet
    const script = document.createElement("script");
    script.defer = true;
    script.src = `${POSTHOG_HOST}/static/array.js`;
    script.onload = () => {
      if (typeof window.posthog === "undefined") return;
      window.posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // We handle pageviews manually below
        autocapture: false,      // Keep control; enable once comfortable
        persistence: "localStorage+cookie",
      });
    };
    document.head.appendChild(script);
  }, []);

  // Track pageviews on client-side navigation
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") return;
    if (typeof window.posthog !== "undefined") {
      window.posthog.capture("$pageview", { path: pathname });
    }
  }, [pathname]);
}

/** Helper: capture a custom event from any client component */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.posthog === "undefined") return;
  window.posthog.capture(event, properties);
}

// Minimal type augmentation so TypeScript doesn't complain
declare global {
  interface Window {
    posthog?: {
      init: (key: string, options: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
    };
    __posthog_loaded?: boolean;
  }
}
