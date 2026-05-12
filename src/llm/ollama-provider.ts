import type { LLMProvider, LLMRequest, LLMResponse } from "./llm-provider.js";

export interface OllamaProviderOptions {
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl ?? "http://localhost:11434";
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: request.messages,
          stream: false,
          format: request.responseFormat === "json" ? "json" : undefined,
          options: {
            temperature: request.temperature ?? 0
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Ollama 请求失败：HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        model?: string;
        message?: { content?: string };
      };
      const content = payload.message?.content;
      if (!content) {
        throw new Error("Ollama 响应缺少 message.content。");
      }

      return { content, model: payload.model };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Ollama 请求超时（${this.timeoutMs}ms）。`);
      }
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}
