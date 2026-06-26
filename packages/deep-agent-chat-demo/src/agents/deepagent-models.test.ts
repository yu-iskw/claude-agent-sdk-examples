import { afterEach, describe, expect, it } from 'vitest';
import { createGeminiModel, resolveModelBackend, resolveModelName } from './deepagent-models.js';

describe('deepagent-models', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to gemini-api and gemini-3.1-flash-lite', () => {
    delete process.env.DEEP_AGENT_MODEL_BACKEND;
    delete process.env.DEEP_AGENT_MODEL;
    expect(resolveModelBackend()).toBe('gemini-api');
    expect(resolveModelName()).toBe('gemini-3.1-flash-lite');
  });

  it('throws when API key is missing', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    expect(() => createGeminiModel()).toThrow(/GEMINI_API_KEY|GOOGLE_API_KEY/);
  });

  it('returns descriptor when API key is present', () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { descriptor } = createGeminiModel();
    expect(descriptor.backend).toBe('gemini-api');
    expect(descriptor.model).toBe('gemini-3.1-flash-lite');
    expect(descriptor.descriptor).toContain('gemini-3.1-flash-lite');
  });
});
