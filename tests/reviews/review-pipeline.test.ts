import { describe, expect, it } from "vitest";
import {
  runReviewPipelineForStage,
  runSingleReviewGate,
  formatGuidance,
  formatAllGuidance,
  listReviewStages,
  listReviewGates
} from "../../src/reviews/review-pipeline.js";

describe("审查流水线", () => {
  it("列出所有审查阶段", () => {
    const stages = listReviewStages();
    expect(stages).toEqual(["input", "requirements", "prototype", "html_testcase", "prd"]);
  });

  it("列出所有审查关口", () => {
    const gates = listReviewGates();
    expect(gates).toEqual([
      "gate_1_input",
      "gate_2_requirements",
      "gate_3_prototype",
      "gate_4_html_testcase",
      "gate_5_prd"
    ]);
  });

  it("对 input 阶段执行审查", async () => {
    const result = await runReviewPipelineForStage("input", "费用报销管理系统需求");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gates.length).toBe(1);
    expect(result.gates[0].gate).toBe("gate_1_input");
    expect(result.gates[0].roleVerdicts.length).toBe(2);
  });

  it("对 requirements 阶段执行审查", async () => {
    const result = await runReviewPipelineForStage("requirements", "费用报销管理系统需求");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gates.length).toBe(1);
    expect(result.gates[0].gate).toBe("gate_2_requirements");
  });

  it("对 prd 阶段执行审查", async () => {
    const result = await runReviewPipelineForStage("prd", "费用报销管理系统需求");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gates.length).toBe(1);
    expect(result.gates[0].gate).toBe("gate_5_prd");
  });

  it("运行单个审查关口", async () => {
    const result = await runSingleReviewGate("gate_1_input", "测试需求");

    expect(result.gate).toBe("gate_1_input");
    expect(result.roleVerdicts.length).toBe(2);
  });

  it("formatGuidance 生成引导文本", async () => {
    const gate = await runSingleReviewGate("gate_1_input", "测试需求");
    const guidance = formatGuidance(gate);

    if (gate.allApproved) {
      expect(guidance).toBe("");
    } else {
      expect(guidance).toContain("[审查关口:");
      expect(guidance).toContain("gate_1_input");
    }
  });

  it("formatAllGuidance 汇总多个关口", async () => {
    const gate1 = await runSingleReviewGate("gate_1_input", "测试需求");
    const gate2 = await runSingleReviewGate("gate_2_requirements", "测试需求");
    const combined = formatAllGuidance([gate1, gate2]);

    expect(typeof combined).toBe("string");
  });
});
