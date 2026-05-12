import type { LLMProvider } from "../llm/llm-provider.js";
import { runReviewAgent, type ReviewAgentOptions } from "./review-agent-runner.js";
import { getRolesForGate } from "./review-role-configs.js";
import type { ReviewFinding, ReviewGateResult, ReviewRoleConfig, RoleVerdict } from "./review-types.js";

export interface ReviewGateOptions extends ReviewAgentOptions {
  roles?: ReviewRoleConfig[];
}

export async function runReviewGate(
  gate: string,
  input: string,
  options: ReviewGateOptions = {}
): Promise<ReviewGateResult> {
  const roles = options.roles ?? getRolesForGate(gate);
  if (roles.length === 0) {
    return {
      gate,
      roleVerdicts: [],
      allApproved: true,
      criticalFindings: [],
      guidance: ""
    };
  }

  const verdicts = await Promise.all(
    roles.map((role) => runReviewAgent(input, role, gate, options))
  );

  const roleVerdicts: RoleVerdict[] = [];
  const failedIssues: ReviewFinding[] = [];

  for (let i = 0; i < verdicts.length; i++) {
    const result = verdicts[i];
    if (!result.ok) {
      failedIssues.push({
        severity: "critical",
        category: "review_agent_failure",
        description: `${roles[i].roleName}审查执行失败：${result.issues.map((iss) => iss.message).join("；")}`,
        suggestedAction: "检查审查 prompt 和 LLM 输出格式"
      });
      continue;
    }
    roleVerdicts.push(result.verdict);
  }

  const allApproved = roleVerdicts.every((v) => v.approved) && failedIssues.length === 0;
  const allFindings = [
    ...failedIssues,
    ...roleVerdicts.flatMap((v) => v.findings)
  ];
  const criticalFindings = allFindings.filter((f) => f.severity === "critical");
  const guidance = formatFindingsToGuidance(gate, roleVerdicts, failedIssues);

  return { gate, roleVerdicts, allApproved, criticalFindings, guidance };
}

function formatFindingsToGuidance(gate: string, verdicts: RoleVerdict[], failedIssues: ReviewFinding[]): string {
  const allFindings = [
    ...failedIssues,
    ...verdicts.flatMap((v) => v.findings)
  ];
  if (allFindings.length === 0) return "";

  const lines = [`[审查关口: ${gate}] 多角色审查发现 ${allFindings.length} 条反馈：`];

  for (const finding of allFindings) {
    const prefix = finding.severity === "critical" ? "[必须修复]" : finding.severity === "warning" ? "[建议修复]" : "[优化建议]";
    lines.push(`${prefix} ${finding.description}`);
    if (finding.suggestedAction) {
      lines.push(`  建议：${finding.suggestedAction}`);
    }
  }

  return lines.join("\n");
}
