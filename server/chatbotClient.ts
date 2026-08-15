import { ENV } from "./_core/env";
import type { Message } from "./_core/llm";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function askOpenAI(messages: Message[]): Promise<string> {
  if (!ENV.openAiKey) throw new Error("Clé OpenAI non configurée");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.2,
        max_tokens: 1_200,
      }),
      signal: controller.signal,
    });

    const data = await response.json() as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${data.error?.message ?? "erreur inconnue"}`);
    }

    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Réponse vide du modèle");
    return answer;
  } finally {
    clearTimeout(timeout);
  }
}
