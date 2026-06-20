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

  // DALL-E 3 — génération standard 1024x1024
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
      response_format: "b64_json",
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
    data: Array<{ b64_json: string; revised_prompt?: string }>;
  };

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E 3 : aucune image retournée");

  const buffer = Buffer.from(b64, "base64");

  // Sauvegarder en stockage Railway/S3
  try {
    const { url } = await storagePut(
      `generated/${Date.now()}.png`,
      buffer,
      "image/png"
    );
    return { url };
  } catch {
    // Si storage non configuré, retourner le base64 directement
    const dataUrl = `data:image/png;base64,${b64}`;
    return { url: dataUrl };
  }
}
