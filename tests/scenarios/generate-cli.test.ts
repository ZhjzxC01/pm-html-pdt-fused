import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("generate CLI", () => {
  it("为费用报销生成 project-state.json 和渲染文件", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-generate-"));
    try {
      const inputPath = path.join(dir, "input.md");
      await writeFile(
        inputPath,
        "我们要做一个费用报销审批功能。员工可以提交报销单，主管审批，财务复核，管理员可以导出。",
        "utf8"
      );

      const result = await execa("pnpm", ["tsx", "bin/pm-html-skill.ts", "generate", "--input", inputPath]);

      expect(result.stdout).toContain("生成完成");
      const projectState = await readFile(path.join(dir, "project-state.json"), "utf8");
      const indexHtml = await readFile(path.join(dir, "output", "index.html"), "utf8");
      const report = await readFile(path.join(dir, "output", "consistency-report.md"), "utf8");

      expect(projectState).toContain("project_expense_approval");
      expect(indexHtml).toContain("费用报销");
      expect(report).toContain("一致性检查报告");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("支持 --mode llm 使用 mock provider 生成", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-generate-llm-"));
    try {
      const inputPath = path.join(dir, "input.md");
      await writeFile(inputPath, "我们要做一个合同审批功能。销售提交合同，法务审核，管理员归档。", "utf8");

      const result = await execa("pnpm", ["tsx", "bin/pm-html-skill.ts", "generate", "--input", inputPath, "--mode", "llm"]);

      expect(result.stdout).toContain("生成完成");
      const projectState = await readFile(path.join(dir, "project-state.json"), "utf8");
      expect(projectState).toContain("requirementCard");
      expect(projectState).toContain("合同审批");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("拒绝未知 --mode", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-generate-invalid-mode-"));
    try {
      const inputPath = path.join(dir, "input.md");
      await writeFile(inputPath, "合同审批", "utf8");

      const result = await execa("pnpm", ["tsx", "bin/pm-html-skill.ts", "generate", "--input", inputPath, "--mode", "unknown"], {
        reject: false
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("invalid_generate_mode");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
