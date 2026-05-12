import path from "node:path";
import type { ZodType } from "zod";
import type { GeneratorResult } from "../generators/generator-result.js";
import type { LLMProvider } from "../llm/llm-provider.js";
import { MockLLMProvider } from "../llm/mock-llm-provider.js";
import { PromptRegistry } from "../llm/prompt-registry.js";
import { PromptRunner } from "../llm/prompt-runner.js";
import { parseStructuredOutput } from "../llm/structured-output-parser.js";
import type { ValidationIssue } from "../types/index.js";
import type { AgentResult } from "./agent-result.js";
import { validateAgentResult } from "./agent-result-validator.js";

export type ArtifactAgentResult = { ok: true; step: GeneratorResult } | { ok: false; issues: ValidationIssue[] };

export interface ArtifactAgentOptions {
  provider?: LLMProvider;
  promptDir?: string;
}

export interface ArtifactAgentConfig<T> {
  agentName: string;
  promptName: string;
  outputSchema: ZodType<T>;
  mapToStep: (result: AgentResult<T>) => GeneratorResult;
}

export async function runArtifactAgent<T>(
  input: string,
  config: ArtifactAgentConfig<T>,
  options: ArtifactAgentOptions = {}
): Promise<ArtifactAgentResult> {
  const promptDir = options.promptDir ?? path.resolve(process.cwd(), "prompts");
  const provider = options.provider ?? new MockLLMProvider();
  const runner = new PromptRunner(provider, new PromptRegistry(promptDir));
  const response = await runner.run({
    systemPromptName: "system",
    promptName: config.promptName,
    userInput: input
  });

  const parsed = parseStructuredOutput(response.content);
  if (!parsed.ok) {
    return parsed;
  }

  const validated = validateAgentResult(parsed.value, config.outputSchema, {
    expectedAgentName: config.agentName
  });
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    step: config.mapToStep(validated.result)
  };
}
