"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp, Check, CircleSlash, Loader2, Mic, Radio, Sparkles, SlidersHorizontal,
  TriangleAlert, X, AudioLines,
} from "lucide-react";
import { AUTONOMY_MODES, type AutonomyMode } from "@/lib/autonomy/modes";
import styles from "./agent.module.css";

type AgentEvent = { tool: string; label: string; status: "running" | "done" | "skipped" | "blocked"; detail: string };
type AgentQuestion = { id: string; question: string; options: { label: string; value: string }[] };
type Msg = {
  role: "user" | "assistant";
  content: string;
  events?: AgentEvent[];
  questions?: AgentQuestion[];
  model?: string;
};

const STARTERS = [
  "Find 20 leads for my product and draft personalized emails.",
  "Plan a fundraising round and match me with investors.",
  "Launch a marketing campaign — ads for Meta and Google.",
];

// ── Web Speech API helpers (browser-native mic + voice) ──
type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
};
type SpeechRecEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
function getSR(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VeldoChatClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autonomy, setAutonomy] = useState<AutonomyMode>("auto");
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);

  // voice mode
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [voiceHeard, setVoiceHeard] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const voiceOpenRef = useRef(false);
  const autonomyRef = useRef<AutonomyMode>("auto");
  const messagesRef = useRef<Msg[]>([]);

  useEffect(() => { autonomyRef.current = autonomy; }, [autonomy]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { setSpeechOk(!!getSR()); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  const activeIndex = useMemo(() => AUTONOMY_MODES.findIndex((m) => m.id === autonomy), [autonomy]);

  const callAgent = useCallback(async (message: string): Promise<Msg> => {
    const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
    const response = await fetch("/api/veldo-agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, autonomyMode: autonomyRef.current }),
    });
    const json = await response.json();
    if (!json.ok) throw new Error(json.error ?? "Vel could not process that.");
    const d = json.data as { reply: string; events: AgentEvent[]; questions: AgentQuestion[]; model: string };
    return { role: "assistant", content: d.reply, events: d.events, questions: d.questions, model: d.model };
  }, []);

  const sendMessage = useCallback(async (value?: string) => {
    const message = (value ?? draft).trim();
    if (!message || loading) return;
    setDraft(""); setError(""); setLoading(true);
    setMessages((c) => [...c, { role: "user", content: message }]);
    try {
      const reply = await callAgent(message);
      setMessages((c) => [...c, reply]);
      return reply;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vel could not process that.");
    } finally {
      setLoading(false);
    }
  }, [draft, loading, callAgent]);

  // ── mic dictation (fills the composer) ──
  function toggleMic() {
    const SR = getSR();
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    let finalText = draft ? draft + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setDraft((finalText + interim).trimStart());
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    rec.onerror = () => { setListening(false); recRef.current = null; };
    recRef.current = rec; setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

  // ── voice conversation mode (hands-free) ──
  const speak = useCallback((text: string, after: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { after(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 600));
    u.rate = 1.03; u.pitch = 1.0;
    u.onend = after; u.onerror = after;
    setVoiceState("speaking");
    window.speechSynthesis.speak(u);
  }, []);

  const voiceListen = useCallback(() => {
    const SR = getSR();
    if (!SR || !voiceOpenRef.current) return;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    let finalText = "";
    setVoiceHeard(""); setVoiceState("listening");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      setVoiceHeard((finalText + interim).trim());
    };
    rec.onerror = () => { if (voiceOpenRef.current) setVoiceState("idle"); };
    rec.onend = async () => {
      recRef.current = null;
      const said = finalText.trim();
      if (!voiceOpenRef.current) return;
      if (!said) { setVoiceState("idle"); return; }
      setVoiceState("thinking");
      try {
        const reply = await callAgent(said);
        setMessages((c) => [...c, { role: "user", content: said }, reply]);
        if (!voiceOpenRef.current) return;
        speak(reply.content, () => { if (voiceOpenRef.current) voiceListen(); });
      } catch {
        setVoiceState("idle");
      }
    };
    recRef.current = rec;
    try { rec.start(); } catch { setVoiceState("idle"); }
  }, [callAgent, speak]);

  function openVoice() { voiceOpenRef.current = true; setVoiceOpen(true); setVoiceState("idle"); setVoiceHeard(""); voiceListen(); }
  function closeVoice() {
    voiceOpenRef.current = false; setVoiceOpen(false); setVoiceState("idle");
    recRef.current?.abort(); recRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); void sendMessage(); }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  }

  const empty = messages.length === 0;

  return (
    <section className={styles.shell}>
      {/* top bar */}
      <div className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.orb} />
          <div>
            <div className={styles.brandName}>Vel</div>
            <div className={styles.brandSub}>Autonomous revenue operator</div>
          </div>
        </div>
        <div className={styles.spacer} />

        <div className={styles.autonomy} role="tablist" aria-label="Autonomy level">
          <span
            className={styles.autoThumb}
            style={{ width: `calc((100% - 8px) / 3)`, transform: `translateX(${activeIndex * 100}%)` }}
          />
          {AUTONOMY_MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={m.id === autonomy}
              className={`${styles.autoBtn} ${m.id === autonomy ? styles.autoActive : ""}`}
              onClick={() => setAutonomy(m.id)}
              title={m.description}
            >
              <SlidersHorizontal size={12} style={{ marginRight: 5, verticalAlign: -1 }} />
              {m.name === "Semi-automatic" ? "Semi" : m.name}
            </button>
          ))}
        </div>

        {speechOk && (
          <button className={styles.voiceBtn} type="button" onClick={openVoice}>
            <AudioLines size={16} /> Voice
          </button>
        )}
      </div>

      {/* thread */}
      <div className={styles.thread}>
        {empty ? (
          <div className={styles.hero}>
            <div className={styles.heroOrb} />
            <h1 className={styles.heroTitle}>What should we run today?</h1>
            <p className={styles.heroSub}>
              Tell me a goal in plain language. I decide the tools, ask only what I must, and execute
              across sales, marketing, and fundraising — at the autonomy level you set.
            </p>
            <div className={styles.starters}>
              {STARTERS.map((s) => (
                <button key={s} className={styles.starter} type="button" onClick={() => void sendMessage(s)}>
                  <Sparkles size={15} /> {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.msgUser : ""}`}>
              <span className={`${styles.avatar} ${m.role === "user" ? styles.avatarUser : styles.avatarVel}`}>
                {m.role === "user" ? "You"[0] : <Radio size={17} />}
              </span>
              <div className={styles.bubble}>
                {m.content}
                {!!m.events?.length && (
                  <div className={styles.steps}>
                    {m.events.map((ev, j) => (
                      <div className={styles.step} key={j}>
                        <span className={`${styles.stepIcon} ${stepClass(ev.status)}`}>{stepIcon(ev.status)}</span>
                        <span className={styles.stepLabel}>{ev.label}</span>
                        <span className={styles.stepDetail}>· {ev.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!!m.questions?.length && (
                  <div className={styles.questions}>
                    {m.questions.map((q) => (
                      <div className={styles.qBlock} key={q.id}>
                        <div className={styles.qText}>{q.question}</div>
                        <div className={styles.qOpts}>
                          {q.options.map((o) => (
                            <button key={o.value} className={styles.qOpt} type="button" disabled={loading} onClick={() => void sendMessage(o.value)}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className={styles.msg}>
            <span className={`${styles.avatar} ${styles.avatarVel}`}><Radio size={17} /></span>
            <div className={styles.bubble}>
              <span className={styles.thinking}>
                <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} /> Vel is working
              </span>
            </div>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <form className={styles.composer} onSubmit={submit}>
        <div className={styles.inputWrap}>
          <textarea
            className={styles.input}
            rows={1}
            value={draft}
            disabled={loading}
            placeholder="Message Vel — a goal, a question, or 'find leads and draft emails'…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {speechOk && (
            <button type="button" className={`${styles.mic} ${listening ? styles.micOn : ""}`} onClick={toggleMic} aria-label="Dictate" title="Dictate">
              <Mic size={16} />
            </button>
          )}
        </div>
        <button className={styles.send} type="submit" disabled={loading || !draft.trim()} aria-label="Send">
          {loading ? <Loader2 className="spin" size={18} /> : <ArrowUp size={20} />}
        </button>
      </form>

      {/* voice mode overlay */}
      {voiceOpen && (
        <div className={styles.voiceOverlay} role="dialog" aria-label="Voice mode">
          <div
            className={`${styles.voiceOrb} ${voiceState === "listening" ? styles.voiceOrbListening : ""} ${voiceState === "speaking" ? styles.voiceOrbSpeaking : ""}`}
          />
          <div className={styles.voiceState}>
            {voiceState === "listening" ? "Listening…" : voiceState === "thinking" ? "Thinking…" : voiceState === "speaking" ? "Speaking…" : "Tap talk to begin"}
          </div>
          <div className={styles.voiceTranscript}>{voiceHeard}</div>
          <div className={styles.voiceActions}>
            {voiceState === "idle" && (
              <button className={`${styles.voiceAction} ${styles.voiceTalk}`} type="button" onClick={voiceListen}>
                <Mic size={16} /> Talk
              </button>
            )}
            <button className={`${styles.voiceAction} ${styles.voiceStop}`} type="button" onClick={closeVoice}>
              <X size={16} /> End
            </button>
          </div>
          <div className={styles.voiceHint}>Speak naturally — I&apos;ll reply out loud and keep the conversation going.</div>
        </div>
      )}
    </section>
  );
}

function stepClass(s: AgentEvent["status"]) {
  return s === "done" ? styles.stepDone : s === "blocked" ? styles.stepBlocked : s === "running" ? styles.stepRunning : styles.stepSkipped;
}
function stepIcon(s: AgentEvent["status"]) {
  if (s === "done") return <Check size={13} strokeWidth={3} />;
  if (s === "blocked") return <TriangleAlert size={13} />;
  if (s === "running") return <Loader2 className="spin" size={13} />;
  return <CircleSlash size={13} />;
}
