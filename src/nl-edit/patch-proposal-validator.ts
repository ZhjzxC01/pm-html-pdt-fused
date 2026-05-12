import type { ProjectState, ValidationIssue } from "../types/index.js";
import type { PatchProposal } from "./state-query.js";

export function validatePatchProposal(state: ProjectState, proposal: PatchProposal): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (proposal.projectId !== state.id) {
    issues.push({
      id: "issue_patch_proposal_project_mismatch",
      severity: "error",
      code: "patch_proposal_project_mismatch",
      message: "PatchProposal.projectId 与当前 ProjectState.id 不一致。"
    });
  }

  if (proposal.baseVersion !== state.version) {
    issues.push({
      id: "issue_patch_proposal_base_version_mismatch",
      severity: "error",
      code: "patch_proposal_base_version_mismatch",
      message: `PatchProposal.baseVersion 不匹配，当前版本为 ${state.version}。`
    });
  }

  if (!proposal.requiresUserConfirmation) {
    issues.push({
      id: "issue_patch_proposal_requires_confirmation",
      severity: "error",
      code: "patch_proposal_requires_confirmation",
      message: "PatchProposal 必须要求用户确认后才能应用。"
    });
  }

  if (proposal.validationProfile !== "nl_edit") {
    issues.push({
      id: "issue_patch_proposal_invalid_validation_profile",
      severity: "error",
      code: "patch_proposal_invalid_validation_profile",
      message: "自然语言修改提案必须使用 nl_edit validationProfile。"
    });
  }

  if (proposal.patches.length === 0) {
    issues.push({
      id: "issue_patch_proposal_empty_patches",
      severity: "error",
      code: "patch_proposal_empty_patches",
      message: "PatchProposal 至少需要包含一个补丁。"
    });
  }

  for (const [index, patch] of proposal.patches.entries()) {
    if (patch.path === "/version" || patch.path.startsWith("/version/") || patch.path === "/changeLog") {
      issues.push({
        id: `issue_patch_proposal_reserved_path_${index}`,
        severity: "error",
        code: "patch_proposal_reserved_path",
        message: `PatchProposal 不允许修改系统保留路径：${patch.path}`,
        path: patch.path
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}

export function parsePatchProposal(value: unknown): PatchProposal {
  const proposal = value as PatchProposal;
  if (!proposal || typeof proposal !== "object" || !Array.isArray(proposal.patches)) {
    throw new Error("patch-proposal.json 结构不合法。");
  }
  return proposal;
}
