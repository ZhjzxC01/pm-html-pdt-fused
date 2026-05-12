import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("通用 B 端 CLI 流程", () => {
  it("在费用夹具之外生成合同审批项目", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-generic-"));
    try {
      const inputPath = path.join(dir, "input.md");
      const projectPath = path.join(dir, "project-state.json");
      await writeFile(
        inputPath,
        "我们要做一个合同管理系统，需要管理合同起草、审批、签署和归档。合同金额超过 50 万元时必须经过销售主管、法务和财务审批；合同金额不超过 50 万元时只需要销售主管和法务审批。审批人可以退回修改，被驳回的合同可以复制为新合同。支持合同列表、合同详情、提交审批、驳回、撤回、管理员导出。",
        "utf8"
      );

      await runCli(["generate", "--input", inputPath]);
      await runCli(["validate", "--project", projectPath]);
      await runCli(["check", "--project", projectPath]);

      const state = JSON.parse(await readFile(projectPath, "utf8")) as {
        name: string;
        requirementCard: { businessObjects: { byId: Record<string, { name: string }> } };
        flowSpec: { stateMachines: { byId: Record<string, { states: { byId: Record<string, { name: string }> } }> } };
      };
      const html = await readFile(path.join(dir, "output", "index.html"), "utf8");
      const prd = await readFile(path.join(dir, "output", "prd.md"), "utf8");
      const report = await readFile(path.join(dir, "output", "consistency-report.md"), "utf8");

      expect(state.name).toContain("合同");
      expect(state.requirementCard.businessObjects.byId.object_main.name).toBe("合同");
      expect(Object.values(state.flowSpec.stateMachines.byId.state_machine_main.states.byId).map((item) => item.name)).toContain("待审批");
      expect(Object.values(state.flowSpec.stateMachines.byId.state_machine_main.states.byId).map((item) => item.name)).toContain("待法务审批");
      expect(Object.values(state.flowSpec.stateMachines.byId.state_machine_main.states.byId).map((item) => item.name)).toContain("待财务审批");
      expect(html).toContain("合同列表页");
      expect(html).toContain("当前审批节点");
      expect(prd).toContain("合同管理系统 PRD");
      expect(prd).toContain("50 万元");
      expect(prd).toContain("销售主管、法务、财务");
      expect(prd).toContain("退回修改");
      expect(prd).toContain("复制为新合同");
      expect(report).toContain("未发现一致性问题");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15000);
});

function runCli(args: string[]) {
  return execa("pnpm", ["tsx", "bin/pm-html-skill.ts", ...args]);
}
