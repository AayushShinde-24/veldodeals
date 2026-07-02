"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Clock, Shield, Trash2, UserPlus, Users } from "lucide-react";
import useSWR from "swr";
import { DataTable, EmptyState, GlassCard, MetricCard, PageHeader, PageShell, SectionHeader, StatusPill } from "@/components/premium";

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

type Member = {
  id: string;
  email: string | null;
  role: string;
};

type TeamData = {
  members: Member[];
  invites: PendingInvite[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TeamPage() {
  const { data, mutate } = useSWR<{ data: TeamData }>("/api/team", fetcher);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "viewer">("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const members: Member[] = data?.data?.members ?? [];
  const invites: PendingInvite[] = data?.data?.invites ?? [];

  const isAdminOrOwner =
    members.find((m) => m.role === "owner" || m.role === "admin") !== undefined;

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Could not send invite.");
          return;
        }
        setSuccess(`Invite sent to ${email}`);
        setEmail("");
        mutate();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch("/api/team/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (res.ok) mutate();
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Team"
        title="Human operators stay in control"
        description="Invite teammates to your workspace. Roles govern what each person can approve, edit, and configure."
      />

      <section className="grid cols-3">
        <MetricCard
          icon={Users}
          label="Members"
          value={members.length || "—"}
          trend="Active workspace operators"
        />
        <MetricCard
          icon={Shield}
          label="Your role"
          value={members.find((m) => m.role === "owner")?.role ?? members[0]?.role ?? "—"}
          trend="Controls outbound gates"
          tone="green"
        />
        <MetricCard
          icon={Clock}
          label="Pending invites"
          value={invites.length}
          trend={invites.length === 1 ? "1 awaiting acceptance" : `${invites.length} awaiting acceptance`}
          tone={invites.length > 0 ? "orange" : undefined}
        />
      </section>

      <section className="grid cols-2">
        {/* Members table */}
        <GlassCard>
          <SectionHeader
            title="Members"
            description="Everyone currently in your workspace."
            action={<Users size={18} color="var(--blue)" />}
          />
          <DataTable
            headers={["Member", "Role", "Status"]}
            rows={
              members.length > 0
                ? members.map((m) => [
                    m.email ?? "—",
                    <StatusPill key={m.id} status={m.role} />,
                    "Active",
                  ])
                : []
            }
            empty={
              <EmptyState
                title="No members yet"
                description="Sign in to see your workspace membership."
              />
            }
          />
        </GlassCard>

        {/* Invite form + pending invites */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassCard>
            <SectionHeader
              title="Invite teammate"
              description="Invites expire after 7 days. The recipient will receive an email with an accept link."
              action={<UserPlus size={18} color="var(--blue)" />}
            />

            <form onSubmit={sendInvite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="email"
                  className="input"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "member" | "admin" | "viewer")}
                  style={{ width: 120 }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {error && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
              )}
              {success && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--ok)", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={13} /> {success}
                </p>
              )}

              <button type="submit" className="btn primary" disabled={isPending || !email}>
                {isPending ? "Sending…" : "Send invite"}
              </button>
            </form>
          </GlassCard>

          {invites.length > 0 && (
            <GlassCard>
              <SectionHeader
                title="Pending invites"
                description="Invites waiting to be accepted."
              />
              <DataTable
                headers={["Email", "Role", "Expires", ""]}
                rows={invites.map((inv) => [
                  inv.email,
                  <StatusPill key={inv.id} status={inv.role} />,
                  new Date(inv.expires_at).toLocaleDateString(),
                  <button
                    key={`revoke-${inv.id}`}
                    className="btn icon"
                    title="Revoke invite"
                    onClick={() => revokeInvite(inv.id)}
                  >
                    <Trash2 size={14} />
                  </button>,
                ])}
                empty={null}
              />
            </GlassCard>
          )}
        </div>
      </section>
    </PageShell>
  );
}
