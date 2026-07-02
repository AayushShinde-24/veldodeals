"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { AUTONOMY_MODES, DEFAULT_AUTONOMY_MODE, type AutonomyMode } from "@/lib/autonomy/modes";

export function AutonomyModePicker({
  action,
  next = "/dashboard",
  initial = DEFAULT_AUTONOMY_MODE,
  submitLabel = "Continue",
}: {
  action: (formData: FormData) => void;
  next?: string;
  initial?: AutonomyMode;
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<AutonomyMode>(initial);

  return (
    <form action={action} className="mode-picker">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      <div className="mode-grid">
        {AUTONOMY_MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={active}
              className={`mode-card mode-${m.accent}${active ? " selected" : ""}${m.recommended ? " mode-hero" : ""}`}
            >
              {m.recommended && <span className="mode-badge">Recommended</span>}
              <span className="mode-radio" aria-hidden />
              <span className="mode-name">{m.name}</span>
              <span className="mode-tagline">{m.tagline}</span>
              <p className="mode-desc">{m.description}</p>
              <ul className="mode-features">
                {m.features.map((f) => (
                  <li key={f}><Check size={13} /> {f}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <button className="btn primary mode-submit" type="submit">
        {submitLabel} <ArrowRight size={16} />
      </button>
    </form>
  );
}
