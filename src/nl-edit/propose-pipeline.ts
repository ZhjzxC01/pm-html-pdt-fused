import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadProjectState } from "../state/project-state-manager.js";
import type { ValidationIssue } from "../types/index.js";
import { proposePatch } from "./patch-proposer.js";
import { validatePatchProposal } from "./patch-proposal-validator.js";
import type { PatchProposal } from "./state-query.js";

export async function proposeProjectEdit(
  projectPath: string,
  instruction: string,
  options: { outputPath?: string } = {}
): Promise<{ ok: true; proposal: PatchProposal; proposalPath: string } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  let proposal: PatchProposal;
  try {
    proposal = proposePatch(state, instruction);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_nl_edit_intent_unsupported",
          severity: "error",
          code: "nl_edit_intent_unsupported",
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const validation = validatePatchProposal(state, proposal);
  if (!validation.valid) {
    return { ok: false, issues: validation.issues };
  }

  const projectRoot = path.dirname(projectPath);
  const proposalPath = options.outputPath ?? path.join(projectRoot, "output", "patch-proposal.json");
  await mkdir(path.dirname(proposalPath), { recursive: true });
  await writeFile(proposalPath, `${JSON.stringify(proposal, null, 2)}\n`, "utf8");
  return { ok: true, proposal, proposalPath };
}
