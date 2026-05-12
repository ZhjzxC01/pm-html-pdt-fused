import type { LLMProvider, LLMResponse } from "./llm-provider.js";
import type { PromptRegistry } from "./prompt-registry.js";

export interface PromptRunInput {
  systemPromptName?: string;
  promptName: string;
  userInput: string;
}

export class PromptRunner {
  constructor(
    private readonly provider: LLMProvider,
    private readonly registry: PromptRegistry
  ) {}

  async run(input: PromptRunInput): Promise<LLMResponse> {
    const messages = [];
    if (input.systemPromptName) {
      messages.push({ role: "system" as const, content: await this.registry.load(input.systemPromptName) });
    }

    const prompt = await this.registry.load(input.promptName);
    messages.push({ role: "user" as const, content: `${prompt}\n\n用户需求：\n${input.userInput}` });

    return this.provider.complete({
      messages,
      responseFormat: "json",
      temperature: 0
    });
  }
}
