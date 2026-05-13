import { runPrototypeAnnotationAgent } from "../agents/prototype-annotation-agent.js";
import { renderAndCommit } from "./render-pipeline.js";
import type { LLMProvider } from "../llm/llm-provider.js";

const annotationPrerequisites: StateArtifactType[] = ["htmlPrototype", "prototypeMeta", "prdSpec", "testCaseSpec"];

export async function annotateProjectFile(
  projectPath: string,
  options: { llmProvider?: LLMProvider } = {}
): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
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

  // Prepare context for LLM
  const context = {
    prdSpec: state.prdSpec,
    htmlPrototype: state.htmlPrototype,
    prototypeSpec: state.prototypeSpec,
    testCaseSpec: state.testCaseSpec,
    existingAnnotationSpec: state.prototypeAnnotationSpec || null,
    isIncremental: !!state.prototypeAnnotationSpec
  };

  const input = JSON.stringify(context);
  const annotationResult = await runPrototypeAnnotationAgent(input, { provider: options.llmProvider });

  if (!annotationResult.ok) {
    return { ok: false, issues: annotationResult.issues };
  }

  const step = annotationResult.step;


  const patches = [...step.patches];
  const patched = applyPatchEnvelope(state, {
    id: `patch_annotation_${Date.now()}`,
    projectId: state.id,
    baseVersion: state.version,
    source: "prototype_annotation_generation",
    reason: state.prototypeAnnotationSpec ? "增量更新原型 PRD 标注结构" : "初始化原型 PRD 标注结构",
    patches,
    transaction: { atomic: true, mode: "all_or_nothing" },
    dirtyPolicy: { clear: ["prototypeAnnotationSpec"], mark: ["issues"], useDependencyPropagation: true },
    validationProfile: "generation_annotation"
  });

  if (!patched.ok) {
    return { ok: false, issues: patched.issues };
  }

  // Reverse write: write annotationNumber to PRD sections
  const stateWithReverseWrite = reverseWriteAnnotationNumbers(patched.state);

  const rendered = await renderAndCommit(stateWithReverseWrite, path.dirname(projectPath), [
    "prd_markdown",
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
