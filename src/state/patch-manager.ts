import type {
  PatchEnvelope,
  PatchSource,
  ProjectState,
  StateArtifactType,
  SupportedJsonPatchOperation,
  ValidationIssue
} from "../types/index.js";
import { cloneProjectState, clearDirtyArtifacts, markDirtyArtifacts } from "./project-state-manager.js";
import { isPatchPathAllowed, isReservedPatchPath } from "./patch-source-policy.js";
import { validateByProfile } from "./validation-profile.js";

export type PatchManagerResult =
  | { ok: true; state: ProjectState; issues: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] };

type AnyPatchOperation =
  | SupportedJsonPatchOperation
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string };

const generatedAtBySource: Partial<Record<PatchSource, StateArtifactType>> = {
  requirement_generation: "requirementCard",
  prototype_spec_generation: "prototypeSpec",
  html_prototype_generation: "htmlPrototype",
  prototype_meta_generation: "prototypeMeta",
  flow_generation: "flowSpec",
  prd_generation: "prdSpec",
  test_case_generation: "testCaseSpec",
  prototype_annotation_generation: "prototypeAnnotationSpec",
  consistency_check: "issues"
};

export function applyPatchEnvelope(
  state: ProjectState,
  envelope: PatchEnvelope,
  options: { now?: string; changeId?: string } = {}
): PatchManagerResult {
  const now = options.now ?? new Date().toISOString();
  const issues = validatePatchEnvelope(state, envelope);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const workingState = cloneProjectState(state);
  const inversePatches: SupportedJsonPatchOperation[] = [];

  try {
    for (const patch of envelope.patches) {
      const inverse = createInversePatch(workingState, patch);
      applyJsonPatchOperation(workingState, patch);
      if (inverse) {
        inversePatches.unshift(inverse);
      }
    }
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_patch_apply_failed",
          severity: "error",
          code: "patch_apply_failed",
          message: `Patch 应用失败：${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }

  applyDirtyPolicy(workingState, envelope);
  applyStructuredGeneratedAt(workingState, envelope.source, now);

  const versionBefore = state.version;
  const versionAfter = versionBefore + 1;
  workingState.version = versionAfter;
  workingState.updatedAt = now;
  workingState.changeLog = [
    ...workingState.changeLog,
    {
      id: options.changeId ?? `change_${versionAfter}`,
      projectId: state.id,
      versionBefore,
      versionAfter,
      source: envelope.source,
      reason: envelope.reason,
      patches: envelope.patches,
      inversePatches,
      dirtyArtifacts: workingState.dirtyArtifacts,
      createdAt: now
    }
  ];

  const validation = validateByProfile(workingState, envelope.validationProfile);
  if (!validation.valid) {
    return { ok: false, issues: validation.issues };
  }

  return {
    ok: true,
    state: workingState,
    issues: validation.issues
  };
}

export function undoChangeLogItem(
  state: ProjectState,
  changeLogId: string,
  options: { now?: string; changeId?: string } = {}
): PatchManagerResult {
  const item = state.changeLog.find((entry) => entry.id === changeLogId);
  if (!item) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_undo_change_not_found",
          severity: "error",
          code: "undo_change_not_found",
          message: `未找到要回滚的变更记录：${changeLogId}`
        }
      ]
    };
  }

  const dirtyPaths = item.inversePatches.map((patch) => patch.path);
  const dirtyArtifacts = inferDirtyArtifactsFromPaths(dirtyPaths);

  return applyPatchEnvelope(
    state,
    {
      id: `patch_undo_${changeLogId}`,
      projectId: state.id,
      baseVersion: state.version,
      source: "undo",
      reason: `回滚变更 ${changeLogId}`,
      patches: item.inversePatches,
      transaction: { atomic: true, mode: "all_or_nothing" },
      dirtyPolicy: {
        mark: dirtyArtifacts,
        useDependencyPropagation: true
      },
      validationProfile: "undo"
    },
    options
  );
}

function validatePatchEnvelope(state: ProjectState, envelope: PatchEnvelope): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (envelope.projectId !== state.id) {
    issues.push({
      id: "issue_patch_project_mismatch",
      severity: "error",
      code: "patch_project_mismatch",
      message: "PatchEnvelope.projectId 与当前 ProjectState.id 不一致。"
    });
  }

  if (envelope.baseVersion !== state.version) {
    issues.push({
      id: "issue_patch_base_version_mismatch",
      severity: "error",
      code: "patch_base_version_mismatch",
      message: `PatchEnvelope.baseVersion 不匹配，当前版本为 ${state.version}。`
    });
  }

  if (!envelope.transaction.atomic || envelope.transaction.mode !== "all_or_nothing") {
    issues.push({
      id: "issue_patch_transaction_invalid",
      severity: "error",
      code: "patch_transaction_invalid",
      message: "PatchEnvelope 必须使用 atomic all_or_nothing 事务。"
    });
  }

  for (const [index, patch] of (envelope.patches as AnyPatchOperation[]).entries()) {
    if (patch.op === "move" || patch.op === "copy") {
      issues.push({
        id: `issue_patch_unsupported_op_${index}`,
        severity: "error",
        code: "unsupported_patch_operation",
        message: `首轮不支持 ${patch.op} 操作，请使用 add、remove、replace 或 test。`,
        path: patch.path
      });
      continue;
    }

    if (isReservedPatchPath(patch.path)) {
      issues.push({
        id: `issue_patch_reserved_path_${index}`,
        severity: "error",
        code: "reserved_patch_path",
        message: `禁止通过 PatchEnvelope 直接修改系统保留路径：${patch.path}`,
        path: patch.path
      });
    }

    if (!isPatchPathAllowed(envelope.source, patch.path)) {
      issues.push({
        id: `issue_patch_path_not_allowed_${index}`,
        severity: "error",
        code: "patch_path_not_allowed",
        message: `当前 PatchSource 不允许修改路径：${patch.path}`,
        path: patch.path
      });
    }
  }

  return issues;
}

function applyDirtyPolicy(state: ProjectState, envelope: PatchEnvelope): void {
  const policy = envelope.dirtyPolicy;
  if (!policy) {
    state.dirtyArtifacts = Array.from(new Set(state.dirtyArtifacts));
    return;
  }

  let dirtyArtifacts = state.dirtyArtifacts;
  if (policy.clear) {
    dirtyArtifacts = clearDirtyArtifacts(dirtyArtifacts, policy.clear);
  }
  if (policy.mark) {
    dirtyArtifacts = markDirtyArtifacts(dirtyArtifacts, policy.mark, policy.useDependencyPropagation ?? false);
  }

  state.dirtyArtifacts = Array.from(new Set(dirtyArtifacts));
}

function applyStructuredGeneratedAt(state: ProjectState, source: PatchSource, now: string): void {
  const artifact = generatedAtBySource[source];
  if (!artifact) {
    return;
  }
  state.lastStructuredGeneratedAt = {
    ...state.lastStructuredGeneratedAt,
    [artifact]: now
  };
}

function createInversePatch(state: ProjectState, patch: SupportedJsonPatchOperation): SupportedJsonPatchOperation | null {
  if (patch.op === "test") {
    return null;
  }

  if (patch.op === "add") {
    return { op: "remove", path: patch.path };
  }

  const previousValue = getJsonPointerValue(state, patch.path);
  if (patch.op === "remove") {
    return { op: "add", path: patch.path, value: previousValue };
  }

  return { op: "replace", path: patch.path, value: previousValue };
}

function applyJsonPatchOperation(target: unknown, patch: SupportedJsonPatchOperation): void {
  if (patch.op === "test") {
    const currentValue = getJsonPointerValue(target, patch.path);
    if (JSON.stringify(currentValue) !== JSON.stringify(patch.value)) {
      throw new Error(`test 操作失败：${patch.path}`);
    }
    return;
  }

  const { parent, key } = getJsonPointerParent(target, patch.path);

  if (Array.isArray(parent)) {
    const index = key === "-" ? parent.length : Number(key);
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new Error(`数组路径无效：${patch.path}`);
    }
    if (patch.op === "add") {
      parent.splice(index, 0, patch.value);
      return;
    }
    if (index >= parent.length) {
      throw new Error(`数组路径不存在：${patch.path}`);
    }
    if (patch.op === "remove") {
      parent.splice(index, 1);
      return;
    }
    parent[index] = patch.value;
    return;
  }

  if (!isRecord(parent)) {
    throw new Error(`路径父节点不是对象：${patch.path}`);
  }

  if (patch.op === "add" || patch.op === "replace") {
    if (patch.op === "replace" && !(key in parent)) {
      throw new Error(`replace 路径不存在：${patch.path}`);
    }
    parent[key] = patch.value;
    return;
  }

  if (!(key in parent)) {
    throw new Error(`remove 路径不存在：${patch.path}`);
  }
  delete parent[key];
}

function getJsonPointerValue(target: unknown, pointer: string): unknown {
  if (pointer === "") {
    return target;
  }

  const tokens = parseJsonPointer(pointer);
  let current = target;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      current = current[Number(token)];
    } else if (isRecord(current)) {
      current = current[token];
    } else {
      throw new Error(`路径不存在：${pointer}`);
    }
  }
  return structuredClone(current);
}

function getJsonPointerParent(target: unknown, pointer: string): { parent: unknown; key: string } {
  const tokens = parseJsonPointer(pointer);
  if (tokens.length === 0) {
    throw new Error("不支持替换根节点。");
  }

  let parent = target;
  for (const token of tokens.slice(0, -1)) {
    if (Array.isArray(parent)) {
      parent = parent[Number(token)];
    } else if (isRecord(parent)) {
      parent = parent[token];
    } else {
      throw new Error(`路径不存在：${pointer}`);
    }
  }

  return { parent, key: tokens[tokens.length - 1] ?? "" };
}

function parseJsonPointer(pointer: string): string[] {
  if (!pointer.startsWith("/")) {
    throw new Error(`JSON Pointer 必须以 / 开头：${pointer}`);
  }

  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferDirtyArtifactsFromPaths(paths: string[]): StateArtifactType[] {
  const artifacts: StateArtifactType[] = [];

  for (const path of paths) {
    if (path.startsWith("/requirementCard")) artifacts.push("requirementCard");
    if (path.startsWith("/prototypeSpec")) artifacts.push("prototypeSpec");
    if (path.startsWith("/htmlPrototype")) artifacts.push("htmlPrototype");
    if (path.startsWith("/prototypeMeta")) artifacts.push("prototypeMeta");
    if (path.startsWith("/flowSpec")) artifacts.push("flowSpec");
    if (path.startsWith("/prdSpec")) artifacts.push("prdSpec");
    if (path.startsWith("/testCaseSpec")) artifacts.push("testCaseSpec");
    if (path.startsWith("/prototypeAnnotationSpec")) artifacts.push("prototypeAnnotationSpec");
    if (path.startsWith("/artifactManifest")) artifacts.push("artifactManifest");
    if (path.startsWith("/issues")) artifacts.push("issues");
  }

  return Array.from(new Set(artifacts));
}
