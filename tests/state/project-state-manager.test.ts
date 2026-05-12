import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createEmptyProjectState,
  loadProjectState,
  resolveDirtyArtifacts,
  saveProjectState
} from "../../src/state/project-state-manager.js";

describe("项目状态管理器", () => {
  it("保存并加载 project-state.json", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-skill-"));
    const statePath = path.join(dir, "project-state.json");

    try {
      const state = createEmptyProjectState("expense-approval", "2026-04-26T00:00:00.000Z");
      await saveProjectState(statePath, state);

      const raw = await readFile(statePath, "utf8");
      const loaded = await loadProjectState(statePath);

      expect(raw).toContain("project_expense_approval");
      expect(loaded.id).toBe("project_expense_approval");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("把 requirementCard 脏标记传播到下游产物", () => {
    expect(resolveDirtyArtifacts(["requirementCard"])).toEqual([
      "requirementCard",
      "prototypeSpec",
      "htmlPrototype",
      "prototypeMeta",
      "prototypeAnnotationSpec",
      "issues",
      "flowSpec",
      "complexityAssessment",
      "prdSpec",
      "testCaseSpec"
    ]);
  });

  it("把 prdSpec 脏标记传播到测试、标注和问题", () => {
    expect(resolveDirtyArtifacts(["prdSpec"])).toEqual([
      "prdSpec",
      "testCaseSpec",
      "prototypeAnnotationSpec",
      "issues"
    ]);
  });
});
