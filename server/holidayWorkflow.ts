import { z } from "zod";

export const holidayProductionResult = z
  .object({
    videoUrl: z.url().refine(v => new URL(v).protocol === "https:"),
    voiceover: z.string().min(1).max(5000),
    facebook: z.string().min(1).max(5000),
    instagram: z.string().min(1).max(2200),
    decorations: z.literal("noel-2026"),
    subtitles: z.literal(true),
  })
  .strict();
export function holidayApproval(
  job: any,
  dossier: any,
  userId: number,
  stage: "julien" | "olivier",
  env: NodeJS.ProcessEnv = process.env
) {
  const julien = Number(env.HOLIDAY_JULIEN_USER_ID),
    olivier = Number(env.HOLIDAY_OLIVIER_USER_ID);
  if (
    !Number.isSafeInteger(julien) ||
    !Number.isSafeInteger(olivier) ||
    julien <= 0 ||
    olivier <= 0 ||
    julien === olivier
  )
    throw new Error("Les deux validateurs distincts doivent être configurés.");
  if (userId !== (stage === "julien" ? julien : olivier))
    throw new Error("Cette étape est réservée à son validateur.");
  if (
    !["submitted", "approved"].includes(dossier.status) ||
    dossier.revision !== job.revision
  )
    throw new Error(
      "Le dossier a changé : nouvelle production et nouvelles validations nécessaires."
    );
  if (!dossier.payload?.publicationConsent)
    throw new Error("Autorisation de diffusion absente.");
  holidayProductionResult.parse(job.result);
  if (
    !["awaiting_approval", "julien_review", "olivier_review"].includes(
      job.status
    )
  )
    throw new Error("La vidéo doit être prête et en attente de validation.");
  return "ready_to_publish";
}
