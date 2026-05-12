import { describe, expect, it } from "vitest";
import { applyPatchEnvelope, undoChangeLogItem } from "../../src/state/patch-manager.js";
import { createEmptyProjectState } from "../../src/state/project-state-manager.js";
import type { PatchEnvelope, ProjectState } from "../../src/types/index.js";
import { createRenderableState } from "../support/renderable-state.js";

describe("补丁管理器", () => {
  it("应用全有或全无的补丁信封并写入变更日志", () => {
    const state = createEmptyProjectState("expense-approval", "2026-04-26T00:00:00.000Z");
    const envelope = createEnvelope(state, {
      source: "system_sync",
      patches: [{ op: "replace", path: "/lifecycleStatus", value: "dirty" }],
      dirtyPolicy: { mark: ["prdSpec"], useDependencyPropagation: true },
      validationProfile: "schema_only"
    });

    const result = applyPatchEnvelope(state, envelope, {
      now: "2026-04-26T01:00:00.000Z",
      changeId: "change_test_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.lifecycleStatus).toBe("dirty");
    expect(result.state.version).toBe(1);
    expect(result.state.changeLog).toHaveLength(1);
    expect(result.state.changeLog[0]?.inversePatches).toEqual([
      { op: "replace", path: "/lifecycleStatus", value: "draft" }
    ]);
    expect(result.state.dirtyArtifacts).toEqual(["prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"]);
  });

  it("拒绝 baseVersion 不匹配", () => {
    const state = createEmptyProjectState();
    const result = applyPatchEnvelope(state, {
      ...createEnvelope(state),
      baseVersion: 99
    });

    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe("patch_base_version_mismatch");
  });

  it("拒绝系统保留路径", () => {
    const state = createEmptyProjectState();
    const result = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        patches: [{ op: "replace", path: "/version", value: 10 }]
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "reserved_patch_path")).toBe(true);
  });

  it("拒绝当前 PatchSource 策略之外的路径", () => {
    const state = createEmptyProjectState();
    const result = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        source: "renderer_manifest_sync",
        patches: [{ op: "replace", path: "/lifecycleStatus", value: "dirty" }],
        validationProfile: "render_manifest_sync"
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "patch_path_not_allowed")).toBe(true);
  });

  it("拒绝 move 和 copy 操作并返回中文错误", () => {
    const state = createEmptyProjectState();
    const result = applyPatchEnvelope(
      state,
      {
        ...createEnvelope(state),
        patches: [{ op: "move", from: "/name", path: "/lifecycleStatus" } as never]
      }
    );

    expect(result.ok).toBe(false);
    expect(result.issues[0]?.message).toContain("首轮不支持 move 操作");
  });

  it("任一补丁失败时回滚整个信封", () => {
    const state = createEmptyProjectState();
    const result = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        patches: [
          { op: "replace", path: "/lifecycleStatus", value: "dirty" },
          { op: "replace", path: "/notExists", value: "x" }
        ]
      })
    );

    expect(result.ok).toBe(false);
    expect(state.lifecycleStatus).toBe("draft");
    expect(state.version).toBe(0);
  });

  it("回滚此前成功的变更并标记脏产物", () => {
    const state = createEmptyProjectState("expense-approval", "2026-04-26T00:00:00.000Z");
    const changed = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        patches: [{ op: "replace", path: "/lifecycleStatus", value: "dirty" }]
      }),
      { now: "2026-04-26T01:00:00.000Z", changeId: "change_target" }
    );
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;

    const undone = undoChangeLogItem(changed.state, "change_target", {
      now: "2026-04-26T02:00:00.000Z",
      changeId: "change_undo"
    });

    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.state.lifecycleStatus).toBe("draft");
    expect(undone.state.version).toBe(2);
    expect(undone.state.changeLog.at(-1)?.source).toBe("undo");
  });

  it("拒绝未通过 generation_html profile 的生成 HTML", () => {
    const state = createRenderableState();
    const brokenHtmlPrototype = structuredClone(state.htmlPrototype);
    expect(brokenHtmlPrototype).toBeTruthy();
    if (!brokenHtmlPrototype) return;
    brokenHtmlPrototype.files.byId.html_index.content = "<html><body><p>缺少页面容器</p></body></html>";

    const result = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        source: "html_prototype_generation",
        patches: [{ op: "replace", path: "/htmlPrototype", value: brokenHtmlPrototype }],
        validationProfile: "generation_html"
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "missing_page_container")).toBe(true);
  });

  it("拒绝没有覆盖 P0 操作的生成测试用例", () => {
    const state = createRenderableState();
    const brokenTestCaseSpec = structuredClone(state.testCaseSpec);
    expect(brokenTestCaseSpec).toBeTruthy();
    if (!brokenTestCaseSpec) return;
    const testCase = brokenTestCaseSpec.testSuites.byId.test_suite_expense_approval.cases.byId.test_case_submit_expense_success;
    testCase.relatedActionIds = [];

    const result = applyPatchEnvelope(
      state,
      createEnvelope(state, {
        source: "test_case_generation",
        patches: [{ op: "replace", path: "/testCaseSpec", value: brokenTestCaseSpec }],
        validationProfile: "generation_test_case"
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "p0_action_missing_test_case")).toBe(true);
  });
});

function createEnvelope(state: ProjectState, overrides: Partial<PatchEnvelope> = {}): PatchEnvelope {
  return {
    id: "patch_test",
    projectId: state.id,
    baseVersion: state.version,
    source: "system_sync",
    reason: "测试状态变更",
    patches: [{ op: "replace", path: "/lifecycleStatus", value: "dirty" }],
    transaction: { atomic: true, mode: "all_or_nothing" },
    validationProfile: "schema_only",
    ...overrides
  };
}
