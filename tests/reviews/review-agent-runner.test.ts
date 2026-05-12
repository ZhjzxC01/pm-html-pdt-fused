import { describe, expect, it } from "vitest";
import { runReviewAgent } from "../../src/reviews/review-agent-runner.js";
import { REVIEW_ROLES } from "../../src/reviews/review-role-configs.js";
import { MockLLMProvider } from "../../src/llm/mock-llm-provider.js";

describe("审查 Agent 运行器", () => {
  it("成功执行单个角色审查并返回 RoleVerdict", async () => {
    const role = REVIEW_ROLES[0];
    const result = await runReviewAgent("测试需求：费用报销管理", role, "gate_1_input");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.verdict.roleId).toBe(role.roleId);
    expect(result.verdict.gate).toBe("gate_1_input");
    expect(typeof result.verdict.approved).toBe("boolean");
    expect(Array.isArray(result.verdict.findings)).toBe(true);
    expect(typeof result.verdict.summary).toBe("string");
  });

  it("拒绝 roleId 不匹配的审查结果", async () => {
    const role = REVIEW_ROLES[0];
    const wrongVerdict = JSON.stringify({
      id: "agent_result_mock",
      agentName: "business-analyst-reviewer",
      inputHash: "mock-hash",
      output: {
        roleId: "wrong-role",
        gate: "gate_1_input",
        approved: true,
        findings: [],
        summary: "测试通过"
      },
      assumptions: [],
      pendingQuestions: [],
      warnings: []
    });

    const result = await runReviewAgent("测试需求", role, "gate_1_input", {
      provider: new MockLLMProvider(wrongVerdict)
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === "review_role_id_mismatch")).toBe(true);
  });

  it("拒绝 gate 不匹配的审查结果", async () => {
    const role = REVIEW_ROLES[0];
    const wrongVerdict = JSON.stringify({
      id: "agent_result_mock",
      agentName: "business-analyst-reviewer",
      inputHash: "mock-hash",
      output: {
        roleId: "business-analyst",
        gate: "wrong_gate",
        approved: true,
        findings: [],
        summary: "测试通过"
      },
      assumptions: [],
      pendingQuestions: [],
      warnings: []
    });

    const result = await runReviewAgent("测试需求", role, "gate_1_input", {
      provider: new MockLLMProvider(wrongVerdict)
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === "review_gate_mismatch")).toBe(true);
  });

  it("所有 6 个角色都能成功执行 mock 审查", async () => {
    for (const role of REVIEW_ROLES) {
      const result = await runReviewAgent("费用报销管理需求", role, "gate_1_input");
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.verdict.roleId).toBe(role.roleId);
    }
  });
});
