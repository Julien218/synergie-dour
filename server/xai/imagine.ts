/**
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import { storagePut } from '../storage';
import { getDb } from '../db';

export interface ImagineOptions {
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
}

export interface ImagineResult {
  media_url: string;
  prompt: string;
  model: string;
}

const XAI_API_ENDPOINT = 'https://api.x.ai/v1/images/generations';
const DEFAULT_MODEL = 'grok-imagine-image-quality';
const DEFAULT_ASPECT_RATIO = '1:1';
const DEFAULT_RESOLUTION = '2k';
const TIMEOUT_MS = 30000;

function sanitizeMessage(message: string, apiKey?: string): string {
  if (!message) return '';
  if (apiKey && apiKey.trim().length > 0) {
    return message.replaceAll(apiKey, '[REDACTED]');
  }
  return message;
}

export async function generateImage(options: ImagineOptions): Promise<ImagineResult> {
  // Suppress unused import check for getDb if needed
  void getDb;

  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('xAI API key (XAI_API_KEY) is missing or invalid (401)');
  }

  const prompt = options.prompt;
  const aspect_ratio = options.aspect_ratio || DEFAULT_ASPECT_RATIO;
  const resolution = options.resolution || DEFAULT_RESOLUTION;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(XAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        aspect_ratio,
        resolution,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status;
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = response.statusText;
      }

      if (status === 401) {
        throw new Error('xAI API 401 Unauthorized: Invalid or missing API key');
      } else if (status === 429) {
        throw new Error('xAI API 429 Rate limit exceeded');
      } else if (status >= 500) {
        throw new Error(`xAI API ${status} Server error: ${errorText || response.statusText}`);
      } else {
        throw new Error(`xAI API error ${status}: ${errorText || response.statusText}`);
      }
    }

    const data = (await response.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
      url?: string;
      images?: Array<{ url?: string }>;
    };

    const imageUrl = data.data?.[0]?.url || data.url || data.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from xAI API');
    }

    // Immediately download the generated image URL (xAI URLs are temporary)
    const imgResponse = await fetch(imageUrl, {
      signal: controller.signal,
    });

    if (!imgResponse.ok) {
      throw new Error(`Failed to download image from temporary URL (${imgResponse.status})`);
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const storageKey = `autopublish/xai/${timestamp}_${random}.png`;

    const stored = await storagePut(storageKey, buffer, 'image/png');

    return {
      media_url: stored.url,
      prompt,
      model: DEFAULT_MODEL,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('xAI API request timed out after 30s');
    }
    const rawMessage = err instanceof Error ? err.message : String(err);
    throw new Error(sanitizeMessage(rawMessage, apiKey));
  } finally {
    clearTimeout(timeoutId);
  }
}

export const imagine = generateImage;
