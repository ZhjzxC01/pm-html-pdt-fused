import type { LLMProvider } from "../llm/llm-provider.js";
import type { ValidationIssue } from "../types/index.js";
import { REVIEW_GATES, getRolesForGate } from "./review-role-configs.js";
import { runReviewGate, type ReviewGateOptions } from "./review-gate-runner.js";
import type { ReviewGateResult, ReviewRoleConfig } from "./review-types.js";

export type ReviewStage = "input" | "requirements" | "prototype" | "html_testcase" | "prd";

export type ReviewPipelineResult =
  | { ok: true; gates: ReviewGateResult[]; hasCritical: boolean }
  | { ok: false; issues: ValidationIssue[] };

export interface ReviewPipelineOptions extends ReviewGateOptions {
  strict?: boolean;
}

const STAGE_TO_GATES: Record<ReviewStage, string[]> = {
  input: ["gate_1_input"],
  requirements: ["gate_2_requirements"],
  prototype: ["gate_3_prototype"],
  html_testcase: ["gate_4_html_testcase"],
  prd: ["gate_5_prd"]
};

export async function runReviewPipelineForStage(
  stage: ReviewStage,
  input: string,
  options: ReviewPipelineOptions = {}
): Promise<ReviewPipelineResult> {
  const gateNames = STAGE_TO_GATES[stage];
  const gates: ReviewGateResult[] = [];

  for (const gateName of gateNames) {
    const roles = options.roles ? filterRolesByGate(options.roles, gateName) : undefined;
    const result = await runReviewGate(gateName, input, { ...options, roles });
    gates.push(result);

    if (options.strict && result.criticalFindings.length > 0) {
      return {
        ok: false,
        issues: result.criticalFindings.map((f, i) => ({
          id: `issue_review_critical_${i + 1}`,
          severity: "error",
          code: "review_critical_finding",
          message: `[严格模式] ${f.description}`
        }))
      };
    }
  }

  const hasCritical = gates.some((g) => g.criticalFindings.length > 0);
  return { ok: true, gates, hasCritical };
}

export async function runSingleReviewGate(
  gate: string,
  input: string,
  options: ReviewGateOptions = {}
): Promise<ReviewGateResult> {
  return runReviewGate(gate, input, options);
}

export function formatGuidance(result: ReviewGateResult): string {
  return result.guidance;
}

export function formatAllGuidance(gates: ReviewGateResult[]): string {
  return gates.map((g) => g.guidance).filter(Boolean).join("\n\n");
}

export function listReviewStages(): ReviewStage[] {
  return ["input", "requirements", "prototype", "html_testcase", "prd"];
}

export function listReviewGates(): string[] {
  return REVIEW_GATES.map((g) => g.gate);
}

function filterRolesByGate(roles: ReviewRoleConfig[], gate: string): ReviewRoleConfig[] {
  const gateConfig = REVIEW_GATES.find((g) => g.gate === gate);
  if (!gateConfig) return roles;
  return roles.filter((r) => gateConfig.roleIds.includes(r.roleId));
}
