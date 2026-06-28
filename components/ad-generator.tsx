"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";

const CHANNELS = [
  { id: "meta", name: "Meta" },
  { id: "google", name: "Google" },
  { id: "tiktok", name: "TikTok" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "x", name: "X" },
] as const;

const GOALS = [
  { id: "awareness", name: "Awareness" },
  { id: "leads", name: "Leads" },
  { id: "signups", name: "Signups" },
  { id: "sales", name: "Sales" },
] as const;

const FORMATS = [
  { id: "image", name: "Image" },
  { id: "video", name: "Video" },
  { id: "carousel", name: "Carousel" },
] as const;

interface Variant { channel: string; headline: string; primaryText: string; cta: string }
interface Result { product: string; format: string; variants: Variant[]; creativeConcept: string; mediaProvider: string; demo: boolean }

export function AdGenerator() {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState<string>("awareness");
  const [format, setFormat] = useState<string>("image");
  const [channels, setChannels] = useState<string[]>(["meta", "google"]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string[]>([]);

  const toggle = (id: string) =>
    setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  async function generate() {
    if (!product.trim() || channels.length === 0) return;
    setBusy(true); setError(null); setResult(null); setPosted([]);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, audience, goal, format, channels }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not generate ad.");
      setResult(json.data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate ad.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adgen">
      <div className="adgen-form">
        <div className="field">
          <label htmlFor="adgen-product">What are you advertising?</label>
          <input id="adgen-product" value={product} onChange={(e) => setProduct(e.target.value)}
            placeholder="Veldo — autonomous revenue OS (or paste a URL)" />
        </div>
        <div className="field">
          <label htmlFor="adgen-audience">Audience</label>
          <input id="adgen-audience" value={audience} onChange={(e) => setAudience(e.target.value)}
            placeholder="B2B founders & RevOps leaders" />
        </div>
        <div className="adgen-row">
          <div className="field">
            <label>Goal</label>
            <div className="adgen-chips">
              {GOALS.map((g) => (
                <button key={g.id} type="button" className={`adgen-chip${goal === g.id ? " on" : ""}`} onClick={() => setGoal(g.id)}>{g.name}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Format</label>
            <div className="adgen-chips">
              {FORMATS.map((f) => (
                <button key={f.id} type="button" className={`adgen-chip${format === f.id ? " on" : ""}`} onClick={() => setFormat(f.id)}>{f.name}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Channels</label>
          <div className="adgen-chips">
            {CHANNELS.map((c) => (
              <button key={c.id} type="button" className={`adgen-chip${channels.includes(c.id) ? " on" : ""}`} onClick={() => toggle(c.id)}>{c.name}</button>
            ))}
          </div>
        </div>
        <button className="btn primary adgen-go" type="button" onClick={generate} disabled={busy || !product.trim() || channels.length === 0}>
          {busy ? <><Loader2 size={16} className="spin" /> Generating…</> : <><Sparkles size={16} /> Generate ads</>}
        </button>
        {error ? <div className="status failed" style={{ marginTop: 12 }}>{error}</div> : null}
      </div>

      {result ? (
        <div className="adgen-result">
          <div className="adgen-concept">
            <strong>Creative concept</strong>
            <p>{result.creativeConcept}</p>
            <span className="adgen-provider">
              {result.demo ? "Preview — add FAL_KEY to render the real " : "Rendering via "}
              {result.format} with {result.mediaProvider}
            </span>
          </div>
          <div className="adgen-variants">
            {result.variants.map((v) => (
              <div className="adgen-card" key={v.channel}>
                <div className="adgen-card-head">{CHANNELS.find((c) => c.id === v.channel)?.name ?? v.channel}</div>
                <div className="adgen-thumb" data-format={result.format}><Sparkles size={20} /></div>
                <strong className="adgen-headline">{v.headline}</strong>
                <p className="adgen-text">{v.primaryText}</p>
                <div className="adgen-cta-row">
                  <span className="adgen-cta">{v.cta}</span>
                  {posted.includes(v.channel) ? (
                    <span className="adgen-posted"><CheckCircle2 size={14} /> Queued</span>
                  ) : (
                    <button className="btn small" type="button" onClick={() => setPosted((p) => [...p, v.channel])}>
                      <Send size={13} /> Publish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
