import { ENV } from "./_core/env";

const LEADFINDER_BASE = "https://pro-leads-hub.base44.app/api";
const API_KEY = process.env.LEADFINDER_API_KEY ?? "";

async function lfFetch(path: string, options: RequestInit = {}) {
  const url = `${LEADFINDER_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "api_key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`LeadFinder API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Récupérer les contacts avec pagination
export async function getLeadFinderContacts(opts: {
  limit?: number;
  skip?: number;
  query?: Record<string, unknown>;
  sort_by?: string;
} = {}) {
  const params = new URLSearchParams();
  if (opts.limit)   params.set("limit", String(opts.limit));
  if (opts.skip)    params.set("skip", String(opts.skip));
  if (opts.query)   params.set("q", JSON.stringify(opts.query));
  if (opts.sort_by) params.set("sort_by", opts.sort_by);
  const qs = params.toString() ? `?${params}` : "";
  return lfFetch(`/entities/ProfessionalContact${qs}`);
}

// Récupérer tous les contacts (pagination auto)
export async function getAllLeadFinderContacts() {
  const all: any[] = [];
  let skip = 0;
  while (true) {
    const batch = await getLeadFinderContacts({ limit: 100, skip });
    if (!batch?.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    skip += 100;
  }
  return all;
}

// Récupérer les campagnes email
export async function getEmailCampaigns(opts: { limit?: number; skip?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.skip)  params.set("skip", String(opts.skip));
  const qs = params.toString() ? `?${params}` : "";
  return lfFetch(`/entities/EmailCampaign${qs}`);
}

// Créer une campagne email
export async function createEmailCampaign(data: {
  name: string;
  subject: string;
  body: string;
  niche?: string;
  ville?: string;
  relance_j3?: string;
  relance_j7?: string;
  relance_j14?: string;
  recipients?: any[];
}) {
  return lfFetch("/entities/EmailCampaign", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Récupérer les templates
export async function getEmailTemplates() {
  return lfFetch("/entities/EmailTemplate");
}

// Créer un template
export async function createEmailTemplate(data: {
  name: string;
  subject: string;
  body: string;
  category?: string;
}) {
  return lfFetch("/entities/EmailTemplate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Envoyer un email via LeadFinder (sendOutlookEmail)
export async function sendCampaignEmail(payload: {
  to: string;
  subject: string;
  body: string;
  campaign_id?: string;
}) {
  return lfFetch("/functions/sendOutlookEmail", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
