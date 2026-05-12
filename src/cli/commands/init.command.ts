import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { createEmptyProjectState } from "../../state/project-state-manager.js";
import { isValidReviewMode, saveProjectConfig, type ReviewMode } from "../../config/project-config.js";

export function initCommand(): Command {
  return new Command("init")
    .description("初始化本地项目目录")
    .requiredOption("--name <名称>", "项目目录名称")
    .option("--review-mode <模式>", "审查模式：none / review / strict", "none")
    .action(async (options: { name: string; reviewMode: string }) => {
      const projectRoot = path.resolve(process.cwd(), options.name);
      await mkdir(path.join(projectRoot, "output"), { recursive: true });
      await writeFile(
        path.join(projectRoot, "input.md"),
        "我们要做一个费用报销审批功能。员工可以提交报销单，直属主管审批，审批通过后财务复核，财务通过后进入待打款状态。主管和财务都可以驳回。管理员可以查看所有报销单并导出，普通员工只能查看自己的报销单。\n",
        "utf8"
      );
      await writeFile(
        path.join(projectRoot, "project-state.json"),
        `${JSON.stringify(createEmptyProjectState(options.name), null, 2)}\n`,
        "utf8"
      );
      const reviewMode: ReviewMode = isValidReviewMode(options.reviewMode) ? options.reviewMode : "none";
      await saveProjectConfig(projectRoot, { reviewMode });
      console.log(`已初始化项目：${projectRoot}`);
      console.log(`审查模式：${reviewMode}`);
    });
}
