"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Edit3, KeyRound, RotateCcw, Search, Trash2 } from "lucide-react";
import { Badge, DataTable, EmptyState, GlassCard } from "@/components/premium";
import { StatusPill } from "@/components/status-pill";

type ApiKeyRow = {
  id: string;
  name: string;
  mode: "test" | "live";
  key_prefix: string;
  key_last_four: string;
  masked_key: string;
  permissions: Array<"campaigns:read" | "usage:read">;
  status: "active" | "disabled" | "revoked";
  request_count: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

// Add-on / API credit rate ($0.12 per regular credit), ~1 credit per request.
const CREDIT_RATE_USD = 0.12;
const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ApiKeyManager({ initialKeys, initialError }: { initialKeys: ApiKeyRow[]; initialError: string | null }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [message, setMessage] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [query, setQuery] = useState("");

  const activeCount = useMemo(() => keys.filter((key) => key.status === "active").length, [keys]);
  const filteredKeys = useMemo(() => keys.filter((key) => key.name.toLowerCase().includes(query.toLowerCase()) || key.masked_key.toLowerCase().includes(query.toLowerCase())), [keys, query]);
  const usage = useMemo(() => {
    const requests = keys.reduce((sum, key) => sum + (key.request_count ?? 0), 0);
    const credits = requests; // ~1 credit per API request
    return { requests, credits, spend: credits * CREDIT_RATE_USD };
  }, [keys]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#create-api-key") setShowCreator(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadKeys() {
      try {
        const response = await fetch("/api/settings/api-keys");
        const json = await response.json() as ApiResponse<ApiKeyRow[]>;
        if (!ignore && response.ok && json.ok && json.data) {
          setKeys(json.data);
          setMessage(null);
        } else if (!ignore && json.error) {
          setMessage(json.error);
        }
      } catch {
        if (!ignore) setMessage("API keys could not be loaded.");
      }
    }
    void loadKeys();
    return () => {
      ignore = true;
    };
  }, []);

  async function createKey() {
    setBusy(true);
    setMessage(null);
    setCreatedKey(null);
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await response.json() as ApiResponse<{ key: string; record: ApiKeyRow }>;
      if (!response.ok || !json.ok || !json.data) throw new Error(json.error ?? "API key could not be created.");
      setCreatedKey(json.data.key);
      setKeys((current) => [json.data!.record, ...current]);
      setMessage("Copy this key now. You will not be able to see it again.");
      setShowCreator(false);
      setName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API key could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function updateKey(id: string, patch: Partial<Pick<ApiKeyRow, "name" | "status">>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await response.json() as ApiResponse<ApiKeyRow>;
      if (!response.ok || !json.ok || !json.data) throw new Error(json.error ?? "API key could not be updated.");
      setKeys((current) => current.map((key) => key.id === id ? json.data! : key));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API key could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteKey(id: string) {
    if (!window.confirm("Delete this API key? This cannot be undone.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
      const json = await response.json() as ApiResponse<{ deleted: boolean }>;
      if (!response.ok || !json.ok) throw new Error(json.error ?? "API key could not be deleted.");
      setKeys((current) => current.filter((key) => key.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API key could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCreatedKey() {
    if (!createdKey) return;
    await window.navigator.clipboard.writeText(createdKey);
    setMessage("Copied. Store it somewhere secure; Veldo will only show it this once.");
  }

  return (
    <section className="api-keys-panel">
      <GlassCard>
        <div className="api-keys-toolbar">
          <div className="api-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." aria-label="Search API keys" />
          </div>
          <Badge tone="green">{activeCount} active</Badge>
          <button id="create-api-key" className="btn primary" type="button" onClick={() => setShowCreator((current) => !current)}>
            <KeyRound size={16} /> Generate new API key
          </button>
        </div>
        <div className="api-usage-summary">
          <div className="api-usage-stat"><span>Requests</span><strong>{usage.requests.toLocaleString()}</strong></div>
          <div className="api-usage-stat"><span>Credits used</span><strong>{usage.credits.toLocaleString()}</strong></div>
          <div className="api-usage-stat"><span>Est. spend</span><strong>{usd(usage.spend)}</strong></div>
          <div className="api-usage-stat"><span>Active keys</span><strong>{activeCount}</strong></div>
        </div>
        {showCreator ? (
          <div className="api-key-modal-backdrop" role="presentation" onClick={() => !busy && setShowCreator(false)}>
            <div className="api-key-modal" role="dialog" aria-modal="true" aria-labelledby="api-key-modal-title" onClick={(event) => event.stopPropagation()}>
              <div>
                <span className="premium-eyebrow">Developer settings</span>
                <h2 id="api-key-modal-title">Create API key</h2>
                <p className="muted">Name this key. The secret value is shown once after creation.</p>
              </div>
              <div className="field"><label htmlFor="api-key-name">Name</label><input id="api-key-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="My API key" onKeyDown={(event) => { if (event.key === "Enter" && name.trim()) void createKey(); }} /></div>
              <div className="api-key-modal-actions">
                <button className="btn" type="button" disabled={busy} onClick={() => setShowCreator(false)}>Cancel</button>
                <button className="btn primary" type="button" onClick={createKey} disabled={busy || !name.trim()}><KeyRound size={16} /> Create secret key</button>
              </div>
            </div>
          </div>
        ) : null}
        {createdKey ? (
          <div className="one-time-key">
            <div><strong>Copy your key now</strong><p>It will be hidden after you leave or refresh this page.</p></div>
            <code>{createdKey}</code>
            <button className="btn" type="button" onClick={copyCreatedKey}><Copy size={16} /> Copy key</button>
          </div>
        ) : null}
        {message ? <div className="api-key-message">{message}</div> : null}

        <DataTable
          headers={["Name", "Status", "Secret key", "Created", "Last used", "Usage", "Actions"]}
          rows={filteredKeys.map((key) => [
            <EditableName keyRow={key} disabled={busy} onSave={(value) => updateKey(key.id, { name: value })} />,
            <StatusPill status={key.status} />,
            <span className="mono-key">{key.masked_key}</span>,
            new Date(key.created_at).toLocaleDateString(),
            key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never",
            <span className="api-usage-cell">
              {(key.request_count ?? 0).toLocaleString()} reqs · ~{usd((key.request_count ?? 0) * CREDIT_RATE_USD)}
            </span>,
            <div className="inline-actions" key={key.id}>
              {key.status === "active" ? <button className="icon-btn small" type="button" disabled={busy} onClick={() => updateKey(key.id, { status: "disabled" })} title="Disable"><Edit3 size={14} /></button> : null}
              {key.status === "disabled" ? <button className="icon-btn small" type="button" disabled={busy} onClick={() => updateKey(key.id, { status: "active" })} title="Enable"><RotateCcw size={14} /></button> : null}
              {key.status !== "revoked" ? <button className="icon-btn small danger" type="button" disabled={busy} onClick={() => updateKey(key.id, { status: "revoked" })} title="Revoke"><RotateCcw size={14} /></button> : null}
              <button className="btn danger" type="button" disabled={busy} onClick={() => deleteKey(key.id)} aria-label={`Delete ${key.name}`}><Trash2 size={14} /></button>
            </div>,
          ])}
          empty={<EmptyState icon={KeyRound} title="No API keys yet" description="Generate a key to call Veldo from your own app or backend." />}
        />
      </GlassCard>
    </section>
  );
}

function EditableName({ keyRow, disabled, onSave }: { keyRow: ApiKeyRow; disabled: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(keyRow.name);
  const changed = value.trim() && value.trim() !== keyRow.name;
  return (
    <div className="api-key-name-editor">
      <input value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} aria-label={`Rename ${keyRow.name}`} />
      {changed ? <button className="btn" type="button" disabled={disabled} onClick={() => onSave(value.trim())}>Save</button> : null}
    </div>
  );
}
