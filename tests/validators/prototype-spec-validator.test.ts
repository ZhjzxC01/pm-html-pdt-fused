import { describe, expect, it } from "vitest";
import { validatePrototypeSpec } from "../../src/validators/prototype-spec-validator.js";
import type { PrototypeSpec } from "../../src/types/index.js";

describe("原型规格校验器", () => {
  it("P0 操作没有权限规则时返回警告", () => {
    const spec = createMinimalPrototypeSpec();
    const result = validatePrototypeSpec(spec, null);

    expect(result.valid).toBe(true);
    expect(result.issues[0]?.code).toBe("page_missing_source_refs");
    expect(result.issues.some((issue) => issue.code === "p0_action_missing_permission_rule")).toBe(true);
  });

  it("权限 effect 冲突时返回错误", () => {
    const spec = createMinimalPrototypeSpec();
    spec.permissions.byId.permission_employee_submit_1 = {
      id: "permission_employee_submit_1",
      roleId: "role_employee",
      targetType: "action",
      targetId: "action_submit_expense",
      effect: "allow"
    };
    spec.permissions.byId.permission_employee_submit_2 = {
      id: "permission_employee_submit_2",
      roleId: "role_employee",
      targetType: "action",
      targetId: "action_submit_expense",
      effect: "deny"
    };
    spec.permissions.order.push("permission_employee_submit_1", "permission_employee_submit_2");

    const result = validatePrototypeSpec(spec, null);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "permission_effect_conflict")).toBe(true);
  });
});

function createMinimalPrototypeSpec(): PrototypeSpec {
  return {
    id: "prototype_expense_approval",
    pages: {
      byId: {
        page_expense_list: {
          id: "page_expense_list",
          name: "费用报销列表页",
          type: "list",
          goal: "查看和筛选费用报销单",
          routePath: "/expenses",
          layout: {
            layoutType: "top_nav_content",
            density: "compact",
            primaryRegion: "content",
            secondaryRegions: []
          },
          modules: {
            byId: {},
            order: []
          },
          actions: {
            byId: {
              action_submit_expense: {
                id: "action_submit_expense",
                name: "提交审批",
                type: "submit",
                placement: "row",
                triggerComponent: "button",
                priority: "P0",
                permissionRuleIds: [],
                sourceRefs: []
              }
            },
            order: ["action_submit_expense"]
          },
          uiStates: {
            byId: {},
            order: []
          },
          roleVisibility: [],
          sourceRefs: []
        }
      },
      order: ["page_expense_list"]
    },
    navigation: {
      byId: {},
      order: []
    },
    permissions: {
      byId: {},
      order: []
    },
    mockDataSets: {
      byId: {},
      order: []
    }
  };
}
