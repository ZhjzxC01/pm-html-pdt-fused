import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("完整 CLI 流程", () => {
  it("运行 generate、validate、render、annotate、check 和 undo", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-full-"));
    try {
      const inputPath = path.join(dir, "input.md");
      const projectPath = path.join(dir, "project-state.json");
      await writeFile(
        inputPath,
        "我们要做一个费用报销审批功能。员工可以提交报销单，直属主管审批，财务复核，管理员可以查看所有报销单并导出。",
        "utf8"
      );

      await runCli(["generate", "--input", inputPath]);
      await runCli(["validate", "--project", projectPath]);
      await runCli(["render", "all", "--project", projectPath]);
      await runCli(["annotate", "--project", projectPath]);
      await runCli(["check", "--project", projectPath]);

      const stateBeforeUndo = JSON.parse(await readFile(projectPath, "utf8")) as {
        changeLog: Array<{ id: string; source: string }>;
      };
      const lastChangeId = stateBeforeUndo.changeLog.at(-1)?.id;
      expect(lastChangeId).toBeTruthy();

      const undo = await runCli(["undo", "--project", projectPath, "--change", lastChangeId ?? ""]);
      expect(undo.stdout).toContain("已回滚状态");

      const review = await readFile(path.join(dir, "output", "prototype-review.html"), "utf8");
      const report = await readFile(path.join(dir, "output", "consistency-report.md"), "utf8");
      expect(review).toContain("prd-tooltip");
      expect(report).toContain("一致性检查报告");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 15000);
});

function runCli(args: string[]) {
  return execa("pnpm", ["tsx", "bin/pm-html-skill.ts", ...args]);
}
