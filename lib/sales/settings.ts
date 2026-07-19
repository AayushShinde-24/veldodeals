// Sales pillar guardrail settings — shape stored in workspaces.sales_settings.
export interface SalesSettings {
  dailyEmails: number;
  dailyCalls: number;
  sendStart: string;
  sendEnd: string;
  timezone: string;
  tone: string;
  monthlyBudget: number;
  approvals: { emails: boolean; calls: boolean; meetings: boolean };
}

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  dailyEmails: 150,
  dailyCalls: 25,
  sendStart: "09:00",
  sendEnd: "17:30",
  timezone: "America/New_York",
  tone: "direct",
  monthlyBudget: 6000,
  approvals: { emails: false, calls: true, meetings: true },
};

export const SALES_TONES = [
  { id: "direct", label: "Direct" },
  { id: "friendly", label: "Friendly" },
  { id: "formal", label: "Formal" },
  { id: "playful", label: "Playful" },
] as const;

export const SALES_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;
