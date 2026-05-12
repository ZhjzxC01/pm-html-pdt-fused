import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";
import { applyPatchProposal } from "../../src/nl-edit/patch-proposal-applier.js";
import { proposePatch } from "../../src/nl-edit/patch-proposer.js";
import { proposeProjectEdit } from "../../src/nl-edit/propose-pipeline.js";
import { undoChangeLogItem } from "../../src/state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../../src/state/project-state-manager.js";
import { createRenderableState } from "../support/renderable-state.js";

describe("V1.2 自然语言修改", () => {
  it("给所有列表页增加导出按钮，并限制管理员可用", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-add-action-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      const state = createRenderableState();
      await saveProjectState(projectPath, state);
      const proposal = proposePatch(state, "帮我在所有列表页增加批量导出功能，并且只有管理员可以导出。");

      const applied = await applyPatchProposal(projectPath, state, proposal);

      expect(applied.ok).toBe(true);
      const changed = await loadProjectState(projectPath);
      const listPage = changed.prototypeSpec?.pages.byId.page_expense_list;
      const action = Object.values(listPage?.actions.byId ?? {}).find((item) => item.name === "批量导出");
      expect(action?.type).toBe("export");
      expect(action?.permissionRuleIds.length).toBeGreaterThan(0);
      const permission = action ? changed.prototypeSpec?.permissions.byId[action.permissionRuleIds[0] ?? ""] : undefined;
      expect(permission?.roleId).toBe("role_admin");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("修改“提交审批”为“提交报销审批”", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-edit-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, createRenderableState());
      const state = await loadProjectState(projectPath);
      const proposal = proposePatch(state, "将“提交审批”改为“提交报销审批”");
      const result = await applyPatchProposal(projectPath, state, proposal);

      expect(result.ok).toBe(true);
      const changed = await loadProjectState(projectPath);
      expect(changed.prototypeSpec?.pages.byId.page_expense_create.actions.byId.action_submit_expense.name).toBe("提交报销审批");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("将报销金额改为必填", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-field-"));
    try {
      const state = createRenderableState();
      const amountField =
        state.prototypeSpec?.pages.byId.page_expense_create.modules.byId.module_expense_form.fields.byId.field_expense_amount;
      expect(amountField).toBeTruthy();
      if (!amountField) return;
      amountField.required = false;

      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, state);
      const loaded = await loadProjectState(projectPath);
      const proposal = proposePatch(loaded, "将报销金额改为必填");
      const result = await applyPatchProposal(projectPath, loaded, proposal);

      expect(result.ok).toBe(true);
      const changed = await loadProjectState(projectPath);
      expect(
        changed.prototypeSpec?.pages.byId.page_expense_create.modules.byId.module_expense_form.fields.byId.field_expense_amount
          .required
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("新增管理员导出权限测试用例", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-testcase-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, createRenderableState());
      const state = await loadProjectState(projectPath);
      const proposal = proposePatch(state, "新增管理员导出权限测试用例");
      const result = await applyPatchProposal(projectPath, state, proposal);

      expect(result.ok).toBe(true);
      const changed = await loadProjectState(projectPath);
      const cases = Object.values(changed.testCaseSpec?.testSuites.byId.test_suite_expense_approval.cases.byId ?? {});
      expect(cases.some((testCase) => testCase.title.includes("管理员导出权限测试用例"))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("PatchProposal 应用后可 undo", async () => {
    const state = createRenderableState();
    const proposal = proposePatch(state, "将“提交审批”改为“提交报销审批”");
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-undo-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, state);
      const loaded = await loadProjectState(projectPath);
      const applied = await applyPatchProposal(projectPath, loaded, proposal);
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;

      const changed = await loadProjectState(projectPath);
      const undone = undoChangeLogItem(changed, applied.changeId);
      expect(undone.ok).toBe(true);
      if (!undone.ok) return;
      expect(undone.state.prototypeSpec?.pages.byId.page_expense_create.actions.byId.action_submit_expense.name).toBe(
        "提交审批"
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("propose 只写 patch-proposal.json，不修改 project-state.json", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-propose-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, createRenderableState());
      const before = await readFile(projectPath, "utf8");
      const result = await proposeProjectEdit(projectPath, "将“提交审批”改为“提交报销审批”");

      expect(result.ok).toBe(true);
      expect(await readFile(projectPath, "utf8")).toBe(before);
      if (result.ok) {
        expect(await readFile(result.proposalPath, "utf8")).toContain("patches");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("apply-proposal 拒绝 baseVersion 不匹配的提案", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-version-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      await saveProjectState(projectPath, createRenderableState());
      const state = await loadProjectState(projectPath);
      const proposal = { ...proposePatch(state, "将“提交审批”改为“提交报销审批”"), baseVersion: 999 };
      const result = await applyPatchProposal(projectPath, state, proposal);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]?.code).toBe("patch_proposal_base_version_mismatch");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("CLI propose 和 apply-proposal 可以串联执行", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-nl-cli-"));
    try {
      const projectPath = path.join(dir, "project-state.json");
      const proposalPath = path.join(dir, "proposal.json");
      await saveProjectState(projectPath, createRenderableState());

      const proposed = await execa("pnpm", [
        "tsx",
        "bin/pm-html-skill.ts",
        "propose",
        "--project",
        projectPath,
        "--instruction",
        "将“提交审批”改为“提交报销审批”",
        "--output",
        proposalPath
      ]);
      expect(proposed.stdout).toContain("提案已生成");

      const applied = await execa("pnpm", [
        "tsx",
        "bin/pm-html-skill.ts",
        "apply-proposal",
        "--project",
        projectPath,
        "--proposal",
        proposalPath
      ]);
      expect(applied.stdout).toContain("提案已应用");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15_000);
});
