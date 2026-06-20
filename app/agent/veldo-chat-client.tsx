"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, CircleDot, Clock3, Loader2, Send, ShieldCheck, Sparkles, TriangleAlert, UserCircle } from "lucide-react";
import { Badge, ProgressLine } from "@/components/premium";

type ApiMessage = {
  id?: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  metadata?: {
    events?: VelEvent[];
    questions?: VelQuestion[];
    finalResult?: Record<string, unknown>;
  };
};

type VelEvent = {
  agent: string;
  step: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "needs_input" | "needs_review";
  message: string;
  api?: string;
  progress: number;
};

type VelQuestion = {
  id: string;
  question: string;
  options: Array<{ label: string; value: string }>;
};

type ChatResponse = {
  threadId: string;
  message: string;
  progress?: number;
  events?: VelEvent[];
  questions?: VelQuestion[];
  finalResult?: Record<string, unknown>;
};

const starterPrompts = [
  "Find 20 leads for my product and draft personalized emails for retail buyers.",
  "Create a campaign for SaaS founders and prepare safe email drafts.",
  "Research my saved leads, write emails, and keep everything approval-gated.",
];

const processStages = [
  "Understanding",
  "Strategy",
  "Lead search",
  "Research",
  "Drafting",
  "QA",
  "Gate check",
  "Sending readiness",
  "Sent",
  "Follow-up",
  "Replies",
];

const readyEvent: VelEvent = {
  agent: "Vel",
  step: "Ready",
  status: "completed",
  message: "Vel is ready to create a tracked workspace task.",
  progress: 0,
};

const liveEvents: VelEvent[] = [
  { agent: "Vel", step: "Understanding", status: "completed", message: "Reading the request and preparing a tracked task.", progress: 12 },
  { agent: "Campaign Leader", step: "Strategy", status: "running", message: "Routing the next safest specialist step.", progress: 24 },
  { agent: "Lead Agent", step: "Lead search", status: "pending", message: "Waiting for campaign strategy and available lead sources.", progress: 38 },
  { agent: "Research Agent", step: "Research", status: "pending", message: "Company research and public signals will be saved with confidence.", progress: 52 },
  { agent: "Copywriting Agent", step: "Drafting", status: "pending", message: "Drafts stay review-gated before sending.", progress: 68 },
  { agent: "QA Agent", step: "QA", status: "pending", message: "Spam risk, personalization safety, and score 80+ are checked.", progress: 78 },
  { agent: "Sending Agent", step: "Sending readiness", status: "pending", message: "Sending starts only after all gates pass and the draft is approved.", progress: 88 },
];

export function VeldoChatClient() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([
    {
      role: "assistant",
      content: "Tell me what you want to build. I can create the campaign, find leads, research companies, draft emails, run QA, and show each process as it moves.",
      metadata: { events: [readyEvent] },
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/veldo-agent/chat")
      .then((response) => response.json())
      .then((json) => {
        if (!mounted || !json.ok || !json.data?.thread?.id || !json.data.messages?.length) return;
        setThreadId(json.data.thread.id);
        setMessages(json.data.messages);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant"), [messages]);
  const events = loading ? liveEvents : latestAssistant?.metadata?.events ?? [readyEvent];
  const questions = latestAssistant?.metadata?.questions ?? [];
  const progress = events.length ? Math.max(...events.map((event) => event.progress)) : 0;

  async function sendMessage(value?: string) {
    const message = (value ?? draft).trim();
    if (!message || loading) return;
    setDraft("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }]);
    try {
      const response = await fetch("/api/veldo-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error ?? "Vel could not process that request.");
      const data = json.data as ChatResponse;
      setThreadId(data.threadId);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.message,
          metadata: { events: data.events ?? [], questions: data.questions ?? [], finalResult: data.finalResult },
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vel could not process that request.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="vel-chat-shell">
      <div className="vel-chat-main">
        <header className="vel-chat-hero">
          <div>
            <span className="premium-eyebrow">Veldo Chat</span>
            <h1>What should Vel do next?</h1>
            <p>Ask Vel to create the campaign, find leads, research companies, draft emails, run QA, and prepare everything for human approval.</p>
          </div>
          <Badge tone="green">Campaign Leader + safety gates</Badge>
        </header>

        <div className="vel-process-strip" aria-label="Agent process states">
          {processStages.map((stage) => (
            <span className={`vel-process-chip ${stageClass(stage, events, loading)}`} key={stage}>
              {stageIcon(stage, events, loading)}
              {stage}
            </span>
          ))}
        </div>

        <div className="vel-chat-thread">
          {messages.map((message, index) => (
            <article className={`vel-chat-message ${message.role === "user" ? "user" : "assistant"}`} key={`${message.role}-${index}-${message.id ?? "local"}`}>
              <span className="vel-chat-avatar">
                {message.role === "user" ? <UserCircle size={19} /> : <Bot size={19} />}
              </span>
              <div className="vel-chat-bubble">
                <div className="vel-chat-meta">
                  <strong>{message.role === "user" ? "You" : "Vel"}</strong>
                  {message.role !== "user" ? <span>Sales team OS</span> : null}
                </div>
                <p>{message.content}</p>
                {message.metadata?.questions?.length ? (
                  <div className="vel-question-stack">
                    {message.metadata.questions.map((question) => (
                      <div className="vel-question" key={question.id}>
                        <span>{question.question}</span>
                        <div className="vel-options">
                          {question.options.map((option) => (
                            <button className="btn ghost" disabled={loading} key={option.value} type="button" onClick={() => void sendMessage(option.value)}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {loading ? (
            <article className="vel-chat-message assistant">
              <span className="vel-chat-avatar"><Loader2 className="spin" size={19} /></span>
              <div className="vel-chat-bubble">
                <div className="vel-chat-meta">
                  <strong>Vel</strong>
                  <span>working</span>
                </div>
                <p>I am routing agents now. You will see drafting, gate checks, sending readiness, saved records, and blockers here as the task completes.</p>
              </div>
            </article>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? <div className="agent-error">{error}</div> : null}

        <div className="vel-starters">
          {starterPrompts.map((prompt) => (
            <button className="btn ghost" disabled={loading} key={prompt} type="button" onClick={() => void sendMessage(prompt)}>
              <Sparkles size={15} />
              {prompt}
            </button>
          ))}
        </div>

        <form className="vel-chat-composer" onSubmit={submit}>
          <textarea
            aria-label="Message Vel"
            disabled={loading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Message Veldo... e.g. find leads, research, draft, gate, send after approval"
            value={draft}
          />
          <button className="btn primary" disabled={loading || !draft.trim()} type="submit" aria-label="Send message">
            {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>

      <aside className="vel-live-panel">
        <div className="premium-card">
          <div className="vel-progress-head">
            <div>
              <span className="premium-eyebrow">Live Task Progress</span>
              <h2>{progress}% complete</h2>
            </div>
            <Badge tone={progress === 100 ? "green" : "blue"}>{loading ? "running" : progress === 100 ? "saved" : "active"}</Badge>
          </div>
          <ProgressLine value={progress} />
          <div className="vel-step-list">
            {events.map((event, index) => (
              <div className="vel-step" key={`${event.agent}-${event.step}-${index}`}>
                <span className={`vel-step-icon ${event.status}`}>
                  {event.status === "completed" ? <CheckCircle2 size={16} /> : event.status === "failed" ? <TriangleAlert size={16} /> : event.status === "running" ? <Loader2 className="spin" size={16} /> : <CircleDot size={16} />}
                </span>
                <div>
                  <strong>{event.step}</strong>
                  <p>{event.agent}</p>
                  <span>{event.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-card vel-gate-card">
          <div className="premium-section-head">
            <div>
              <h2>Execution Gates</h2>
              <p>Drafts, gate checks, sending readiness, follow-up, and replies stay visible while provider details stay protected.</p>
            </div>
            <ShieldCheck size={18} color="var(--success)" />
          </div>
          {["Drafts require QA score 80+", "Human approval is mandatory", "Mailbox and credits must be ready", "Unsubscribe and compliance checks must pass"].map((item) => (
            <div className="premium-list-row" key={item}>
              <span>{item}</span>
              <CheckCircle2 size={14} color="var(--success)" />
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function stageClass(stage: string, events: VelEvent[], loading: boolean) {
  const event = eventForStage(stage, events);
  if (event?.status === "failed" || event?.status === "needs_review") return "blocked";
  if (event?.status === "running") return "running";
  if (event?.status === "completed") return "done";
  if (!loading && (stage === "Sent" || stage === "Sending") && events.some((item) => /sent/i.test(item.message))) return "done";
  return "pending";
}

function stageIcon(stage: string, events: VelEvent[], loading: boolean) {
  const className = stageClass(stage, events, loading);
  if (className === "done") return <CheckCircle2 size={14} />;
  if (className === "blocked") return <TriangleAlert size={14} />;
  if (className === "running") return <Loader2 className="spin" size={14} />;
  return <Clock3 size={14} />;
}

function eventForStage(stage: string, events: VelEvent[]) {
  const normalized = stage.toLowerCase();
  return events.find((event) => {
    const text = `${event.step} ${event.agent} ${event.message}`.toLowerCase();
    if (normalized === "drafting") return /draft|copywriting|personalization/.test(text);
    if (normalized === "sending") return /sending|send queued|mailbox/.test(text);
    if (normalized === "sent") return /sent/.test(text);
    if (normalized === "gate check") return /gate|safety|compliance/.test(text);
    return text.includes(normalized);
  });
}
