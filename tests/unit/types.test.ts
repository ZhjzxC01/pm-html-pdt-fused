import { describe, expect, it } from "vitest";
import { fileArtifactTypeSchema, projectStateSchema } from "../../src/schemas/project-state.schema.js";
import { createEmptyProjectState } from "../../src/state/project-state-manager.js";

describe("核心 schema", () => {
  it("创建合法的最小 ProjectState", () => {
    const state = createEmptyProjectState("expense-approval", "2026-04-26T00:00:00.000Z");

    expect(projectStateSchema.parse(state)).toEqual(state);
  });

  it("校验示例 ProjectState 夹具", async () => {
    const fixture = await import("../../examples/expense-approval/project-state.sample.json", {
      with: { type: "json" }
    });

    expect(projectStateSchema.parse(fixture.default).id).toBe("project_expense_approval");
  });

  it("不允许 project_state_json 作为文件产物", () => {
    expect(fileArtifactTypeSchema.safeParse("project_state_json").success).toBe(false);
  });
});
