import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

let cachedPrompt: string | undefined;

export async function getChatbotSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;

  const promptPath = resolve(process.cwd(), "docs", "ai_agent_prompt.md");
  const prompt = (await readFile(promptPath, "utf8")).trim();
  if (!prompt) throw new Error("Le prompt du chatbot est vide");

  cachedPrompt = prompt;
  return prompt;
}
