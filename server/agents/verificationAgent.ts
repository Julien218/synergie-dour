/**
 * Agent de vérification hebdomadaire des fiches — STUB
 *
 * Ce module nécessite @anthropic-ai/sdk (non installé) et des tables DB (pendingChanges, auditLogs)
 * qui ne sont pas créées. Il est désactivé en production.
 *
 * Le cron qui l'appelle (server/cron/verifyResourcesCron.ts) n'est pas importé dans index.ts.
 *
 * Pour réactiver : installer @anthropic-ai/sdk, créer les tables pending_changes et audit_logs,
 * et importer le cron dans server/_core/index.ts.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

export interface ChangeProposal {
  kind: "none" | "minor" | "major";
  reason: string;
  changes?: Record<string, { old: string; new: string }>;
}

export async function verifyResource(_resourceId: number): Promise<ChangeProposal> {
  throw new Error("Agent de vérification désactivé — @anthropic-ai/sdk non installé");
}

export async function runWeeklyVerification(): Promise<{
  total: number;
  noChange: number;
  minor: number;
  major: number;
  errors: number;
}> {
  console.log("[Agent] Vérification hebdomadaire désactivée — SDK Anthropic non installé");
  return { total: 0, noChange: 0, minor: 0, major: 0, errors: 0 };
}

export async function applyProposal(_resourceId: number, _proposal: ChangeProposal): Promise<void> {
  throw new Error("Agent de vérification désactivé — @anthropic-ai/sdk non installé");
}
