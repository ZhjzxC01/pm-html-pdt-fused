import { Command, type Help } from "commander";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { initCommand } from "./commands/init.command.js";
import { generateFromInput, type GenerateMode } from "../workflow/generation-pipeline.js";
import { loadProjectConfig, saveProjectConfig, isValidReviewMode, type ReviewMode } from "../config/project-config.js";
import { validateProjectFile } from "../workflow/validation-pipeline.js";
import { renderProjectFile } from "../workflow/render-pipeline.js";
import { annotateProjectFile } from "../workflow/annotation-pipeline.js";
import { checkProjectFile } from "../workflow/check-pipeline.js";
import { undoProjectChange } from "../workflow/undo-pipeline.js";
import { proposeProjectEdit } from "../nl-edit/propose-pipeline.js";
import { applyPatchProposalFile } from "../nl-edit/patch-proposal-applier.js";
import { startLocalServer } from "../server/local-server.js";
import { runReviewPipelineForStage, listReviewStages, type ReviewStage } from "../reviews/review-pipeline.js";
import { REVIEW_GATES } from "../reviews/review-role-configs.js";

export function createCli(): Command {
  const program = new Command();

  withChineseHelp(program)
    .name("pm-html-skill")
    .usage("[选项] [命令]")
    .description("B 端产品经理高保真 HTML 原型驱动智能工作流内核")
    .version("0.1.0", "-V, --version", "显示版本号")
    .addHelpCommand("help [命令]", "显示指定命令的帮助信息");

  program.addCommand(withChineseHelp(initCommand().usage("--name <名称>")));

  withChineseHelp(program
    .command("generate")
    .usage("--input <路径> [--mode <模式>] [--review] [--strict] [--review-mode <模式>]")
    .description("根据需求输入生成结构化状态和输出产物")
    .requiredOption("--input <路径>", "需求输入 Markdown 文件")
    .option("--mode <模式>", "生成模式：rule / llm / auto", "llm")
    .option("--review", "启用生成前多角色审查", false)
    .option("--strict", "严格模式：审查发现 critical 问题时阻断生成", false)
    .option("--review-mode <模式>", "项目级审查模式（持久化）：none / review / strict")
    .action(async (options: { input: string; mode: string; review: boolean; strict: boolean; reviewMode?: string }) => {
      if (!isGenerateMode(options.mode)) {
        console.error("生成失败：");
        console.error("- [error] invalid_generate_mode: --mode 仅支持 rule、llm、auto。");
        process.exitCode = 1;
        return;
      }

      // 解析审查模式：CLI 参数 > --review-mode（持久化）> project-config.json > 默认 none
      const projectDir = path.dirname(path.resolve(options.input));
      let reviewEnabled = false;
      let strictEnabled = false;

      if (options.review || options.strict) {
        // CLI --review/--strict 直接覆盖，不持久化
        reviewEnabled = options.review || options.strict;
        strictEnabled = options.strict;
      } else if (options.reviewMode && isValidReviewMode(options.reviewMode)) {
        // --review-mode 指定，持久化到 project-config.json
        const mode = options.reviewMode as ReviewMode;
        if (mode === "review") { reviewEnabled = true; }
        else if (mode === "strict") { reviewEnabled = true; strictEnabled = true; }
        await saveProjectConfig(projectDir, { reviewMode: mode });
      } else {
        // 读取已持久化的配置
        const config = await loadProjectConfig(projectDir);
        if (config.reviewMode === "review") { reviewEnabled = true; }
        else if (config.reviewMode === "strict") { reviewEnabled = true; strictEnabled = true; }
      }

      const result = await generateFromInput(options.input, { mode: options.mode, review: reviewEnabled, strict: strictEnabled });
      if (result.ok) {
        for (const warning of result.warnings) {
          console.warn(`- [${warning.severity}] ${warning.code}: ${warning.message}`);
        }
        console.log("生成完成。");
        return;
      }

      console.error("生成失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("validate")
    .usage("--project <路径>")
    .description("校验 project-state.json")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .action(async (options: { project: string }) => {
      const result = await validateProjectFile(options.project);
      if (result.valid) {
        console.log("校验通过。");
        return;
      }

      console.error("校验失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("render")
    .usage("[目标] --project <路径>")
    .description("从结构化状态重新渲染输出产物")
    .argument("[目标]", "渲染目标，首轮仅支持 all")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .action(async (target: string | undefined, options: { project: string }) => {
      if (target && target !== "all") {
        console.error("渲染失败：");
        console.error("- [error] unsupported_render_target: 首轮 CLI 仅支持 render all。");
        process.exitCode = 1;
        return;
      }

      const result = await renderProjectFile(options.project);
      if (result.ok) {
        console.log("渲染完成。");
        return;
      }

      console.error("渲染失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("annotate")
    .usage("--project <路径>")
    .description("生成或更新 PRD 标注原型")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .action(async (options: { project: string }) => {
      const result = await annotateProjectFile(options.project);
      if (result.ok) {
        console.log("标注完成。");
        return;
      }
      console.error("标注失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("check")
    .usage("--project <路径>")
    .description("执行一致性检查并输出报告")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .action(async (options: { project: string }) => {
      const result = await checkProjectFile(options.project);
      if (result.ok) {
        console.log("一致性检查完成。");
        return;
      }
      console.error("一致性检查失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("review")
    .usage("--project <路径> --stage <阶段>")
    .description("对已有项目状态执行多角色审查")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .requiredOption("--stage <阶段>", `审查阶段：${listReviewStages().join(" / ")}`)
    .option("--strict", "严格模式：审查发现 critical 问题时返回非零退出码", false)
    .action(async (options: { project: string; stage: string; strict: boolean }) => {
      const stages = listReviewStages();
      if (!stages.includes(options.stage as ReviewStage)) {
        console.error("审查失败：");
        console.error(`- [error] invalid_review_stage: --stage 仅支持 ${stages.join("、")}。`);
        process.exitCode = 1;
        return;
      }

      let content: string;
      try {
        content = await readFile(options.project, "utf8");
      } catch {
        console.error("审查失败：");
        console.error("- [error] review_project_read_failed: 无法读取 project-state.json。");
        process.exitCode = 1;
        return;
      }

      const stage = options.stage as ReviewStage;
      const gateMap: Record<ReviewStage, string> = {
        input: "gate_1_input",
        requirements: "gate_2_requirements",
        prototype: "gate_3_prototype",
        html_testcase: "gate_4_html_testcase",
        prd: "gate_5_prd"
      };
      const gateName = gateMap[stage];
      const gateConfig = REVIEW_GATES.find((g) => g.gate === gateName);

      console.log(`审查阶段：${stage}（${gateConfig?.name ?? gateName}）`);

      const result = await runReviewPipelineForStage(stage, content, { strict: options.strict });
      if (!result.ok) {
        console.error("审查失败：");
        for (const issue of result.issues) {
          console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
        }
        process.exitCode = 1;
        return;
      }

      for (const gate of result.gates) {
        for (const verdict of gate.roleVerdicts) {
          console.log(`\n[${verdict.roleId}] ${verdict.approved ? "通过" : "未通过"}：${verdict.summary}`);
          for (const finding of verdict.findings) {
            const prefix = finding.severity === "critical" ? "[必须修复]" : finding.severity === "warning" ? "[建议修复]" : "[优化建议]";
            console.log(`  ${prefix} ${finding.description}`);
            if (finding.suggestedAction) {
              console.log(`    建议：${finding.suggestedAction}`);
            }
          }
        }
      }

      if (result.hasCritical) {
        console.error("\n审查发现 critical 级别问题。");
        process.exitCode = 1;
      } else {
        console.log("\n审查完成。");
      }
    }));

  withChineseHelp(program
    .command("propose")
    .usage("--project <路径> --instruction <自然语言修改>")
    .description("根据自然语言修改生成 PatchProposal，不直接修改 project-state.json")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .requiredOption("--instruction <自然语言修改>", "自然语言修改指令")
    .option("--output <路径>", "PatchProposal 输出路径，默认写入项目 output/patch-proposal.json")
    .action(async (options: { project: string; instruction: string; output?: string }) => {
      const result = await proposeProjectEdit(options.project, options.instruction, { outputPath: options.output });
      if (result.ok) {
        console.log(`提案已生成：${result.proposalPath}`);
        return;
      }

      console.error("生成提案失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("apply-proposal")
    .usage("--project <路径> --proposal <路径>")
    .description("应用已确认的 PatchProposal")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .requiredOption("--proposal <路径>", "patch-proposal.json 路径")
    .action(async (options: { project: string; proposal: string }) => {
      let result: Awaited<ReturnType<typeof applyPatchProposalFile>>;
      try {
        result = await applyPatchProposalFile(options.project, options.proposal);
      } catch (error) {
        console.error("应用提案失败：");
        console.error(`- [error] patch_proposal_read_failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      }

      if (result.ok) {
        console.log(`提案已应用，变更记录：${result.changeId}`);
        console.log("部分输出文件可能已过期，请运行 pm-html-skill render、annotate 和 check。");
        return;
      }

      console.error("应用提案失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  withChineseHelp(program
    .command("serve")
    .usage("[--project <目录>] [--host <地址>] [--port <端口>]")
    .description("启动本地 Web UI")
    .option("--project <目录>", "项目目录，默认当前目录", process.cwd())
    .option("--host <地址>", "监听地址", "127.0.0.1")
    .option("--port <端口>", "监听端口", "4173")
    .action(async (options: { project: string; host: string; port: string }) => {
      const port = Number(options.port);
      if (!Number.isInteger(port) || port <= 0) {
        console.error("启动失败：");
        console.error("- [error] invalid_server_port: --port 必须是正整数。");
        process.exitCode = 1;
        return;
      }

      const result = await startLocalServer({
        projectRoot: options.project,
        host: options.host,
        port
      });
      console.log(`本地 Web UI 已启动：${result.url}`);
      console.log("按 Ctrl+C 停止。");
    }));

  withChineseHelp(program
    .command("undo")
    .usage("--project <路径> --change <变更记录ID>")
    .description("按变更记录回滚状态")
    .requiredOption("--project <路径>", "project-state.json 路径")
    .requiredOption("--change <变更记录ID>", "变更记录 ID")
    .action(async (options: { project: string; change: string }) => {
      const result = await undoProjectChange(options.project, options.change);
      if (result.ok) {
        console.log("已回滚状态。部分输出文件可能已过期，请运行 pm-html-skill render 和 pm-html-skill check。");
        return;
      }
      console.error("回滚失败：");
      for (const issue of result.issues) {
        console.error(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
      }
      process.exitCode = 1;
    }));

  return program;
}

function isGenerateMode(value: string): value is GenerateMode {
  return value === "rule" || value === "llm" || value === "auto";
}

function withChineseHelp(command: Command): Command {
  return command.helpOption("-h, --help", "显示帮助信息").configureHelp({
    formatHelp(cmd: Command, helper: Help): string {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth || 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;

      function formatItem(term: string, description: string): string {
        term = localizeGeneratedTerm(term);
        if (!description) {
          return term;
        }
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }

      function formatList(items: string[]): string {
        return items.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
      }

      let output = [`用法：${helper.commandUsage(cmd)}`, ""];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([helper.wrap(commandDescription, helpWidth, 0), ""]);
      }

      const argumentList = helper
        .visibleArguments(cmd)
        .map((argument) => formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument)));
      if (argumentList.length > 0) {
        output = output.concat(["参数：", formatList(argumentList), ""]);
      }

      const optionList = helper
        .visibleOptions(cmd)
        .map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
      if (optionList.length > 0) {
        output = output.concat(["选项：", formatList(optionList), ""]);
      }

      if (helper.showGlobalOptions) {
        const globalOptionList = helper
          .visibleGlobalOptions(cmd)
          .map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
        if (globalOptionList.length > 0) {
          output = output.concat(["全局选项：", formatList(globalOptionList), ""]);
        }
      }

      const commandList = helper
        .visibleCommands(cmd)
        .map((subcommand) => formatItem(helper.subcommandTerm(subcommand), helper.subcommandDescription(subcommand)));
      if (commandList.length > 0) {
        output = output.concat(["命令：", formatList(commandList), ""]);
      }

      return output.join("\n");
    }
  });
}

function localizeGeneratedTerm(term: string): string {
  return term.replace(/\[options\]/g, "[选项]").replace(/\[command\]/g, "[命令]");
}
