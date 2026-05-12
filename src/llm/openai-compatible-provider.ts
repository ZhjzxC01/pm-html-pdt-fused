import type { LLMProvider, LLMRequest, LLMResponse } from "./llm-provider.js";

export interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export class OpenAICompatibleProvider implements LLMProvider {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly options: OpenAICompatibleProviderOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 0;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.options.apiKey) {
      throw new Error("OpenAICompatibleProvider 需要配置 apiKey。");
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.completeOnce(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async completeOnce(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: request.messages,
          temperature: request.temperature ?? this.options.temperature ?? 0,
          response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`LLM 请求失败：HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("LLM 响应缺少 choices[0].message.content。");
      }

      return { content, model: payload.model };
    } finally {
      clearTimeout(timeout);
    }
  }
}
