import { describe, expect, it } from "vitest";
import { generateFlowSpec } from "../../src/generators/flow-spec-generator.js";
import { type GeneratorResult, mergeTraceLinkDrafts } from "../../src/generators/generator-result.js";
import { generateHtmlPrototype } from "../../src/generators/html-prototype-generator.js";
import { generatePrdSpec } from "../../src/generators/prd-generator.js";
import { generatePrototypeAnnotationSpec } from "../../src/generators/prototype-annotation-generator.js";
import { generatePrototypeMeta } from "../../src/generators/prototype-meta-generator.js";
import { generatePrototypeSpec } from "../../src/generators/prototype-spec-generator.js";
import { generateRequirementCard } from "../../src/generators/requirement-structurer.js";
import { generateTestCaseSpec } from "../../src/generators/test-case-generator.js";
import { applyPatchEnvelope } from "../../src/state/patch-manager.js";
import { createEmptyProjectState } from "../../src/state/project-state-manager.js";
import type { ProjectState, SupportedJsonPatchOperation } from "../../src/types/index.js";

const now = "2026-04-26T00:00:00.000Z";

const generatorSteps = [
  ["需求结构化生成器", generateRequirementCard],
  ["原型规格生成器", generatePrototypeSpec],
  ["HTML 原型生成器", generateHtmlPrototype],
  ["原型元数据生成器", generatePrototypeMeta],
  ["流程规格生成器", generateFlowSpec],
  ["PRD 生成器", generatePrdSpec],
  ["测试用例生成器", generateTestCaseSpec],
  ["原型标注生成器", generatePrototypeAnnotationSpec]
] as const;

describe("规则生成器", () => {
  it.each(generatorSteps)("%s 返回结构化补丁和 TraceLinkDraft[]，且不写文件", (_name, generate) => {
    const result = generate(now);

    expect(result.patches.length).toBeGreaterThan(0);
    expect(Array.isArray(result.traceLinks)).toBe(true);
    expect(result.patches.every((patch) => patch.path.startsWith("/"))).toBe(true);
    expect(result.patches.some((patch) => patch.path.startsWith("/artifactManifest"))).toBe(false);
  });

  it("将 TraceLinkDraft[] 合并到生成产物所在的同一个 PatchEnvelope", () => {
    const initialState = createEmptyProjectState("expense-approval", now);
    const step = generatePrototypeSpec(now);
    const patched = applyGeneratorStep(initialState, step);

    expect(step.traceLinks.length).toBeGreaterThan(0);
    expect(patched.traceability.links.map((link) => link.id)).toEqual(step.traceLinks.map((link) => link.id));
    expect(patched.changeLog.at(-1)?.patches.map((patch) => patch.path)).toEqual(["/prototypeSpec", "/traceability"]);
  });

  it("按顺序应用所有生成器并通过对应校验 profile", () => {
    let state = createEmptyProjectState("expense-approval", now);

    for (const [, generate] of generatorSteps) {
      state = applyGeneratorStep(state, generate(now));
    }

    expect(state.requirementCard?.id).toBe("requirement_expense_approval");
    expect(state.prototypeSpec?.pages.order.length).toBeGreaterThan(0);
    expect(state.htmlPrototype?.files.byId.html_index?.content).toContain("费用报销");
    expect(state.prototypeMeta?.pageMappings.length).toBeGreaterThan(0);
    expect(state.flowSpec?.stateMachines.order.length).toBeGreaterThan(0);
    expect(state.prdSpec?.sections.order.length).toBeGreaterThan(0);
    expect(totalTestCases(state)).toBeGreaterThanOrEqual(6);
    expect(state.prototypeAnnotationSpec?.annotations.order.length).toBeGreaterThanOrEqual(4);
    expect(state.traceability.links.length).toBeGreaterThan(0);
  });
});

function applyGeneratorStep(state: ProjectState, step: GeneratorResult): ProjectState {
  const patches: SupportedJsonPatchOperation[] = [...step.patches];
  if (step.traceLinks.length > 0) {
    patches.push({
      op: "replace",
      path: "/traceability",
      value: mergeTraceLinkDrafts(state.traceability, step.traceLinks)
    });
  }

  const result = applyPatchEnvelope(state, {
    id: `patch_${step.source}_${state.version + 1}`,
    projectId: state.id,
    baseVersion: state.version,
    source: step.source,
    reason: step.reason,
    patches,
    transaction: { atomic: true, mode: "all_or_nothing" },
    dirtyPolicy: {
      clear: step.clear,
      mark: step.mark,
      useDependencyPropagation: true
    },
    validationProfile: step.validationProfile
  });

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join("\n"));
  }
  return result.state;
}

function totalTestCases(state: ProjectState): number {
  return Object.values(state.testCaseSpec?.testSuites.byId ?? {}).reduce(
    (count, suite) => count + suite.cases.order.length,
    0
  );
}
