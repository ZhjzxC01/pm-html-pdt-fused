import { describe, expect, it } from "vitest";
import { validateEntityCollection } from "../../src/validators/entity-collection-validator.js";

describe("实体集合校验器", () => {
  it("接受一致的 byId 和 order", () => {
    const result = validateEntityCollection(
      {
        byId: {
          role_employee: { id: "role_employee" }
        },
        order: ["role_employee"]
      },
      "/requirementCard/roles"
    );

    expect(result.valid).toBe(true);
  });

  it("拒绝未出现在 order 中的实体", () => {
    const result = validateEntityCollection(
      {
        byId: {
          role_employee: { id: "role_employee" }
        },
        order: []
      },
      "/requirementCard/roles"
    );

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain("未出现在 order");
  });
});
