import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("check CLI", () => {
  it("替换问题并渲染包含过期产物警告的报告", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-check-"));
    try {
      const inputPath = path.join(dir, "input.md");
      const projectPath = path.join(dir, "project-state.json");
      await writeFile(inputPath, "我们要做一个费用报销审批功能。员工提交，主管审批，财务复核，管理员导出。", "utf8");

      await runCli(["generate", "--input", inputPath]);

      const state = JSON.parse(await readFile(projectPath, "utf8")) as {
        prdSpec: { sections: { byId: Record<string, { content: string }> } };
      };
      state.prdSpec.sections.byId.prd_section_action_submit_expense.content = "人为修改后的 PRD 内容";
      await writeFile(projectPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

      await runCli(["check", "--project", projectPath]);

      const checkedState = JSON.parse(await readFile(projectPath, "utf8")) as { issues: Array<{ code: string }> };
      const report = await readFile(path.join(dir, "output", "consistency-report.md"), "utf8");

      expect(checkedState.issues.some((issue) => issue.code === "artifact_source_hash_stale")).toBe(true);
      expect(report).toContain("sourceHash");
      expect(report).toContain("请运行 pm-html-skill render");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15000);
});

function runCli(args: string[]) {
  return execa("pnpm", ["tsx", "bin/pm-html-skill.ts", ...args]);
}
