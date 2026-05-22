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

  // Deduplicate findings with similar descriptions (>80% overlap in key terms)
  const deduped = deduplicateFindings(allFindings);

  // Sort by severity: critical > warning > suggestion
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, suggestion: 2 };
  deduped.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  const criticalCount = deduped.filter((f) => f.severity === "critical").length;
  const warningCount = deduped.filter((f) => f.severity === "warning").length;
  const suggestionCount = deduped.filter((f) => f.severity === "suggestion").length;

  const lines = [
    `[审查关口: ${gate}] 多角色审查发现 ${deduped.length} 条反馈（${criticalCount} critical / ${warningCount} warning / ${suggestionCount} suggestion）：`,
    ""
  ];

  // Group by severity for readability
  if (criticalCount > 0) {
    lines.push("### 必须修复（critical）");
    for (const f of deduped.filter((f) => f.severity === "critical")) {
      lines.push(`- [${f.category}] ${f.description}`);
      if (f.suggestedAction) lines.push(`  建议：${f.suggestedAction}`);
    }
    lines.push("");
  }

  if (warningCount > 0) {
    lines.push("### 建议修复（warning）");
    for (const f of deduped.filter((f) => f.severity === "warning")) {
      lines.push(`- [${f.category}] ${f.description}`);
      if (f.suggestedAction) lines.push(`  建议：${f.suggestedAction}`);
    }
    lines.push("");
  }

  if (suggestionCount > 0) {
    lines.push("### 优化建议（suggestion）");
    for (const f of deduped.filter((f) => f.severity === "suggestion")) {
      lines.push(`- [${f.category}] ${f.description}`);
      if (f.suggestedAction) lines.push(`  建议：${f.suggestedAction}`);
    }
  }

  return lines.join("\n");
}

/** CJK-aware tokenizer: splits on whitespace and between CJK characters, keeping Latin words intact. */
function tokenizeForOverlap(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+|(?=[一-鿿㐀-䶿])|(?<=[一-鿿㐀-䶿])/)
    .filter((t) => t.length > 0);
}

function computeWordOverlap(a: string[], b: Set<string>): number {
  if (a.length === 0) return 0;
  return a.filter((w) => b.has(w)).length / a.length;
}

/** Deduplicate findings that are substantially similar across different reviewers. */
function deduplicateFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const result: ReviewFinding[] = [];
  for (const f of findings) {
    const newTokens = tokenizeForOverlap(f.description).filter((w) => w.length > 1 || /[一-鿿]/.test(w));
    const isDuplicate = result.some((existing) => {
      if (existing.category !== f.category) return false;
      const existingTokens = new Set(tokenizeForOverlap(existing.description).filter((w) => w.length > 1 || /[一-鿿]/.test(w)));
      return computeWordOverlap(newTokens, existingTokens) > 0.6;
    });
    if (!isDuplicate) {
      result.push(f);
    } else {
      const existingIndex = result.findIndex((existing) => {
        if (existing.category !== f.category) return false;
        const existingTokens = new Set(tokenizeForOverlap(existing.description).filter((w) => w.length > 1 || /[一-鿿]/.test(w)));
        return computeWordOverlap(newTokens, existingTokens) > 0.6;
      });
      if (existingIndex >= 0) {
        const severityRank: Record<string, number> = { critical: 0, warning: 1, suggestion: 2 };
        if ((severityRank[f.severity] ?? 3) < (severityRank[result[existingIndex].severity] ?? 3)) {
          result[existingIndex] = { ...result[existingIndex], severity: f.severity };
        }
      }
    }
  }
  return result;
}
