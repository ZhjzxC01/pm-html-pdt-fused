import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectState, StateArtifactType } from "../types/index.js";
import { projectStateSchema } from "../schemas/project-state.schema.js";

export const SCHEMA_VERSION = "2.6.0";

const dirtyDependencies: Record<StateArtifactType, StateArtifactType[]> = {
  requirementCard: [
    "prototypeSpec",
    "htmlPrototype",
    "prototypeMeta",
    "flowSpec",
    "complexityAssessment",
    "prdSpec",
    "testCaseSpec",
    "prototypeAnnotationSpec",
    "issues"
  ],
  prototypeSpec: [
    "htmlPrototype",
    "prototypeMeta",
    "flowSpec",
    "complexityAssessment",
    "prdSpec",
    "testCaseSpec",
    "prototypeAnnotationSpec",
    "issues"
  ],
  htmlPrototype: ["prototypeMeta", "prototypeAnnotationSpec", "issues"],
  prototypeMeta: ["prototypeAnnotationSpec", "issues"],
  flowSpec: ["complexityAssessment", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
  complexityAssessment: ["prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
  prdSpec: ["testCaseSpec", "prototypeAnnotationSpec", "issues"],
  testCaseSpec: ["prototypeAnnotationSpec", "issues"],
  prototypeAnnotationSpec: ["issues"],
  artifactManifest: ["issues"],
  issues: []
};

export function createEmptyProjectState(name = "expense-approval", now = new Date().toISOString()): ProjectState {
  return {
    id: `project_${sanitizeId(name)}`,
    name,
    schemaVersion: SCHEMA_VERSION,
    version: 0,
    updatedAt: now,
    lifecycleStatus: "draft",
    requirementCard: null,
    prototypeSpec: null,
    htmlPrototype: null,
    prototypeMeta: null,
    flowSpec: null,
    complexityAssessment: null,
    prdSpec: null,
    testCaseSpec: null,
    prototypeAnnotationSpec: null,
    traceability: {
      links: [],
      archivedLinks: []
    },
    artifactManifest: {
      items: {
        byId: {},
        order: []
      }
    },
    issues: [],
    changeLog: [],
    dirtyArtifacts: [],
    lastStructuredGeneratedAt: {}
  };
}

/**
 * Load and parse a project state file.
 * @throws {Error} if file not found or JSON/Zod validation fails.
 */
export async function loadProjectState(filePath: string): Promise<ProjectState> {
  const content = await readFile(filePath, "utf8");
  return projectStateSchema.parse(JSON.parse(content));
}

/** Safe variant that returns a Result instead of throwing. */
export async function loadProjectStateSafe(
  filePath: string
): Promise<{ ok: true; state: ProjectState } | { ok: false; issues: Array<{ id: string; severity: "error" | "warning"; code: string; message: string }> }> {
  try {
    const state = await loadProjectState(filePath);
    return { ok: true, state };
  } catch (error) {
    return {
      ok: false,
      issues: [{
        id: "state_load_error",
        severity: "error",
        code: "STATE_LOAD_FAILED",
        message: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

export async function saveProjectState(filePath: string, state: ProjectState): Promise<void> {
  const parsed = projectStateSchema.parse(state);
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await rename(tmpPath, filePath);
}

export function cloneProjectState(state: ProjectState): ProjectState {
  return structuredClone(state);
}

export function bumpProjectVersion(state: ProjectState, now = new Date().toISOString()): ProjectState {
  return {
    ...state,
    version: state.version + 1,
    updatedAt: now
  };
}

export function resolveDirtyArtifacts(artifacts: StateArtifactType[]): StateArtifactType[] {
  const resolved = new Set<StateArtifactType>();
  const visit = (artifact: StateArtifactType) => {
    if (resolved.has(artifact)) {
      return;
    }
    resolved.add(artifact);
    for (const dependency of dirtyDependencies[artifact]) {
      visit(dependency);
    }
  };

  for (const artifact of artifacts) {
    visit(artifact);
  }

  return Array.from(resolved);
}

export function markDirtyArtifacts(
  current: StateArtifactType[],
  mark: StateArtifactType[],
  useDependencyPropagation = true
): StateArtifactType[] {
  const combined = new Set<StateArtifactType>(current);
  const artifacts = useDependencyPropagation ? resolveDirtyArtifacts(mark) : mark;
  for (const artifact of artifacts) {
    combined.add(artifact);
  }
  return Array.from(combined);
}

export function clearDirtyArtifacts(current: StateArtifactType[], clear: StateArtifactType[]): StateArtifactType[] {
  const clearSet = new Set(clear);
  return current.filter((artifact) => !clearSet.has(artifact));
}

export function projectStatePath(projectRoot: string): string {
  return path.join(projectRoot, "project-state.json");
}

function sanitizeId(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized || "untitled";
}
