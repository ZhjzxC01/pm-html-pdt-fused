import type { PatchSource } from "../types/index.js";

const sourcePathPrefixes: Record<PatchSource, string[]> = {
  requirement_generation: ["/requirementCard", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  prototype_spec_generation: ["/prototypeSpec", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  html_prototype_generation: ["/htmlPrototype", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  prototype_meta_generation: ["/prototypeMeta", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  flow_generation: ["/flowSpec", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  complexity_assessment: ["/complexityAssessment", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  prd_generation: ["/prdSpec", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  test_case_generation: ["/testCaseSpec", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  prototype_annotation_generation: [
    "/prototypeAnnotationSpec",
    "/traceability",
    "/dirtyArtifacts",
    "/lastStructuredGeneratedAt"
  ],
  renderer_manifest_sync: ["/artifactManifest"],
  consistency_check: ["/issues", "/lastStructuredGeneratedAt"],
  nl_edit: ["/prototypeSpec", "/testCaseSpec", "/traceability", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  system_sync: ["/lifecycleStatus", "/dirtyArtifacts", "/lastStructuredGeneratedAt"],
  undo: ["/"]
};

const externallyReservedPaths = new Set(["/version", "/updatedAt", "/changeLog"]);

export function isReservedPatchPath(path: string): boolean {
  return externallyReservedPaths.has(path) || path.startsWith("/version/") || path.startsWith("/updatedAt/") || path.startsWith("/changeLog/");
}

export function isPatchPathAllowed(source: PatchSource, path: string): boolean {
  if (isReservedPatchPath(path)) {
    return false;
  }

  if (source === "undo") {
    return true;
  }

  if (source !== "renderer_manifest_sync" && isPathWithin(path, "/artifactManifest")) {
    return false;
  }

  if (source !== "consistency_check" && isPathWithin(path, "/issues")) {
    return false;
  }

  return sourcePathPrefixes[source].some((prefix) => isPathWithin(path, prefix));
}

function isPathWithin(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}
