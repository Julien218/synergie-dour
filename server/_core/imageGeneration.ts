/**
 * Image generation — OpenAI gpt-image-1
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

  // gpt-image-1 — nouveau modèle OpenAI (remplace dall-e-3)
  // Retourne b64_json par défaut
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Génération image erreur (${response.status} ${response.statusText})${detail ? ": " + detail : ""}`
    );
  }

  const result = await response.json() as {
    data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  };

  // gpt-image-1 retourne b64_json
  const b64 = result.data?.[0]?.b64_json;
  const directUrl = result.data?.[0]?.url;

  if (b64) {
    const buffer = Buffer.from(b64, "base64");
    try {
      const { url } = await storagePut(
        `generated/${Date.now()}.png`,
        buffer,
        "image/png"
      );
      return { url };
    } catch {
      return { url: `data:image/png;base64,${b64}` };
    }
  } else if (directUrl) {
    // Télécharger et stocker
    try {
      const imgResponse = await fetch(directUrl);
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
      return { url };
    } catch {
      return { url: directUrl };
    }
  }

  throw new Error("Aucune image retournée par l'API");
}
