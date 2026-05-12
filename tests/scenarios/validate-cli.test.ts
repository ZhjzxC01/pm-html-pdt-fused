import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("validate CLI", () => {
  it("校验最小示例项目状态且不写输出", async () => {
    const result = await execa("pnpm", [
      "tsx",
      "bin/pm-html-skill.ts",
      "validate",
      "--project",
      "examples/expense-approval/project-state.sample.json"
    ]);

    expect(result.stdout).toContain("校验通过");
  });
});
