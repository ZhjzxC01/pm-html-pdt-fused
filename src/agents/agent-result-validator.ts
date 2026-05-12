import { z, type ZodType } from "zod";
import { assumptionSchema, pendingQuestionSchema } from "../schemas/project-state.schema.js";
import type { ValidationIssue } from "../types/index.js";
import type { AgentResult } from "./agent-result.js";

const agentResultBaseSchema = z.object({
  id: z.string().min(1),
  agentName: z.string().min(1),
  inputHash: z.string().min(1),
  output: z.unknown(),
  assumptions: z.array(assumptionSchema),
  pendingQuestions: z.array(pendingQuestionSchema),
  warnings: z.array(z.string())
});

export type AgentValidationResult<T> = { ok: true; result: AgentResult<T> } | { ok: false; issues: ValidationIssue[] };

export function validateAgentResult<T>(
  value: unknown,
  outputSchema: ZodType<T>,
  options: { expectedAgentName: string }
): AgentValidationResult<T> {
  const baseResult = agentResultBaseSchema.safeParse(value);
  if (!baseResult.success) {
    return { ok: false, issues: zodIssuesToValidationIssues(baseResult.error.issues, "agent_result_invalid") };
  }

  if (baseResult.data.agentName !== options.expectedAgentName) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_agent_name_mismatch",
          severity: "error",
          code: "agent_name_mismatch",
          message: `AgentResult.agentName 不匹配，期望 ${options.expectedAgentName}，实际 ${baseResult.data.agentName}。`
        }
      ]
    };
  }

  const outputResult = outputSchema.safeParse(baseResult.data.output);
  if (!outputResult.success) {
    return { ok: false, issues: zodIssuesToValidationIssues(outputResult.error.issues, "agent_output_invalid") };
  }

  return {
    ok: true,
    result: {
      ...baseResult.data,
      output: outputResult.data
    }
  };
}

function zodIssuesToValidationIssues(issues: z.ZodIssue[], code: string): ValidationIssue[] {
  return issues.map((issue, index) => ({
    id: `issue_${code}_${index + 1}`,
    severity: "error",
    code,
    message: `Agent 输出校验失败：${issue.path.join("/") || "根节点"} ${issue.message}`,
    path: `/${issue.path.join("/")}`
  }));
}
