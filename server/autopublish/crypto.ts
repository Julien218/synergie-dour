/**
 * Chiffrement des tokens réseaux sociaux — AES-256-GCM
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Les tokens d'accès (Facebook, Instagram, TikTok, LinkedIn) ne sont JAMAIS
 * stockés en clair en base de données. Ils sont chiffrés avec une clé serveur
 * (AUTOPUBLISH_ENCRYPTION_KEY) avant écriture, et déchiffrés uniquement en
 * mémoire au moment de l'appel API sortant.
 *
 * Variable d'environnement requise :
 *   AUTOPUBLISH_ENCRYPTION_KEY = clé hexadécimale de 64 caractères (32 octets)
 *   Génération : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 */
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.AUTOPUBLISH_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "AUTOPUBLISH_ENCRYPTION_KEY manquante ou invalide (attendu : 64 caractères hexadécimaux / 32 octets)"
    );
  }
  return Buffer.from(hex, "hex");
}

/** Chiffre une chaîne (token) → format stocké : iv:authTag:ciphertext (hex, séparés par ':') */
export function encryptToken(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Déchiffre une chaîne stockée par encryptToken(). Retourne null si le format est invalide. */
export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 3) return null;
  try {
    const key = getKey();
    const [ivHex, authTagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/** Vérifie que la clé de chiffrement est configurée (utilisé au démarrage/diagnostic) */
export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
