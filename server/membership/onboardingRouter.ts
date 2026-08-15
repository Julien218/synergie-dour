import express from "express";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { execute, hashToken, queryOne } from "../billing/db";
import { sendAdminNewMessageNotification } from "../email/notifications";
import { storageGet, storagePut } from "../storage";

export const membershipOnboardingRouter = express.Router();

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
]);

function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

async function findRequest(token: string): Promise<any | null> {
  const tokenHash = await hashToken(token);
  return queryOne(
    `SELECT * FROM membership_requests
     WHERE onboardingTokenHash = ? AND status = 'approved'
       AND paiementStatut = 'paye'
       AND onboardingTokenExpiresAt > NOW()
     LIMIT 1`,
    [tokenHash]
  );
}

function parseStoredMedia(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function isMp4(buffer: Buffer): boolean {
  return (
    buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp"
  );
}

function isWebm(buffer: Buffer): boolean {
  return (
    buffer.length > 4 &&
    buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  );
}

membershipOnboardingRouter.get("/:token", async (req, res) => {
  try {
    if (!validToken(req.params.token))
      return res.status(404).json({ message: "Lien invalide." });
    const request = await findRequest(req.params.token);
    if (!request)
      return res.status(404).json({ message: "Lien invalide ou expiré." });

    const mediaKeys = parseStoredMedia(request.mediaUrls);
    const media = await Promise.all(
      mediaKeys.map(async key => ({ key, url: (await storageGet(key)).url }))
    ).catch(() => mediaKeys.map(key => ({ key, url: null })));

    return res.json({
      businessName: request.businessName,
      contactName: request.contactName,
      website: request.website || "",
      socialMedia: request.socialMedia || "",
      activityDescription: request.activityDescription || "",
      openingHours: request.openingHours || "",
      appointmentRequested: Boolean(request.appointmentRequested),
      publicationConsent: Boolean(request.publicationConsent),
      completed: Boolean(request.onboardingCompletedAt),
      media,
      appointmentUrl: process.env.MEMBERSHIP_APPOINTMENT_URL || null,
    });
  } catch (error: any) {
    console.error(
      "[membership/onboarding] Lecture impossible:",
      error?.message || error
    );
    return res
      .status(500)
      .json({ message: "La fiche ne peut pas être chargée pour le moment." });
  }
});

membershipOnboardingRouter.post("/:token/media", async (req, res) => {
  try {
    if (!validToken(req.params.token))
      return res.status(404).json({ message: "Lien invalide." });
    const request = await findRequest(req.params.token);
    if (!request)
      return res.status(404).json({ message: "Lien invalide ou expiré." });

    const { dataBase64, contentType, mediaType } = req.body as {
      dataBase64?: string;
      contentType?: string;
      mediaType?: "image" | "video";
    };
    if (!dataBase64 || !contentType || !mediaType) {
      return res.status(400).json({ message: "Fichier incomplet." });
    }
    const allowed = mediaType === "image" ? IMAGE_TYPES : VIDEO_TYPES;
    const extension = allowed.get(contentType);
    if (!extension)
      return res
        .status(415)
        .json({ message: "Format de fichier non autorisé." });

    const payload = dataBase64.includes(",")
      ? dataBase64.split(",").pop()!
      : dataBase64;
    const buffer = Buffer.from(payload, "base64");
    const maxBytes =
      mediaType === "video" ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
    if (!buffer.length || buffer.length > maxBytes) {
      return res
        .status(413)
        .json({
          message: `Fichier vide ou supérieur à ${maxBytes / 1024 / 1024} Mo.`,
        });
    }

    if (mediaType === "image") {
      const metadata = await sharp(buffer)
        .metadata()
        .catch(() => null);
      const expected = extension === "jpg" ? "jpeg" : extension;
      if (!metadata?.format || metadata.format !== expected) {
        return res
          .status(415)
          .json({
            message:
              "Le contenu réel de l'image ne correspond pas au format annoncé.",
          });
      }
    } else if (
      (extension === "mp4" && !isMp4(buffer)) ||
      (extension === "webm" && !isWebm(buffer))
    ) {
      return res
        .status(415)
        .json({
          message:
            "Le contenu réel de la vidéo ne correspond pas au format annoncé.",
        });
    }

    const key = `membership/${request.id}/${Date.now()}-${randomUUID()}.${extension}`;
    await storagePut(key, buffer, contentType);
    const mediaKeys = parseStoredMedia(request.mediaUrls);
    if (!mediaKeys.includes(key)) mediaKeys.push(key);
    await execute(
      `UPDATE membership_requests SET mediaUrls=?, mediaStatus='submitted', updatedAt=NOW() WHERE id=?`,
      [JSON.stringify(mediaKeys), request.id]
    );
    const preview = await storageGet(key).catch(() => null);
    return res.status(201).json({ key, url: preview?.url || null, mediaType });
  } catch (error: any) {
    console.error(
      "[membership/onboarding] Téléversement impossible:",
      error?.message || error
    );
    return res
      .status(500)
      .json({ message: "Le média n'a pas pu être enregistré." });
  }
});

membershipOnboardingRouter.post("/:token", async (req, res) => {
  try {
    if (!validToken(req.params.token))
      return res.status(404).json({ message: "Lien invalide." });
    const request = await findRequest(req.params.token);
    if (!request)
      return res.status(404).json({ message: "Lien invalide ou expiré." });

    const clean = (value: unknown, max: number) =>
      typeof value === "string" ? value.trim().slice(0, max) : "";
    const website = clean(req.body.website, 255);
    const socialMedia = clean(req.body.socialMedia, 255);
    const activityDescription = clean(req.body.activityDescription, 5_000);
    const openingHours = clean(req.body.openingHours, 2_000);
    const appointmentRequested = req.body.appointmentRequested === true;
    const publicationConsent = req.body.publicationConsent === true;
    const mediaKeys = parseStoredMedia(request.mediaUrls);

    if (activityDescription.length < 20) {
      return res
        .status(400)
        .json({
          message: "Décrivez votre activité en au moins 20 caractères.",
        });
    }
    if (mediaKeys.length > 0 && !publicationConsent) {
      return res
        .status(400)
        .json({
          message: "L'autorisation d'utilisation des médias est obligatoire.",
        });
    }
    if (mediaKeys.length === 0 && !appointmentRequested) {
      return res
        .status(400)
        .json({
          message:
            "Ajoutez au moins un média ou demandez un rendez-vous vidéo.",
        });
    }

    const mediaStatus =
      mediaKeys.length > 0 ? "ready_for_review" : "shoot_requested";
    await execute(
      `UPDATE membership_requests
       SET website=?, socialMedia=?, activityDescription=?, openingHours=?,
           appointmentRequested=?, publicationConsent=?, publicationConsentAt=?,
           mediaStatus=?, onboardingCompletedAt=NOW(), updatedAt=NOW()
       WHERE id=?`,
      [
        website || null,
        socialMedia || null,
        activityDescription,
        openingHours || null,
        appointmentRequested ? 1 : 0,
        publicationConsent ? 1 : 0,
        publicationConsent ? new Date() : null,
        mediaStatus,
        request.id,
      ]
    );

    sendAdminNewMessageNotification({
      type: "membership",
      name: request.contactName,
      email: request.email,
      businessName: request.businessName,
      message: mediaKeys.length
        ? `Fiche post-paiement complétée avec ${mediaKeys.length} média(s), à valider avant publication.`
        : "Fiche post-paiement complétée — rendez-vous vidéo demandé.",
    }).catch(() => {});

    return res.json({
      success: true,
      mediaStatus,
      appointmentUrl: process.env.MEMBERSHIP_APPOINTMENT_URL || null,
    });
  } catch (error: any) {
    console.error(
      "[membership/onboarding] Enregistrement impossible:",
      error?.message || error
    );
    return res
      .status(500)
      .json({ message: "La fiche n'a pas pu être enregistrée." });
  }
});
