import type { LLMProvider } from "./llm-provider.js";
import { OpenAICompatibleProvider } from "./openai-compatible-provider.js";
import { OllamaProvider } from "./ollama-provider.js";

export type LLMProviderConfig =
  | { type: "openai"; apiKey: string; baseUrl?: string; model: string; timeoutMs?: number }
  | { type: "ollama"; model: string; baseUrl?: string; timeoutMs?: number }
  | { type: "mock" };

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.type) {
    case "openai":
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
        model: config.model,
        timeoutMs: config.timeoutMs
      });
    case "ollama":
      return new OllamaProvider({
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs
      });
    case "mock":
      return {
        async complete() {
          return { content: "{}" };
        }
      };
  }
}

export function createLLMProviderFromEnv(): LLMProvider {
  const type = (process.env.LLM_PROVIDER_TYPE ?? "openai") as LLMProviderConfig["type"];
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const timeoutMs = process.env.LLM_TIMEOUT_MS ? Number(process.env.LLM_TIMEOUT_MS) : undefined;

  switch (type) {
    case "openai": {
      const apiKey = process.env.LLM_API_KEY;
      if (!apiKey) {
        throw new Error("LLM_PROVIDER_TYPE 为 openai 时，必须设置 LLM_API_KEY 环境变量。");
      }
      return createLLMProvider({
        type: "openai",
        apiKey,
        baseUrl: process.env.LLM_BASE_URL,
        model,
        timeoutMs
      });
    }
    case "ollama":
      return createLLMProvider({
        type: "ollama",
        model,
        baseUrl: process.env.LLM_BASE_URL,
        timeoutMs
      });
    case "mock":
      return createLLMProvider({ type: "mock" });
    default:
      throw new Error(`不支持的 LLM_PROVIDER_TYPE：${type}`);
  }
}

export async function checkLLMAvailability(provider: LLMProvider): Promise<boolean> {
  try {
    await provider.complete({
      messages: [{ role: "user", content: "ping" }],
      temperature: 0
    });
    return true;
  } catch {
    return false;
  }
}
