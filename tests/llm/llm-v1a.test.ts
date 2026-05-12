import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runComplexityAssessorAgent } from "../../src/agents/complexity-assessor-agent.js";
import { runFlowSpecAgent } from "../../src/agents/flow-spec-agent.js";
import { runHtmlPrototypeAgent } from "../../src/agents/html-prototype-agent.js";
import { runPrdAgent } from "../../src/agents/prd-agent.js";
import { runPrototypeAnnotationAgent } from "../../src/agents/prototype-annotation-agent.js";
import { runPrototypeMetaAgent } from "../../src/agents/prototype-meta-agent.js";
import { runPrototypeSpecAgent } from "../../src/agents/prototype-spec-agent.js";
import { runRequirementStructurerAgent } from "../../src/agents/requirement-structurer-agent.js";
import { runTestCaseAgent } from "../../src/agents/test-case-agent.js";
import { MockLLMProvider } from "../../src/llm/mock-llm-provider.js";
import { PromptRegistry } from "../../src/llm/prompt-registry.js";
import { generateFromInput } from "../../src/workflow/generation-pipeline.js";

const promptDir = path.resolve(process.cwd(), "prompts");

describe("LLM V1.1a", () => {
  it("PromptRegistry 能加载 prompt 文件", async () => {
    const registry = new PromptRegistry(promptDir);

    await expect(registry.load("system")).resolves.toContain("只输出合法 JSON");
    await expect(registry.load("requirement-structurer")).resolves.toContain("requirement-structurer-agent");
  });

  it("MockLLMProvider 能驱动 requirement structurer agent 生成 patch step", async () => {
    const result = await runRequirementStructurerAgent("我们要做一个合同审批功能，销售提交，法务审核，管理员归档。", {
      promptDir
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.step.source).toBe("requirement_generation");
    expect(result.step.patches[0]).toMatchObject({
      op: "replace",
      path: "/requirementCard"
    });
  });

  it("MockLLMProvider 能驱动全部 artifact agents 生成 patch step", async () => {
    const input = "我们要做一个费用报销审批功能。员工提交，主管审批，财务复核。";
    const results = [
      await runRequirementStructurerAgent(input, { promptDir }),
      await runPrototypeSpecAgent(input, { promptDir }),
      await runHtmlPrototypeAgent(input, { promptDir }),
      await runPrototypeMetaAgent(input, { promptDir }),
      await runFlowSpecAgent(input, { promptDir }),
      await runComplexityAssessorAgent(input, { promptDir }),
      await runPrdAgent(input, { promptDir }),
      await runTestCaseAgent(input, { promptDir }),
      await runPrototypeAnnotationAgent(input, { promptDir })
    ];

    expect(results.every((result) => result.ok)).toBe(true);
    const paths = results.map((result) => (result.ok ? result.step.patches[0]?.path : ""));
    expect(paths).toEqual([
      "/requirementCard",
      "/prototypeSpec",
      "/htmlPrototype",
      "/prototypeMeta",
      "/flowSpec",
      "/complexityAssessment",
      "/prdSpec",
      "/testCaseSpec",
      "/prototypeAnnotationSpec"
    ]);
  });

  it("AgentResultValidator 能拦截非法 JSON", async () => {
    const result = await runRequirementStructurerAgent("合同审批", {
      promptDir,
      provider: new MockLLMProvider("not json")
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues[0]?.code).toBe("llm_invalid_json");
  });

  it("generate --mode llm 在 mock provider 下能生成完整 project-state", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-llm-"));
    try {
      const inputPath = path.join(dir, "input.md");
      await writeFile(inputPath, "我们要做一个费用报销审批功能。员工提交，主管审批，财务复核。", "utf8");

      const result = await generateFromInput(inputPath, { mode: "llm" });

      expect(result.ok).toBe(true);
      const projectState = await readFile(path.join(dir, "project-state.json"), "utf8");
      expect(projectState).toContain("requirementCard");
      expect(projectState).toContain("prototypeSpec");
      expect(projectState).toContain("htmlPrototype");
      expect(projectState).toContain("flowSpec");
      expect(projectState).toContain("prdSpec");
      expect(projectState).toContain("testCaseSpec");
      expect(projectState).toContain("prototypeAnnotationSpec");
      expect(projectState).toContain("费用报销");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("generate --mode llm 遇到非法输出时不写入 project-state", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-llm-invalid-"));
    try {
      const inputPath = path.join(dir, "input.md");
      await writeFile(inputPath, "合同审批", "utf8");

      const result = await generateFromInput(inputPath, {
        mode: "llm",
        llmProvider: new MockLLMProvider("not json")
      });

      expect(result.ok).toBe(false);
      await expect(access(path.join(dir, "project-state.json"))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
