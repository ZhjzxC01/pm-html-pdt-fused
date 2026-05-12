import { describe, expect, it } from "vitest";
import { createRenderableState } from "../support/renderable-state.js";
import { renderAndCommit } from "../../src/workflow/render-pipeline.js";
import { runConsistencyCheck } from "../../src/validators/consistency-checker.js";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("一致性检查器", () => {
  it("完整的费用报销状态可以通过检查", () => {
    const state = createRenderableState();

    expect(runConsistencyCheck(state)).toEqual([]);
  });

  it("报告缺失的 PRD 目标实体", () => {
    const state = createRenderableState();
    const section = state.prdSpec?.sections.byId.prd_section_action_submit_expense;
    if (section) {
      section.target = { entityType: "action", entityId: "action_missing" };
    }

    const issues = runConsistencyCheck(state);

    expect(issues.some((issue) => issue.code === "prd_section_target_missing")).toBe(true);
  });

  it("报告缺失的测试用例操作引用", () => {
    const state = createRenderableState();
    const testCase = state.testCaseSpec?.testSuites.byId.test_suite_expense_approval.cases.byId.test_case_submit_expense_success;
    if (testCase) {
      testCase.relatedActionIds = ["action_missing"];
    }

    const issues = runConsistencyCheck(state);

    expect(issues.some((issue) => issue.code === "test_case_action_missing")).toBe(true);
  });

  it("报告过期的产物清单 sourceHash", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-consistency-"));
    try {
      const state = createRenderableState();
      const rendered = await renderAndCommit(state, dir, "all");
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) return;

      rendered.state.prdSpec!.sections.byId.prd_section_action_submit_expense.content = "被修改的 PRD 内容";

      const issues = runConsistencyCheck(rendered.state);

      expect(issues.some((issue) => issue.code === "artifact_source_hash_stale")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
