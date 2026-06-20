import { resolveTxt } from "dns/promises";

export interface DomainAuthCheck {
  domain: string;
  spf: { pass: boolean; record?: string };
  dkim: { pass: boolean; selector: string; record?: string };
  dmarc: { pass: boolean; record?: string };
}

export async function checkDomainAuth(domain: string, selector = "default"): Promise<DomainAuthCheck> {
  const cleanDomain = domain.trim().toLowerCase().replace(/^@/u, "");
  const [spfRecords, dkimRecords, dmarcRecords] = await Promise.all([
    txt(cleanDomain),
    txt(`${selector}._domainkey.${cleanDomain}`),
    txt(`_dmarc.${cleanDomain}`),
  ]);
  const spf = spfRecords.find((record) => record.toLowerCase().startsWith("v=spf1"));
  const dkim = dkimRecords.find((record) => record.toLowerCase().includes("v=dkim1"));
  const dmarc = dmarcRecords.find((record) => record.toLowerCase().startsWith("v=dmarc1"));
  return {
    domain: cleanDomain,
    spf: { pass: !!spf, record: spf },
    dkim: { pass: !!dkim, selector, record: dkim },
    dmarc: { pass: !!dmarc, record: dmarc },
  };
}

async function txt(hostname: string): Promise<string[]> {
  try {
    return (await resolveTxt(hostname)).map((parts) => parts.join(""));
  } catch {
    return [];
  }
}
