import { describe, expect, it } from "vitest";
import { runReviewGate } from "../../src/reviews/review-gate-runner.js";
import { REVIEW_ROLES } from "../../src/reviews/review-role-configs.js";

describe("审查关口运行器", () => {
  it("gate_1 运行 business-analyst 和 ux-designer", async () => {
    const result = await runReviewGate("gate_1_input", "测试需求：费用报销管理");

    expect(result.gate).toBe("gate_1_input");
    expect(result.roleVerdicts.length).toBe(2);
    const roleIds = result.roleVerdicts.map((v) => v.roleId);
    expect(roleIds).toContain("business-analyst");
    expect(roleIds).toContain("ux-designer");
    expect(typeof result.allApproved).toBe("boolean");
    expect(Array.isArray(result.criticalFindings)).toBe(true);
    expect(typeof result.guidance).toBe("string");
  });

  it("gate_2 运行 business-analyst、tech-architect 和 qa-engineer", async () => {
    const result = await runReviewGate("gate_2_requirements", "测试需求");

    expect(result.gate).toBe("gate_2_requirements");
    expect(result.roleVerdicts.length).toBe(3);
    const roleIds = result.roleVerdicts.map((v) => v.roleId);
    expect(roleIds).toContain("business-analyst");
    expect(roleIds).toContain("tech-architect");
    expect(roleIds).toContain("qa-engineer");
  });

  it("gate_3 运行 business-analyst、ux-designer、ui-designer 和 tech-architect", async () => {
    const result = await runReviewGate("gate_3_prototype", "测试需求");

    expect(result.gate).toBe("gate_3_prototype");
    expect(result.roleVerdicts.length).toBe(4);
    const roleIds = result.roleVerdicts.map((v) => v.roleId);
    expect(roleIds).toContain("business-analyst");
    expect(roleIds).toContain("ux-designer");
    expect(roleIds).toContain("ui-designer");
    expect(roleIds).toContain("tech-architect");
  });

  it("gate_4 运行 ui-designer、frontend-developer 和 qa-engineer", async () => {
    const result = await runReviewGate("gate_4_html_testcase", "测试需求");

    expect(result.gate).toBe("gate_4_html_testcase");
    expect(result.roleVerdicts.length).toBe(3);
    const roleIds = result.roleVerdicts.map((v) => v.roleId);
    expect(roleIds).toContain("ui-designer");
    expect(roleIds).toContain("frontend-developer");
    expect(roleIds).toContain("qa-engineer");
  });

  it("支持自定义角色列表", async () => {
    const customRoles = [REVIEW_ROLES[0]];
    const result = await runReviewGate("gate_1_input", "测试需求", { roles: customRoles });

    expect(result.roleVerdicts.length).toBe(1);
    expect(result.roleVerdicts[0].roleId).toBe("business-analyst");
  });

  it("空角色列表返回空结果", async () => {
    const result = await runReviewGate("gate_1_input", "测试需求", { roles: [] });

    expect(result.roleVerdicts.length).toBe(0);
    expect(result.allApproved).toBe(true);
    expect(result.guidance).toBe("");
  });
});
