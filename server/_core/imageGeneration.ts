/**
 * Image generation — OpenAI DALL-E 3
 * Clé configurée dans Railway sous : CLE_API_OPENAI
 */
import { storagePut } from "../storage";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = process.env.CLE_API_OPENAI;
  if (!apiKey) {
    throw new Error("CLE_API_OPENAI non configurée dans les variables d'environnement Railway");
  }

  // DALL-E 3 — retourne une URL directe (response_format supprimé car non supporté)
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `DALL-E 3 erreur (${response.status} ${response.statusText})${detail ? ": " + detail : ""}`
    );
  }

  const result = await response.json() as {
    data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  // DALL-E 3 sans response_format retourne une URL temporaire
  const imageUrl = result.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("DALL-E 3 : aucune image retournée");
  }

  // Télécharger l'image depuis l'URL temporaire et la stocker
  try {
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Impossible de télécharger l'image générée");
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    const { url } = await storagePut(
      `generated/${Date.now()}.png`,
      buffer,
      "image/png"
    );
    return { url };
  } catch {
    // Fallback : retourner l'URL OpenAI directement (expire dans ~1h)
    return { url: imageUrl };
  }
}
