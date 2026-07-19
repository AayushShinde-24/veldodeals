"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

// Floating Vel launcher — bottom-right on every app page except the settings
// area and the full-page chat itself. Opens a compact replica of Vel (the real
// /agent chat in an iframe) covering roughly a third of the screen, so it can
// chat and act on anything in Veldo without leaving the current page.
const hiddenPrefixes = ["/settings", "/profile", "/workspace", "/team", "/agent"];

export function VelDock({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hidden = hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );
  // Portal to <body>: ancestors of the app shell carry transforms that would
  // otherwise re-anchor position:fixed and strand the dock off-screen.
  if (hidden || !mounted) return null;

  function toggle() {
    setLoaded(true);
    setOpen((prev) => !prev);
  }

  return createPortal(
    <>
      {loaded && (
        <div className={`vel-dock-panel${open ? " open" : ""}`} role="dialog" aria-label="Vel AI chat" aria-hidden={!open}>
          <div className="vel-dock-head">
            <BrandMark size={26} />
            <div className="vel-dock-title">
              <strong>Vel</strong>
              <small>Your AI operator — ask for anything</small>
            </div>
            <div className="vel-dock-actions">
              <a href="/agent" title="Open full Vel" aria-label="Open full Vel">
                <Maximize2 size={15} />
              </a>
              <button type="button" onClick={() => setOpen(false)} title="Close" aria-label="Close Vel chat">
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Keep the iframe mounted after first open so the conversation survives toggling. */}
          <iframe className="vel-dock-frame" src="/agent/embed" title="Vel AI chat" />
        </div>
      )}
      <button
        type="button"
        className={`vel-dock-fab${open ? " open" : ""}`}
        onClick={toggle}
        aria-label={open ? "Close Vel chat" : "Chat with Vel"}
        aria-expanded={open}
      >
        <BrandMark size={30} />
      </button>
    </>,
    document.body
  );
}
