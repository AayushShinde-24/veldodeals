"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/integrations/supabase";
import { isDemoMode } from "@/lib/demo/mode";
import { getEnv } from "@/lib/security/env";
import { ensureDefaultWorkspace } from "@/src/lib/workspace/context";
import { trackEvent } from "@/src/lib/analytics/events";

export async function signInWithGoogleAction(next: string = "/dashboard") {
  const supabase = await createAuthClient();
  const appUrl = getEnv().VELDO_APP_URL.replace(/\/$/u, "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}` },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("Google sign-in is unavailable right now. Please try again.")}`);
  }
  redirect(data.url);
}

export async function signInAction(formData: FormData) {
  // Demo mode: no Supabase configured — skip auth and enter the demo workspace.
  if (isDemoMode()) redirect("/dashboard");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createAuthClient();
  let result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error?.message.toLowerCase().includes("email not confirmed")) {
    await confirmUserEmail(email);
    result = await supabase.auth.signInWithPassword({ email, password });
  }
  if (result.error || !result.data.user) redirect(`/login?error=${encodeURIComponent(result.error?.message ?? "Sign in failed.")}`);
  await ensureDefaultWorkspace(result.data.user.id, result.data.user.email ?? email, result.data.user.user_metadata ?? {});
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  // Demo mode: no Supabase configured — skip auth and start onboarding.
  if (isDemoMode()) redirect("/onboarding");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const companyName = String(formData.get("company_name") ?? "");
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
    },
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  if (data.user && !data.session) {
    await confirmUserEmail(email);
  }
  const signedIn = data.session
    ? { data, error: null }
    : await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) redirect(`/login?error=${encodeURIComponent(signedIn.error?.message ?? "Sign up succeeded. Please sign in.")}`);
  await ensureDefaultWorkspace(signedIn.data.user.id, signedIn.data.user.email ?? email, {
    ...signedIn.data.user.user_metadata,
    full_name: fullName,
    company_name: companyName,
  });
  await trackEvent({ userId: signedIn.data.user.id, event: "user_signed_up", properties: { email } });
  // New users start at onboarding; returning sessions (sign-in) go to dashboard
  redirect("/onboarding");
}

export async function signOutAction() {
  if (isDemoMode()) redirect("/login");
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function confirmUserEmail(email: string) {
  const admin = createServiceClient().auth.admin;
  const users = await admin.listUsers({ page: 1, perPage: 1000 });
  const user = users.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) return;
  await admin.updateUserById(user.id, { email_confirm: true });
}
