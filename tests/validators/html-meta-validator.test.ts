import { describe, expect, it } from "vitest";
import { createRenderableState } from "../support/renderable-state.js";
import { validateHtmlPrototype } from "../../src/validators/html-prototype-validator.js";
import { validatePrototypeMeta } from "../../src/validators/prototype-meta-validator.js";

describe("HTML 和原型元数据校验器", () => {
  it("合法的 HTML 与元数据状态可以通过", () => {
    const state = createRenderableState();

    expect(validateHtmlPrototype(state, "with_meta").valid).toBe(true);
    expect(validatePrototypeMeta(state).valid).toBe(true);
  });

  it("拒绝重复的操作 data 属性", () => {
    const state = createRenderableState();
    const file = state.htmlPrototype?.files.byId.html_index;
    if (file) {
      file.content = file.content.replace("</section>", '<button data-action-id="action_submit_expense">重复</button></section>');
    }

    const result = validateHtmlPrototype(state);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "duplicate_data_attribute")).toBe(true);
  });

  it("拒绝缺少 primary 映射的字段", () => {
    const state = createRenderableState();
    if (state.prototypeMeta) {
      state.prototypeMeta.fieldMappings = state.prototypeMeta.fieldMappings.filter(
        (mapping) => mapping.entityId !== "field_expense_amount"
      );
    }
    const result = validatePrototypeMeta(state);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "field_missing_primary_mapping")).toBe(true);
  });
});
