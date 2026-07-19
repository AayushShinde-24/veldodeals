"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { isAutonomyMode } from "@/lib/autonomy/modes";
import { createServiceClient } from "@/lib/integrations/supabase";
import { DEFAULT_SALES_SETTINGS, type SalesSettings } from "@/lib/sales/settings";
import { writeAuditLog } from "@/src/lib/audit/log";
import { getWorkspaceContext } from "@/src/lib/workspace/context";

function clampInt(value: FormDataEntryValue | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Persist the sales guardrails on the workspace. Demo mode: succeed without a
// write so the flow stays exercisable end-to-end before keys land.
export async function saveSalesSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const modeRaw = String(formData.get("autonomy") ?? "auto");
  const autonomy = isAutonomyMode(modeRaw) ? modeRaw : "auto";
  const settings: SalesSettings = {
    dailyEmails: clampInt(formData.get("daily_emails"), DEFAULT_SALES_SETTINGS.dailyEmails, 1, 2000),
    dailyCalls: clampInt(formData.get("daily_calls"), DEFAULT_SALES_SETTINGS.dailyCalls, 0, 500),
    sendStart: String(formData.get("send_start") ?? DEFAULT_SALES_SETTINGS.sendStart),
    sendEnd: String(formData.get("send_end") ?? DEFAULT_SALES_SETTINGS.sendEnd),
    timezone: String(formData.get("timezone") ?? DEFAULT_SALES_SETTINGS.timezone),
    tone: String(formData.get("tone") ?? DEFAULT_SALES_SETTINGS.tone),
    monthlyBudget: clampInt(formData.get("monthly_budget"), DEFAULT_SALES_SETTINGS.monthlyBudget, 0, 1_000_000),
    approvals: {
      emails: formData.get("approve_emails") === "on",
      calls: formData.get("approve_calls") === "on",
      meetings: formData.get("approve_meetings") === "on",
    },
  };

  const { isDemoMode } = await import("@/lib/demo/mode");
  if (!isDemoMode()) {
    const context = await getWorkspaceContext(user.id);
    if (!context) redirect("/sales/settings?error=1");
    try {
      await createServiceClient()
        .from("workspaces")
        .update({ autonomy_mode: autonomy, sales_settings: settings })
        .eq("id", context.workspaceId);
      await writeAuditLog({
        workspaceId: context.workspaceId,
        userId: user.id,
        action: `sales_settings.saved.${autonomy}`,
      });
    } catch {
      redirect("/sales/settings?error=1");
    }
  }
  redirect("/sales/settings?saved=1");
}

/** Load persisted settings (workspace row) with safe defaults for demo/pre-migration. */
export async function loadSalesSettings(userId: string): Promise<{ autonomy: string; settings: SalesSettings }> {
  const { isDemoMode } = await import("@/lib/demo/mode");
  if (isDemoMode()) return { autonomy: "auto", settings: DEFAULT_SALES_SETTINGS };

  try {
    const context = await getWorkspaceContext(userId);
    if (!context) return { autonomy: "auto", settings: DEFAULT_SALES_SETTINGS };
    const { data } = await createServiceClient()
      .from("workspaces")
      .select("autonomy_mode, sales_settings")
      .eq("id", context.workspaceId)
      .maybeSingle();
    const stored = (data?.sales_settings ?? {}) as Partial<SalesSettings>;
    return {
      autonomy: isAutonomyMode(data?.autonomy_mode) ? data.autonomy_mode : "auto",
      settings: {
        ...DEFAULT_SALES_SETTINGS,
        ...stored,
        approvals: { ...DEFAULT_SALES_SETTINGS.approvals, ...(stored.approvals ?? {}) },
      },
    };
  } catch {
    return { autonomy: "auto", settings: DEFAULT_SALES_SETTINGS };
  }
}
