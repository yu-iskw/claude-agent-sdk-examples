import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export type ModelBackend = 'gemini-api';

export type ModelDescriptor = {
  backend: ModelBackend;
  provider: 'google-genai';
  model: string;
  descriptor: string;
};

export type ModelConfig = {
  chatModel: ChatGoogleGenerativeAI;
  descriptor: ModelDescriptor;
};

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_BACKEND: ModelBackend = 'gemini-api';

function readApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Gemini API mode requires GEMINI_API_KEY or GOOGLE_API_KEY in the server environment.',
    );
  }
  return key;
}

export function resolveModelName(): string {
  return process.env.DEEP_AGENT_MODEL?.trim() || DEFAULT_MODEL;
}

export function resolveModelBackend(): ModelBackend {
  const backend = process.env.DEEP_AGENT_MODEL_BACKEND?.trim() || DEFAULT_BACKEND;
  if (backend !== 'gemini-api') {
    throw new Error(
      `Unsupported DEEP_AGENT_MODEL_BACKEND "${backend}". M1 supports gemini-api only (Vertex AI is M2).`,
    );
  }
  return backend;
}

export function createGeminiModel(): ModelConfig {
  const backend = resolveModelBackend();
  const model = resolveModelName();
  const temperature = Number(process.env.DEEP_AGENT_TEMPERATURE ?? 0);
  const maxOutputTokens = Number(process.env.DEEP_AGENT_MAX_OUTPUT_TOKENS ?? 8192);

  const chatModel = new ChatGoogleGenerativeAI({
    model,
    apiKey: readApiKey(),
    temperature: Number.isFinite(temperature) ? temperature : 0,
    maxOutputTokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 4096,
  });

  return {
    chatModel,
    descriptor: {
      backend,
      provider: 'google-genai',
      model,
      descriptor: `${backend}:${model}`,
    },
  };
}

export function modelProviderString(descriptor: ModelDescriptor): string {
  return `google-genai:${descriptor.model}`;
}
