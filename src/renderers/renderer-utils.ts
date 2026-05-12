import type { FileArtifactType, ProjectState, RenderOutcome, RenderResult, ValidationIssue } from "../types/index.js";
import { hashStableJson, sha256 } from "../utils/hash.js";

export const RENDERER_VERSION = "0.1.0";

export function renderOk(
  state: ProjectState,
  artifactType: FileArtifactType,
  fileName: string,
  relativePath: string,
  content: string,
  sourceSlice: unknown
): RenderOutcome {
  return {
    ok: true,
    result: {
      artifactType,
      fileName,
      relativePath,
      content,
      contentHash: sha256(content),
      sourceStateVersion: state.version,
      sourceHash: calculateSourceHash(state, sourceSlice),
      rendererVersion: RENDERER_VERSION,
      schemaVersion: state.schemaVersion
    }
  };
}

export function calculateSourceHash(state: ProjectState, sourceSlice: unknown, rendererVersion = RENDERER_VERSION): string {
  return hashStableJson({
    schemaVersion: state.schemaVersion,
    rendererVersion,
    sourceSlice
  });
}

export function getSourceSliceForArtifact(state: ProjectState, artifactType: FileArtifactType): unknown {
  switch (artifactType) {
    case "html_prototype":
      return state.htmlPrototype;
    case "prototype_spec_json":
      return state.prototypeSpec;
    case "prototype_meta_json":
      return state.prototypeMeta;
    case "prd_markdown":
      return {
        requirementCard: state.requirementCard,
        prototypeSpec: state.prototypeSpec,
        flowSpec: state.flowSpec,
        prdSpec: state.prdSpec
      };
    case "test_cases_markdown":
    case "gherkin_feature":
      return state.testCaseSpec;
    case "prototype_annotation_json":
      return state.prototypeAnnotationSpec;
    case "prototype_review_html":
      return {
        htmlPrototype: state.htmlPrototype,
        prototypeAnnotationSpec: state.prototypeAnnotationSpec,
        prdSpec: state.prdSpec,
        testCaseSpec: state.testCaseSpec,
        prototypeSpec: state.prototypeSpec
      };
    case "flow_mermaid":
      return state.flowSpec;
    case "consistency_report":
      return state.issues;
  }
}

export function renderMissingSource(code: string, message: string, path: string): RenderOutcome {
  const issue: ValidationIssue = {
    id: `issue_${code}`,
    severity: "error",
    code,
    message,
    path
  };
  return { ok: false, issues: [issue] };
}
