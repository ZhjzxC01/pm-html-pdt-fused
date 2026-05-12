import type {
  EntityRef,
  PatchSource,
  ProjectState,
  StateArtifactType,
  SupportedJsonPatchOperation,
  TraceabilityMatrix,
  ValidationProfile
} from "../types/index.js";

export interface TraceLinkDraft {
  id: string;
  from: EntityRef;
  to: EntityRef;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

export interface GeneratorResult {
  source: PatchSource;
  reason: string;
  patches: SupportedJsonPatchOperation[];
  traceLinks: TraceLinkDraft[];
  clear: StateArtifactType[];
  mark: StateArtifactType[];
  validationProfile: ValidationProfile;
}

export function replaceArtifact(
  source: PatchSource,
  reason: string,
  path: `/${string}`,
  value: unknown,
  clear: StateArtifactType[],
  mark: StateArtifactType[],
  validationProfile: ValidationProfile,
  traceLinks: TraceLinkDraft[] = []
): GeneratorResult {
  return {
    source,
    reason,
    patches: [{ op: "replace", path, value }],
    traceLinks,
    clear,
    mark,
    validationProfile
  };
}

export function buildPatchId(source: PatchSource, state: ProjectState): string {
  return `patch_${source}_${state.version + 1}`;
}

export function mergeTraceLinkDrafts(traceability: TraceabilityMatrix, drafts: TraceLinkDraft[]): TraceabilityMatrix {
  if (drafts.length === 0) {
    return traceability;
  }

  const linksById = new Map(traceability.links.map((link) => [link.id, link]));
  for (const draft of drafts) {
    linksById.set(draft.id, {
      ...draft,
      status: "active",
      createdBy: "generator"
    });
  }

  return {
    links: Array.from(linksById.values()),
    archivedLinks: traceability.archivedLinks
  };
}
