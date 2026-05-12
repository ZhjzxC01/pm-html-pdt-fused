import path from "node:path";
import { applyPatchEnvelope } from "../state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { ValidationIssue } from "../types/index.js";
import { runConsistencyCheck } from "../validators/consistency-checker.js";
import { renderAndCommit } from "./render-pipeline.js";

export async function checkProjectFile(projectPath: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  const issuesSnapshot = runConsistencyCheck(state);
  const patched = applyPatchEnvelope(state, {
    id: `patch_consistency_check_${Date.now()}`,
    projectId: state.id,
    baseVersion: state.version,
    source: "consistency_check",
    reason: "运行一致性检查",
    patches: [{ op: "replace", path: "/issues", value: issuesSnapshot }],
    transaction: { atomic: true, mode: "all_or_nothing" },
    dirtyPolicy: { clear: ["issues"] },
    validationProfile: "consistency_check"
  });

  if (!patched.ok) {
    return { ok: false, issues: patched.issues };
  }

  const rendered = await renderAndCommit(patched.state, path.dirname(projectPath), ["consistency_report"]);
  if (!rendered.ok) {
    return rendered;
  }

  await saveProjectState(projectPath, rendered.state);
  return { ok: true };
}
