import path from "node:path";
import type { LLMProvider } from "../llm/llm-provider.js";
import { MockLLMProvider } from "../llm/mock-llm-provider.js";
import { PromptRegistry } from "../llm/prompt-registry.js";
import { PromptRunner } from "../llm/prompt-runner.js";
import { parseStructuredOutput } from "../llm/structured-output-parser.js";
import type { ValidationIssue } from "../types/index.js";
import { roleVerdictSchema, type ReviewAgentResult, type ReviewRoleConfig } from "./review-types.js";

export interface ReviewAgentOptions {
  provider?: LLMProvider;
  promptDir?: string;
}

export async function runReviewAgent(
  input: string,
  role: ReviewRoleConfig,
  gate: string,
  options: ReviewAgentOptions = {}
): Promise<ReviewAgentResult> {
  const promptDir = options.promptDir ?? path.resolve(process.cwd(), "prompts");
  const provider = options.provider ?? new MockLLMProvider();
  const runner = new PromptRunner(provider, new PromptRegistry(promptDir));

  const promptName = `review-${role.roleId}`;
  const gateLabel = `[Review Gate: ${gate} Role: ${role.roleId}]`;
  const response = await runner.run({
    systemPromptName: role.systemPromptName,
    promptName,
    userInput: `${gateLabel}\n\n${input}`
  });

  const parsed = parseStructuredOutput(response.content);
  if (!parsed.ok) {
    return parsed;
  }

  const raw = parsed.value as Record<string, unknown>;
  if (typeof raw.output !== "object" || raw.output === null) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_review_no_output",
          severity: "error",
          code: "review_verdict_invalid",
          message: "审查结果缺少 output 字段。"
        }
      ]
    };
  }

  const result = roleVerdictSchema.safeParse(raw.output);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue, index) => ({
        id: `issue_review_verdict_invalid_${index + 1}`,
        severity: "error",
        code: "review_verdict_invalid",
        message: `审查结果校验失败：${issue.path.join("/") || "根节点"} ${issue.message}`
      }))
    };
  }

  if (result.data.roleId !== role.roleId) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_review_role_id_mismatch",
          severity: "error",
          code: "review_role_id_mismatch",
          message: `审查角色 ID 不匹配，期望 ${role.roleId}，实际 ${result.data.roleId}。`
        }
      ]
    };
  }

  if (result.data.gate !== gate) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_review_gate_mismatch",
          severity: "error",
          code: "review_gate_mismatch",
          message: `审查关口不匹配，期望 ${gate}，实际 ${result.data.gate}。`
        }
      ]
    };
  }

  return { ok: true, verdict: result.data };
}
