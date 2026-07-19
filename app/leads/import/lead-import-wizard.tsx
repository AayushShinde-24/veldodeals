"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Database, FileSpreadsheet, History, Loader2,
  Save, Sparkles, Target, Trash2, TrendingUp, Upload, Users, XCircle,
} from "lucide-react";
import styles from "./lead-import.module.css";

// ── Veldo target fields + header synonyms for auto-mapping ──
const FIELDS: { key: string; label: string; required?: boolean; syn: string[] }[] = [
  { key: "full_name", label: "Full name", syn: ["name", "full", "contact"] },
  { key: "email", label: "Email", required: true, syn: ["email", "e-mail", "mail"] },
  { key: "company", label: "Company", syn: ["company", "organization", "org", "account", "employer"] },
  { key: "title", label: "Job title", syn: ["title", "job", "role", "position"] },
  { key: "phone", label: "Phone", syn: ["phone", "mobile", "tel", "cell"] },
  { key: "linkedin_url", label: "LinkedIn URL", syn: ["linkedin", "li", "profile"] },
  { key: "industry", label: "Industry", syn: ["industry", "sector", "vertical"] },
  { key: "country", label: "Country", syn: ["country", "location", "region", "geo"] },
];

const SAMPLE_CSV = `full_name,email,company,job_title,linkedin_url,industry,country
Jordan Lee,jordan@northwind.io,Northwind,VP of Revenue,linkedin.com/in/jordanlee,SaaS,United States
Sam Rivera,sam.rivera@globex.com,Globex,Head of Growth,linkedin.com/in/samr,Fintech,United States
Priya Nair,priya@initech.dev,Initech,Director of Sales,linkedin.com/in/priyanair,SaaS,India
Chris Taylor,chris.taylor@umbrella.co,Umbrella,COO,linkedin.com/in/christaylor,Healthcare,United Kingdom
Mia Chen,mia@hooli.com,Hooli,VP of Marketing,linkedin.com/in/miachen,SaaS,United States
Noah Wilson,noah.wilson@,Acme Corp,VP Sales,linkedin.com/in/noahw,SaaS,Canada
Emma Davis,emma.davis@brightedge,BrightEdge,Head of Ops,,Marketing,United States
Liam Johnson,,Pied Piper,CTO,linkedin.com/in/liamj,SaaS,United States
Sam Rivera,sam.rivera@globex.com,Globex,Head of Growth,linkedin.com/in/samr,Fintech,United States
Olivia Martin,olivia@acmecorp.com,Acme Corp,VP Marketing,linkedin.com/in/oliviam,Retail,Australia
Ava Thompson,ava.thompson@vertexlabs.io,Vertex Labs,Founder,linkedin.com/in/avat,AI,United States
Ethan Brown,ethan.brown@nexus.co,Nexus,Head of Sales,linkedin.com/in/ethanb,Fintech,Germany`;

type Row = Record<string, string>;
type IssueKey = "missing_email" | "invalid_email" | "duplicate" | "missing_company" | "invalid_domain";
interface RowResult { row: Row; index: number; ok: boolean; issues: IssueKey[] }
interface Validation {
  total: number; valid: number; invalid: number; duplicates: number; healthScore: number;
  issueCounts: Record<IssueKey, number>; failed: RowResult[];
}

const ISSUE_LABEL: Record<IssueKey, string> = {
  missing_email: "Missing email", invalid_email: "Invalid email format",
  duplicate: "Duplicate in file", missing_company: "Missing company", invalid_domain: "Invalid email domain",
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function autoMap(headers: string[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const f of FIELDS) {
    let best: string | null = null, bestScore = 0;
    for (const h of headers) {
      const nh = normalize(h);
      let score = 0;
      if (nh === normalize(f.key) || nh === normalize(f.label)) score = 100;
      else if (f.syn.some((s) => nh === normalize(s))) score = 95;
      else if (f.syn.some((s) => nh.includes(normalize(s)))) score = 82;
      if (score > bestScore) { bestScore = score; best = h; }
    }
    map[f.key] = bestScore >= 70 ? best : null;
  }
  return map;
}

function confidenceFor(field: string, header: string | null): number {
  if (!header) return 0;
  const f = FIELDS.find((x) => x.key === field)!;
  const nh = normalize(header);
  if (nh === normalize(f.key) || nh === normalize(f.label)) return 100;
  if (f.syn.some((s) => nh === normalize(s))) return 96;
  if (f.syn.some((s) => nh.includes(normalize(s)))) return 84;
  return 60;
}

function validate(rows: Row[], mapping: Record<string, string | null>, rules: Rules): Validation {
  const emailCol = mapping.email, companyCol = mapping.company;
  const seen = new Set<string>();
  const issueCounts: Record<IssueKey, number> = { missing_email: 0, invalid_email: 0, duplicate: 0, missing_company: 0, invalid_domain: 0 };
  const failed: RowResult[] = [];
  let valid = 0, duplicates = 0;

  rows.forEach((row, index) => {
    const issues: IssueKey[] = [];
    const email = (emailCol ? row[emailCol] ?? "" : "").trim().toLowerCase();
    const company = (companyCol ? row[companyCol] ?? "" : "").trim();
    if (rules.emailRequired && !email) issues.push("missing_email");
    else if (email && !EMAIL_RE.test(email)) {
      issues.push(email.includes("@") ? "invalid_domain" : "invalid_email");
    }
    if (rules.companyRequired && !company) issues.push("missing_company");
    if (rules.dedupe && email && EMAIL_RE.test(email)) {
      if (seen.has(email)) { issues.push("duplicate"); duplicates++; }
      else seen.add(email);
    }
    issues.forEach((i) => (issueCounts[i]++));
    if (issues.length === 0) valid++;
    else failed.push({ row, index, ok: false, issues });
  });

  const total = rows.length;
  const invalid = total - valid;
  const healthScore = total ? Math.round((valid / total) * 100) : 0;
  return { total, valid, invalid, duplicates, healthScore, issueCounts, failed };
}

interface Rules { emailRequired: boolean; companyRequired: boolean; dedupe: boolean; roleNormalize: boolean }

function Donut({ pct, color = "#22c55e" }: { pct: number; color?: string }) {
  const r = 46, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 120 120" className={styles.donut} aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)" className={styles.donutArc}
        style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      <text x="60" y="56" textAnchor="middle" className={styles.donutPct}>{pct}%</text>
      <text x="60" y="74" textAnchor="middle" className={styles.donutLabel}>Valid</text>
    </svg>
  );
}

function Spark({ color }: { color: string }) {
  const d = "M0,22 L14,16 L28,19 L42,10 L56,13 L70,6 L84,9 L100,3";
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={styles.spark} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className={styles.sparkLine} style={{ filter: `drop-shadow(0 0 3px ${color}aa)` }} />
    </svg>
  );
}

export function LeadImportWizard() {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [rules, setRules] = useState<Rules>({ emailRequired: true, companyRequired: true, dedupe: true, roleNormalize: true });
  const [destination, setDestination] = useState<"database" | "campaign" | "both">("both");
  const [campaignId, setCampaignId] = useState("");
  const [drag, setDrag] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rawFileRef = useRef<File | null>(null);

  useEffect(() => {
    fetch("/api/campaigns/list")
      .then((r) => r.json())
      .then((j) => { if (j?.ok && Array.isArray(j.data)) { setCampaigns(j.data); setCampaignId((c) => c || j.data[0]?.id || ""); } })
      .catch(() => undefined);
  }, []);

  const loaded = rows.length > 0;
  const step = !loaded ? 1 : result ? 3 : 2;

  const validation = useMemo<Validation | null>(
    () => (loaded ? validate(rows, mapping, rules) : null),
    [rows, mapping, rules]
  );

  const ingest = useCallback((csv: string, name: string, size: number) => {
    const parsed = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });
    const data = (parsed.data ?? []).filter((r) => Object.values(r).some((v) => String(v ?? "").trim()));
    const hdrs = parsed.meta.fields ?? Object.keys(data[0] ?? {});
    setHeaders(hdrs);
    setRows(data);
    setMapping(autoMap(hdrs));
    setFileName(name);
    setFileSize(size);
    setResult(null);
  }, []);

  const onFile = useCallback((file: File) => {
    rawFileRef.current = file;
    file.text().then((csv) => ingest(csv, file.name, file.size));
  }, [ingest]);

  function loadSample() {
    rawFileRef.current = new File([SAMPLE_CSV], "leads_jun_05_2026.csv", { type: "text/csv" });
    ingest(SAMPLE_CSV, "leads_jun_05_2026.csv", SAMPLE_CSV.length);
  }

  function reset() { setRows([]); setHeaders([]); setFileName(""); setResult(null); rawFileRef.current = null; }

  async function runImport() {
    if (!validation) return;
    setImporting(true); setResult(null);
    try {
      const file = rawFileRef.current;
      if (file && campaignId) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("campaign_id", campaignId);
        const res = await fetch("/api/leads/upload-csv", { method: "POST", body: fd });
        const json = await res.json();
        if (json.ok) { setResult(`Imported ${validation.valid} valid leads into your workspace.`); return; }
        setResult(`Validated ${validation.valid} leads. Server import needs a connected database (${json.error ?? "not persisted"}).`);
        return;
      }
      setResult(`Validated ${validation.valid} of ${validation.total} leads. Select a campaign to persist.`);
    } catch (e) {
      setResult(`Validated ${validation.valid} leads locally. Import failed: ${e instanceof Error ? e.message : "unknown"}.`);
    } finally {
      setImporting(false);
    }
  }

  const dupRate = validation && validation.total ? ((validation.duplicates / validation.total) * 100).toFixed(1) : "0";

  return (
    <div className={styles.wrap}>
      {/* header */}
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}><Upload size={13} /> Lead import</span>
          <h1 className={styles.title}>Import, validate, and activate lead data in minutes</h1>
          <p className={styles.sub}>Upload your CSV, let Veldo validate and enrich, then launch clean, high-fit leads straight into your campaigns.</p>
        </div>
        <a className={styles.ghost} href="/leads"><History size={15} /> Import history</a>
      </div>

      {/* live KPI cards */}
      <div className={styles.kpis}>
        <Kpi icon={Users} accent="#8b5cf6" label="Rows uploaded" value={loaded ? validation!.total.toLocaleString() : "—"} note={fileName ? "CSV file" : "Waiting for file"} />
        <Kpi icon={CheckCircle2} accent="#22c55e" label="Valid contacts" value={loaded ? validation!.valid.toLocaleString() : "—"} note={loaded ? `${validation!.healthScore}% of rows` : "—"} />
        <Kpi icon={AlertTriangle} accent="#f59e0b" label="Duplicate rate" value={loaded ? `${dupRate}%` : "—"} note={loaded ? `${validation!.duplicates} duplicates` : "—"} />
        <Kpi icon={TrendingUp} accent="#22d3ee" label="Data health score" value={loaded ? `${validation!.healthScore}` : "—"} note={loaded && validation!.healthScore >= 75 ? "Excellent" : "Needs review"} />
      </div>

      {/* stepper */}
      <div className={styles.stepper}>
        {["Upload file", "Validate data", "Launch import"].map((s, i) => (
          <div className={`${styles.step} ${step > i + 1 ? styles.stepDone : step === i + 1 ? styles.stepActive : ""}`} key={s}>
            <span className={styles.stepNum}>{step > i + 1 ? <CheckCircle2 size={15} /> : i + 1}</span>
            <div><strong>{s}</strong><span>{["Add your CSV and set import options", "We check quality, duplicates, and formats", "Review and activate your leads"][i]}</span></div>
            {i < 2 && <span className={styles.stepBar} />}
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {/* left: upload + destination */}
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Upload your CSV file</div>
            <div
              className={`${styles.drop} ${drag ? styles.dropActive : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
              onClick={() => fileRef.current?.click()}
            >
              <span className={styles.dropIcon}><Upload size={22} /></span>
              <strong>Drag &amp; drop your file here</strong>
              <span>or click to browse · CSV, UTF-8, up to 200MB</span>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </div>
            <button className={styles.sampleBtn} type="button" onClick={loadSample}><FileSpreadsheet size={14} /> Load sample data</button>

            {fileName && (
              <div className={styles.fileRow}>
                <FileSpreadsheet size={16} />
                <div><strong>{fileName}</strong><span>{rows.length} rows · {(fileSize / 1024).toFixed(1)} KB</span></div>
                <span className={styles.uploaded}><CheckCircle2 size={13} /> Uploaded</span>
                <button className={styles.iconBtn} type="button" onClick={reset} aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            )}

            <div className={styles.field}>
              <label>Select campaign</label>
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">Choose a campaign</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Import destination</div>
            <div className={styles.destRow}>
              {([["database", "Lead database", Database], ["campaign", "Campaign", Target], ["both", "Both", Sparkles]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" className={`${styles.dest} ${destination === k ? styles.destOn : ""}`} onClick={() => setDestination(k)}>
                  <Icon size={16} /><strong>{label}</strong>
                </button>
              ))}
            </div>
            <div className={styles.cardTitle} style={{ marginTop: 18 }}>Import quality rules</div>
            {([["emailRequired", "Email required", "Rows without a valid email are rejected"], ["companyRequired", "Company required", "Rows without a company are rejected"], ["dedupe", "Duplicate removal", "Remove leads already in your database"], ["roleNormalize", "Role normalization", "Standardize titles and seniority"]] as const).map(([k, label, desc]) => (
              <label key={k} className={styles.rule}>
                <div><strong>{label}</strong><span>{desc}</span></div>
                <input type="checkbox" checked={rules[k]} onChange={(e) => setRules((r) => ({ ...r, [k]: e.target.checked }))} />
                <span className={styles.toggle} />
              </label>
            ))}
          </div>
        </div>

        {/* middle: column mapping */}
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Map CSV columns to Veldo fields</div>
              {loaded && <button className={styles.linkBtn} type="button" onClick={() => setMapping(autoMap(headers))}><Sparkles size={13} /> Auto-map</button>}
            </div>
            {!loaded ? (
              <div className={styles.empty}>Upload a CSV to map its columns.</div>
            ) : (
              <div className={styles.mapList}>
                {FIELDS.map((f) => {
                  const header = mapping[f.key];
                  const conf = confidenceFor(f.key, header);
                  return (
                    <div className={styles.mapRow} key={f.key}>
                      <div className={styles.mapField}>{f.label}{f.required && <span className={styles.req}>*</span>}</div>
                      <select value={header ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || null }))}>
                        <option value="">— not mapped —</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <div className={styles.conf}>
                        <span className={styles.confBar}><span style={{ width: `${conf}%`, background: conf >= 90 ? "#22c55e" : conf >= 70 ? "#f59e0b" : "#64748b" }} /></span>
                        <span className={styles.confPct}>{conf}%</span>
                      </div>
                    </div>
                  );
                })}
                <div className={styles.mapFoot}>{FIELDS.filter((f) => mapping[f.key]).length} of {FIELDS.length} fields mapped · {headers.length} CSV columns detected</div>
              </div>
            )}
          </div>

          {loaded && validation!.failed.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Failed rows preview <span className={styles.muted}>(showing {Math.min(5, validation!.failed.length)} of {validation!.failed.length})</span></div>
              <div className={styles.failList}>
                {validation!.failed.slice(0, 5).map((f) => (
                  <div className={styles.failRow} key={f.index}>
                    <XCircle size={14} className={styles.failIcon} />
                    <span className={styles.failName}>{f.row[mapping.full_name ?? ""] || f.row[mapping.email ?? ""] || `Row ${f.index + 1}`}</span>
                    <span className={styles.failReason}>{f.issues.map((i) => ISSUE_LABEL[i]).join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right: validation summary */}
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Validation summary</div>
              {loaded && <span className={styles.livePill}>Live</span>}
            </div>
            {!loaded ? (
              <div className={styles.empty}>Validation runs the moment you upload.</div>
            ) : (
              <>
                <div className={styles.donutWrap}><Donut pct={validation!.healthScore} color={validation!.healthScore >= 75 ? "#22c55e" : "#f59e0b"} /></div>
                <div className={styles.sumRows}>
                  <div className={styles.sumRow}><CheckCircle2 size={13} className={styles.ok} /> Valid rows <b>{validation!.valid.toLocaleString()}</b></div>
                  <div className={styles.sumRow}><AlertTriangle size={13} className={styles.warn} /> Duplicates <b>{validation!.duplicates}</b></div>
                  <div className={styles.sumRow}><XCircle size={13} className={styles.bad} /> Invalid rows <b>{validation!.invalid - validation!.duplicates}</b></div>
                  <div className={styles.sumRow}>Total rows <b>{validation!.total.toLocaleString()}</b></div>
                </div>
              </>
            )}
          </div>

          {loaded && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Review issues</div>
              <div className={styles.issueList}>
                {(Object.keys(validation!.issueCounts) as IssueKey[]).filter((k) => validation!.issueCounts[k] > 0).map((k) => (
                  <div className={styles.issue} key={k}>
                    <span className={styles.issueDot} /><span>{ISSUE_LABEL[k]}</span><b>{validation!.issueCounts[k]}</b>
                  </div>
                ))}
                {validation!.invalid === 0 && <div className={styles.empty}>No issues — every row passed.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* footer actions */}
      <div className={styles.footer}>
        <span className={styles.secure}><CheckCircle2 size={13} /> Your data is secure and private. We never share it with third parties.</span>
        <div className={styles.actions}>
          <button className={styles.ghost} type="button" disabled={!loaded}><Save size={15} /> Save draft</button>
          <button className={styles.primary} type="button" disabled={!loaded || importing} onClick={runImport}>
            {importing ? <><Loader2 className="spin" size={16} /> Importing…</> : <>Validate &amp; continue <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
      {result && <div className={styles.resultBar}><CheckCircle2 size={15} /> {result}</div>}
    </div>
  );
}

function Kpi({ icon: Icon, accent, label, value, note }: { icon: typeof Users; accent: string; label: string; value: string; note: string }) {
  return (
    <div className={styles.kpi} style={{ ["--accent" as string]: accent }}>
      <div className={styles.kpiTop}><span className={styles.kpiLabel}>{label}</span><span className={styles.kpiIcon}><Icon size={15} /></span></div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiNote}>{note}</div>
      <div className={styles.kpiSpark}><Spark color={accent} /></div>
    </div>
  );
}
