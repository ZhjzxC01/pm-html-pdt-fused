import path from "node:path";
import { applyPatchEnvelope } from "../state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { ProjectState, StateArtifactType, ValidationIssue } from "../types/index.js";
import { renderAndCommit } from "./render-pipeline.js";

const annotationPrerequisites: StateArtifactType[] = ["htmlPrototype", "prototypeMeta", "prdSpec", "testCaseSpec"];

export async function annotateProjectFile(projectPath: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  const dirty = annotationPrerequisites.filter((artifact) => state.dirtyArtifacts.includes(artifact));
  if (dirty.length > 0) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_annotation_upstream_dirty",
          severity: "error",
          code: "annotation_upstream_dirty",
          message: `上游结构化产物已过期，annotate 拒绝执行：${dirty.join(", ")}`
        }
      ]
    };
  }

  if (!state.prototypeAnnotationSpec) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_missing_prototype_annotation_spec",
          severity: "error",
          code: "missing_prototype_annotation_spec",
          message: "缺少原型标注结构，当前规则版首轮需要先运行 generate。"
        }
      ]
    };
  }

  // Reverse write: write annotationNumber to PRD sections
  const stateWithReverseWrite = reverseWriteAnnotationNumbers(state);

  const patched = applyPatchEnvelope(stateWithReverseWrite, {
    id: `patch_annotation_${Date.now()}`,
    projectId: stateWithReverseWrite.id,
    baseVersion: stateWithReverseWrite.version,
    source: "prototype_annotation_generation",
    reason: "刷新原型 PRD 标注结构",
    patches: [{ op: "replace", path: "/prototypeAnnotationSpec", value: stateWithReverseWrite.prototypeAnnotationSpec }],
    transaction: { atomic: true, mode: "all_or_nothing" },
    dirtyPolicy: { clear: ["prototypeAnnotationSpec"], mark: ["issues"], useDependencyPropagation: true },
    validationProfile: "generation_annotation"
  });

  if (!patched.ok) {
    return { ok: false, issues: patched.issues };
  }

  const rendered = await renderAndCommit(patched.state, path.dirname(projectPath), [
    "prototype_annotation_json",
    "prototype_review_html"
  ]);
  if (!rendered.ok) {
    return rendered;
  }

  await saveProjectState(projectPath, rendered.state);
  return { ok: true };
}

function reverseWriteAnnotationNumbers(state: ProjectState): ProjectState {
  if (!state.prototypeAnnotationSpec || !state.prdSpec) {
    return state;
  }

  // Deep clone PRD sections to avoid mutation
  const newSections = { ...state.prdSpec.sections };
  const newById = { ...newSections.byId };

  // Clear existing annotation numbers first
  for (const sectionId of Object.keys(newById)) {
    if (newById[sectionId].annotationNumber !== undefined) {
      newById[sectionId] = { ...newById[sectionId], annotationNumber: undefined };
    }
  }

  // Write annotation numbers to linked PRD sections
  for (const annotation of Object.values(state.prototypeAnnotationSpec.annotations.byId)) {
    for (const sectionId of annotation.prdSectionIds) {
      if (newById[sectionId]) {
        newById[sectionId] = { ...newById[sectionId], annotationNumber: annotation.annotationNumber };
      }
    }
  }

  const updatedState = {
    ...state,
    prdSpec: {
      ...state.prdSpec,
      sections: { ...newSections, byId: newById }
    }
  };

  return updatedState;
}
