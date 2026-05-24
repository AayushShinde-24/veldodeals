import "server-only";

export async function sendGmailMessage(input: {
  accessToken: string;
  from?: string | null;
  to: string;
  subject: string;
  body: string;
}) {
  const message = [
    input.from ? `From: ${input.from}` : null,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ].filter(Boolean).join("\r\n");

  const raw = Buffer.from(message)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) throw new Error("Mailbox send failed.");
  return response.json() as Promise<{ id: string; threadId?: string }>;
}

export async function listGmailReplies(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox newer_than:14d", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Mailbox reply sync failed.");
  return response.json() as Promise<{ messages?: Array<{ id: string; threadId: string }> }>;
}

export async function getGmailMessage(accessToken: string, messageId: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Mailbox message fetch failed.");
  return response.json() as Promise<{
    id: string;
    threadId?: string;
    snippet?: string;
    payload?: { headers?: Array<{ name: string; value: string }> };
  }>;
}
