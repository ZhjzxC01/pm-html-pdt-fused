import { readFile } from "node:fs/promises";
import { applyPatchEnvelope } from "../state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { PatchEnvelope, ValidationIssue } from "../types/index.js";
import { parsePatchProposal, validatePatchProposal } from "./patch-proposal-validator.js";
import type { PatchProposal } from "./state-query.js";

export async function applyPatchProposalFile(
  projectPath: string,
  proposalPath: string
): Promise<{ ok: true; changeId: string; dirtyArtifacts: string[] } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  const proposal = parsePatchProposal(JSON.parse(await readFile(proposalPath, "utf8")));
  return applyPatchProposal(projectPath, state, proposal);
}

export async function applyPatchProposal(
  projectPath: string,
  state: Awaited<ReturnType<typeof loadProjectState>>,
  proposal: PatchProposal
): Promise<{ ok: true; changeId: string; dirtyArtifacts: string[] } | { ok: false; issues: ValidationIssue[] }> {
  const validation = validatePatchProposal(state, proposal);
  if (!validation.valid) {
    return { ok: false, issues: validation.issues };
  }

  const envelope: PatchEnvelope = {
    id: `patch_${proposal.id}`,
    projectId: proposal.projectId,
    baseVersion: proposal.baseVersion,
    source: "nl_edit",
    reason: proposal.explanation,
    patches: proposal.patches,
    transaction: { atomic: true, mode: "all_or_nothing" },
    dirtyPolicy: proposal.dirtyPolicy,
    validationProfile: proposal.validationProfile
  };
  const result = applyPatchEnvelope(state, envelope);
  if (!result.ok) {
    return { ok: false, issues: result.issues };
  }

  await saveProjectState(projectPath, result.state);
  return {
    ok: true,
    changeId: result.state.changeLog.at(-1)?.id ?? "",
    dirtyArtifacts: result.state.dirtyArtifacts
  };
}
