import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockStoragePut } = vi.hoisted(() => ({
  mockStoragePut: vi.fn().mockImplementation(async (key: string) => ({
    key,
    url: `https://storage.example.com/${key}`,
  })),
}));

vi.mock('../storage', () => ({
  storagePut: mockStoragePut,
}));

vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

import { generateImage, imagine } from './imagine';

describe('xAI Grok Imagine Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockStoragePut.mockImplementation(async (key: string) => ({
      key,
      url: `https://storage.example.com/${key}`,
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should generate an image successfully with custom parameters', async () => {
    process.env.XAI_API_KEY = 'xai-test-key-123';

    const fakeImageData = new Uint8Array([137, 80, 78, 71]).buffer;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (url === 'https://api.x.ai/v1/images/generations') {
        expect(options.method).toBe('POST');
        expect(options.headers.Authorization).toBe('Bearer xai-test-key-123');
        expect(options.headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(options.body);
        expect(body.model).toBe('grok-imagine-image-quality');
        expect(body.prompt).toBe('A futuristic skyline at sunset');
        expect(body.aspect_ratio).toBe('16:9');
        expect(body.resolution).toBe('4k');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ url: 'https://temp.x.ai/images/gen_123.png' }],
          }),
        };
      }

      if (url === 'https://temp.x.ai/images/gen_123.png') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => fakeImageData,
        };
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await generateImage({
      prompt: 'A futuristic skyline at sunset',
      aspect_ratio: '16:9',
      resolution: '4k',
    });

    expect(result.prompt).toBe('A futuristic skyline at sunset');
    expect(result.model).toBe('grok-imagine-image-quality');
    expect(result.media_url).toMatch(/^https:\/\/storage\.example\.com\/autopublish\/xai\/\d+_[a-z0-9]+\.png$/);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should use default aspect_ratio (1:1) and resolution (2k) when omitted', async () => {
    process.env.XAI_API_KEY = 'xai-test-key-123';

    const fakeImageData = new Uint8Array([1, 2, 3]).buffer;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (url === 'https://api.x.ai/v1/images/generations') {
        const body = JSON.parse(options.body);
        expect(body.aspect_ratio).toBe('1:1');
        expect(body.resolution).toBe('2k');

        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ url: 'https://temp.x.ai/images/default.png' }],
          }),
        };
      }

      if (url === 'https://temp.x.ai/images/default.png') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => fakeImageData,
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', mockFetch);

    const result = await imagine({
      prompt: 'Default params test',
    });

    expect(result.media_url).toBeDefined();
    expect(result.prompt).toBe('Default params test');
  });

  it('should throw 401 error when XAI_API_KEY is not set', async () => {
    delete process.env.XAI_API_KEY;

    await expect(
      generateImage({ prompt: 'Test missing key' })
    ).rejects.toThrow(/401|missing|invalid/i);
  });

  it('should handle 401 response from xAI API', async () => {
    process.env.XAI_API_KEY = 'invalid-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key provided',
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      generateImage({ prompt: 'Test 401' })
    ).rejects.toThrow(/401/);
  });

  it('should handle 429 rate limit error', async () => {
    process.env.XAI_API_KEY = 'valid-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limit exceeded for image generation',
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      generateImage({ prompt: 'Test 429' })
    ).rejects.toThrow(/429|rate limit/i);
  });

  it('should handle 500+ server error', async () => {
    process.env.XAI_API_KEY = 'valid-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'xAI server down',
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      generateImage({ prompt: 'Test 500' })
    ).rejects.toThrow(/503|server error/i);
  });

  it('should handle request timeout', async () => {
    process.env.XAI_API_KEY = 'valid-key';

    const mockFetch = vi.fn().mockRejectedValue(
      new DOMException('The operation was aborted', 'AbortError')
    );

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      generateImage({ prompt: 'Test timeout' })
    ).rejects.toThrow(/timed out|timeout/i);
  });

  it('should NEVER include the API key in error messages', async () => {
    const SECRET_KEY = 'SECRET_XAI_KEY_SUPER_CONFIDENTIAL_123';
    process.env.XAI_API_KEY = SECRET_KEY;

    // Simulate an error response from server containing the API key
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      text: async () => `Internal server failure with key ${SECRET_KEY}`,
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      await generateImage({ prompt: 'Test key redaction' });
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err.message).not.toContain(SECRET_KEY);
      expect(err.message).toContain('[REDACTED]');
    }
  });
});
