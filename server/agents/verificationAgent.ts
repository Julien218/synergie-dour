/**
 * Agent de vérification hebdomadaire des fiches — version "validation systématique".
 *
 * POLITIQUE DE SÉCURITÉ (décision du bureau ASBL, président Olivier TREVIS) :
 *   L'agent NE MODIFIE JAMAIS le contenu d'une fiche en autonomie.
 *   Il se contente de DÉTECTER les écarts entre la fiche et les sources officielles,
 *   puis de PROPOSER des modifications via une file d'attente que l'admin valide.
 *
 *   Cette politique est non-négociable juridiquement : c'est l'ASBL qui engage sa
 *   responsabilité sur le contenu publié, pas l'agent.
 *
 * RÔLE :
 *   1. Pour chaque fiche, lit les sources officielles (web_search).
 *   2. Compare et classifie le changement détecté : aucun / mineur / majeur.
 *   3. Crée systématiquement une entrée dans `pending_changes` (sauf "aucun").
 *   4. Notifie les admins par email s'il y a au moins un changement à valider.
 *   5. Met à jour `verifiedAt` UNIQUEMENT si aucun changement n'est détecté
 *      (c'est la SEULE écriture autonome autorisée).
 *
 * À LANCER : via cron, par exemple chaque lundi à 6h du matin.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { resources, auditLogs, pendingChanges } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-opus-4-7";

/* ------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* ------------------------------------------------------------------------- */

export type ChangeKind = "none" | "minor" | "major";

export interface ChangeProposal {
  kind: ChangeKind;
  reason: string;
  patches: Array<{
    field: "content" | "summary" | "links" | "title";
    oldValue: string;
    newValue: string;
    sourceUrl: string;
    sourceQuote: string;
    justification: string;
  }>;
}

/* ------------------------------------------------------------------------- */
/* PROMPT SYSTÈME                                                              */
/* ------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `Tu es l'agent de vérification de Synergie Dour, plateforme d'information administrative pour les indépendants belges, gérée par une ASBL.

TON RÔLE EXACT : détecter les écarts entre une fiche publiée et les sources officielles. Tu PROPOSES des modifications. Un humain (l'administrateur de l'ASBL, Olivier TREVIS, ou son suppléant) validera ou rejettera tes propositions. Tu ne modifies JAMAIS la fiche directement.

RÈGLES STRICTES (non-négociables) :

1. NE PROPOSE jamais de modification sans avoir constaté un écart vérifiable entre la fiche et la source officielle. En cas de doute, classe en "none" avec une note expliquant pourquoi tu n'es pas certain.

2. CLASSIFIE chaque changement détecté en :
   - "none" : aucun changement substantiel, la fiche reste valable.
   - "minor" : changement cosmétique, sans impact sur le contenu juridique ou financier. Exemples : un lien officiel a changé d'URL, une faute de frappe, une reformulation pour clarté.
   - "major" : tout changement de fond. Exemples : montant d'aide modifié, condition d'éligibilité changée, nouvelle législation, organisme renommé, plafond modifié, échéance changée, procédure remplacée.

3. CITE TOUJOURS la source qui justifie ton constat (URL exacte + extrait textuel court de moins de 15 mots). Sans citation, ta proposition sera rejetée.

4. NE CONFONDS JAMAIS interprétation et information factuelle.

5. RÉPONDS UNIQUEMENT en JSON valide selon le schéma fourni. Pas de markdown.

6. RESPECTE LE DROIT D'AUTEUR : ne reproduis jamais plus de 14 mots consécutifs d'une source.

CONTEXTE BELGE — sources de référence :
- 1890.be (guichet unique wallon)
- inasti.be (statut social des indépendants)
- finances.belgium.be (SPF Finances, TVA, IPP)
- economie.fgov.be (SPF Économie, BCE)
- wallonie.be (portail régional)
- leforem.be (aides à l'emploi en Wallonie)
- cheques-entreprises.be
- walloniefinancement.be (Wallonie Entreprendre)
- moniteur.be / ejustice.just.fgov.be

Tu connais le droit belge à un niveau professionnel mais tu NE DONNES JAMAIS d'avis juridique.`;

const RESPONSE_SCHEMA = `Réponds STRICTEMENT au format JSON suivant, sans markdown :
{
  "kind": "none" | "minor" | "major",
  "reason": "Explication brève en français",
  "patches": [
    {
      "field": "content" | "summary" | "links" | "title",
      "oldValue": "valeur actuelle dans la fiche",
      "newValue": "nouvelle valeur proposée",
      "sourceUrl": "URL exacte de la source officielle",
      "sourceQuote": "extrait court de la source (max 14 mots)",
      "justification": "ce qui justifie ce changement"
    }
  ]
}
Si kind = "none", patches doit être un tableau vide [].`;

/* ------------------------------------------------------------------------- */
/* FONCTION PRINCIPALE                                                         */
/* ------------------------------------------------------------------------- */

export async function verifyResource(resourceId: number): Promise<ChangeProposal> {
  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, resourceId),
  });

  if (!resource) {
    throw new Error(`Resource ${resourceId} not found`);
  }

  const links = (resource.links as Array<{ label: string; url: string }>) ?? [];

  const userMessage = `Voici la fiche actuelle à vérifier :

TITRE : ${resource.title}
RÉSUMÉ : ${resource.summary}
DATE DE DERNIÈRE VÉRIFICATION : ${resource.verifiedAt}

CONTENU :
${resource.content}

LIENS OFFICIELS À VÉRIFIER :
${links.map((l) => `- ${l.label} : ${l.url}`).join("\n")}

DÉMARCHE :
1. Pour chaque lien, utilise web_search pour vérifier l'URL et le contenu actuel.
2. Compare le contenu de la source avec le contenu de la fiche.
3. Si des écarts existent, classifie-les selon les règles strictes.
4. Réponds en JSON selon le schéma ci-dessous.

${RESPONSE_SCHEMA}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  });

  const textBlock = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  let proposal: ChangeProposal;
  try {
    proposal = JSON.parse(textBlock);
  } catch (err) {
    await logAuditEvent(resourceId, "agent_error", {
      raw: textBlock.substring(0, 500),
      error: String(err),
    });
    throw new Error(`L'agent n'a pas retourné un JSON valide pour la fiche ${resourceId}`);
  }

  if (!isValidProposal(proposal)) {
    await logAuditEvent(resourceId, "agent_invalid_format", { proposal });
    throw new Error(`Format de proposition invalide pour la fiche ${resourceId}`);
  }

  return proposal;
}

/* ------------------------------------------------------------------------- */
/* APPLICATION DES PROPOSITIONS                                                */
/*                                                                             */
/*   Politique : l'agent ne modifie le contenu d'une fiche que dans UN SEUL    */
/*   cas — quand il constate qu'aucun changement n'est nécessaire. Dans ce     */
/*   cas, il met simplement à jour la date `verifiedAt`. Tout le reste passe   */
/*   par la file d'attente validée par l'admin.                                */
/* ------------------------------------------------------------------------- */

export async function applyProposal(resourceId: number, proposal: ChangeProposal): Promise<void> {
  if (proposal.kind === "none") {
    await db
      .update(resources)
      .set({ verifiedAt: new Date().toISOString().split("T")[0] })
      .where(eq(resources.id, resourceId));
    await logAuditEvent(resourceId, "verified_no_change", { reason: proposal.reason });
    return;
  }

  await db.insert(pendingChanges).values({
    resourceId,
    kind: proposal.kind,
    proposal: JSON.stringify(proposal),
    status: "pending",
    createdAt: new Date(),
  });

  await logAuditEvent(resourceId, `${proposal.kind}_change_queued`, {
    reason: proposal.reason,
    patchCount: proposal.patches.length,
  });

  await notifyAdminsOfPendingChange(resourceId, proposal);
}

/* ------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* ------------------------------------------------------------------------- */

function isValidProposal(p: unknown): p is ChangeProposal {
  if (typeof p !== "object" || p === null) return false;
  const obj = p as Record<string, unknown>;
  if (!["none", "minor", "major"].includes(obj.kind as string)) return false;
  if (typeof obj.reason !== "string") return false;
  if (!Array.isArray(obj.patches)) return false;
  if (obj.kind === "none" && (obj.patches as unknown[]).length > 0) return false;
  if (obj.kind !== "none" && (obj.patches as unknown[]).length === 0) return false;
  return true;
}

async function logAuditEvent(
  resourceId: number,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(auditLogs).values({
    resourceId,
    eventType,
    payload: JSON.stringify(payload),
    createdAt: new Date(),
  });
}

async function notifyAdminsOfPendingChange(
  resourceId: number,
  proposal: ChangeProposal
): Promise<void> {
  // Implémentation dans server/email/notifications.ts (livraison suivante).
  // Doit envoyer un mail au président (Olivier TREVIS) et au secrétaire avec :
  //   - titre de la fiche
  //   - kind (minor/major)
  //   - reason
  //   - lien direct vers /dashboard/agent/{pendingChangeId}
  console.log(
    `[NOTIF] Changement ${proposal.kind} en attente sur la fiche ${resourceId} : ${proposal.reason}`
  );
}

/* ------------------------------------------------------------------------- */
/* ENTRÉE — appelée par le cron hebdomadaire                                   */
/* ------------------------------------------------------------------------- */

export async function runWeeklyVerification(): Promise<{
  total: number;
  noChange: number;
  minor: number;
  major: number;
  errors: number;
}> {
  const allResources = await db.select().from(resources);
  const stats = { total: allResources.length, noChange: 0, minor: 0, major: 0, errors: 0 };

  for (const r of allResources) {
    try {
      const proposal = await verifyResource(r.id);
      await applyProposal(r.id, proposal);
      if (proposal.kind === "none") stats.noChange++;
      else if (proposal.kind === "minor") stats.minor++;
      else stats.major++;
    } catch (err) {
      stats.errors++;
      console.error(`Erreur sur la fiche ${r.id} :`, err);
      await logAuditEvent(r.id, "verification_error", { error: String(err) }).catch(() => {});
    }
  }

  return stats;
}
