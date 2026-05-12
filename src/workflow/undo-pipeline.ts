import { undoChangeLogItem } from "../state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { ValidationIssue } from "../types/index.js";

export async function undoProjectChange(
  projectPath: string,
  changeLogId: string
): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  const result = undoChangeLogItem(state, changeLogId);
  if (!result.ok) {
    return { ok: false, issues: result.issues };
  }

  await saveProjectState(projectPath, result.state);
  return { ok: true };
}
