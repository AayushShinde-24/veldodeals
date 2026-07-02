import { fetchWithRetry, isTransientError } from "@/lib/integrations/retry";

export interface GmailSendOptions {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody?: string;
  body?: string;
  textBody?: string;
  listUnsubscribeUrl?: string;
  replyToMessageId?: string;
  threadId?: string;
  [key: string]: unknown;
}

export async function sendGmailMessage(options: GmailSendOptions): Promise<{ id: string; messageId: string; threadId: string }> {
  const boundary = `boundary_${Date.now()}`;
  const mimeMessage = buildMime(options, boundary);
  const encodedMessage = Buffer.from(mimeMessage).toString("base64url");

  const body: Record<string, string> = { raw: encodedMessage };
  if (options.threadId) body.threadId = options.threadId;

  const res = await fetchWithRetry(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    { provider: "google", endpoint: "gmail.messages.send", shouldRetry: isTransientError, timeoutMs: 20_000 }
  );

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(`Gmail send error: ${err.error?.message ?? res.statusText}`);
  }

  const result = (await res.json()) as { id: string; threadId: string };
  return { id: result.id, messageId: result.id, threadId: result.threadId };
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<{
  id: string;
  subject: string;
  from: string;
  body: string;
  snippet?: string;
  threadId?: string;
  payload?: { headers?: { name: string; value: string }[]; parts?: unknown[]; body?: unknown };
}> {
  const res = await fetchWithRetry(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    { provider: "google", endpoint: "gmail.messages.get", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );
  if (!res.ok) throw new Error("Failed to fetch Gmail message.");
  const msg = (await res.json()) as {
    id: string;
    threadId?: string;
    snippet?: string;
    payload?: {
      headers?: { name: string; value: string }[];
      parts?: { mimeType: string; body?: { data?: string } }[];
      body?: { data?: string };
    };
  };

  const headers = msg.payload?.headers ?? [];
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
  const from = headers.find((h) => h.name === "From")?.value ?? "";
  const bodyData =
    msg.payload?.parts?.find((p) => p.mimeType === "text/plain")?.body?.data ??
    msg.payload?.body?.data ??
    "";
  const body = Buffer.from(bodyData, "base64url").toString("utf-8");

  return { id: msg.id, threadId: msg.threadId, snippet: msg.snippet, payload: msg.payload, subject, from, body };
}

export async function listGmailReplies(
  accessToken: string,
  threadId?: string
): Promise<{ messages: { id: string; messageId: string; from: string; body: string; date: string }[] }> {
  if (!threadId) {
    // List inbox messages (last 14 days)
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0].replace(/-/g, "/");
    const res = await fetchWithRetry(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=after:${since}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      { provider: "google", endpoint: "gmail.messages.list", shouldRetry: isTransientError, timeoutMs: 15_000 }
    );
    if (!res.ok) return { messages: [] };
    const data = (await res.json()) as { messages?: { id: string }[] };
    const messages = (data.messages ?? []).map((m) => ({
      id: m.id,
      messageId: m.id,
      from: "",
      body: "",
      date: "",
    }));
    return { messages };
  }

  const res = await fetchWithRetry(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    { provider: "google", endpoint: "gmail.threads.get", shouldRetry: isTransientError, timeoutMs: 15_000 }
  );
  if (!res.ok) return { messages: [] };
  const thread = (await res.json()) as {
    messages?: {
      id: string;
      payload?: {
        headers?: { name: string; value: string }[];
        body?: { data?: string };
        parts?: { mimeType: string; body?: { data?: string } }[];
      };
    }[];
  };

  const messages = (thread.messages ?? []).slice(1).map((msg) => {
    const hdrs = msg.payload?.headers ?? [];
    const from = hdrs.find((h) => h.name === "From")?.value ?? "";
    const date = hdrs.find((h) => h.name === "Date")?.value ?? "";
    const bodyData =
      msg.payload?.parts?.find((p) => p.mimeType === "text/plain")?.body?.data ??
      msg.payload?.body?.data ??
      "";
    return {
      id: msg.id,
      messageId: msg.id,
      from,
      date,
      body: Buffer.from(bodyData, "base64url").toString("utf-8"),
    };
  });

  return { messages };
}

function buildMime(options: GmailSendOptions, boundary: string): string {
  const lines: string[] = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    ...(options.listUnsubscribeUrl
      ? [
          `List-Unsubscribe: <${options.listUnsubscribeUrl}>`,
          `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
        ]
      : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    options.textBody ?? stripHtml(options.htmlBody ?? options.body ?? ""),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    options.htmlBody ?? options.body ?? "",
    "",
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
