import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { runComplexityAssessorAgent } from "../agents/complexity-assessor-agent.js";
import { runFlowSpecAgent } from "../agents/flow-spec-agent.js";
import { runHtmlPrototypeAgent } from "../agents/html-prototype-agent.js";
import { runPrdAgent } from "../agents/prd-agent.js";
import { runPrototypeAnnotationAgent } from "../agents/prototype-annotation-agent.js";
import { runPrototypeMetaAgent } from "../agents/prototype-meta-agent.js";
import { runPrototypeSpecAgent } from "../agents/prototype-spec-agent.js";
import { runRequirementStructurerAgent } from "../agents/requirement-structurer-agent.js";
import { runTestCaseAgent } from "../agents/test-case-agent.js";
import { buildPatchId, mergeTraceLinkDrafts, type GeneratorResult } from "../generators/generator-result.js";
import { generateFlowSpec } from "../generators/flow-spec-generator.js";
import { generateHtmlPrototype } from "../generators/html-prototype-generator.js";
import { generatePrdSpec } from "../generators/prd-generator.js";
import { generatePrototypeAnnotationSpec } from "../generators/prototype-annotation-generator.js";
import { generatePrototypeMeta } from "../generators/prototype-meta-generator.js";
import { generatePrototypeSpec } from "../generators/prototype-spec-generator.js";
import { generateRequirementCard } from "../generators/requirement-structurer.js";
import { generateTestCaseSpec } from "../generators/test-case-generator.js";
import { createGenericB2BProjectState, isExpenseApprovalInput } from "../generators/generic-b2b-state.js";
import { createExpenseApprovalProjectState } from "../generators/expense-approval-state.js";
import type { LLMProvider } from "../llm/llm-provider.js";
import { checkLLMAvailability } from "../llm/llm-provider-factory.js";
import { runReviewGate } from "../reviews/review-gate-runner.js";
import { formatGuidance } from "../reviews/review-pipeline.js";
import { applyPatchEnvelope } from "../state/patch-manager.js";
import { createEmptyProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { ValidationIssue } from "../types/index.js";
import { commitRender, prepareRender } from "./render-pipeline.js";

export type GenerateMode = "rule" | "llm" | "auto";

export type GenerateResult =
  | { ok: true; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[]; fallbackWarnings?: ValidationIssue[] };

export async function generateFromInput(
  inputPath: string,
  options: { mode?: GenerateMode; llmProvider?: LLMProvider; review?: boolean; strict?: boolean } = {}
): Promise<GenerateResult> {
  const mode = options.mode ?? "llm";
  const input = await readFile(inputPath, "utf8");
  if (!input.trim()) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_empty_generation_input",
          severity: "error",
          code: "empty_generation_input",
          message: "需求输入为空，请提供一段中文 B 端产品需求。"
        }
      ]
    };
  }

  if (mode === "rule") {
    return generateWithRuleInput(inputPath, input);
  }

  if (mode === "auto" && options.llmProvider) {
    const available = await checkLLMAvailability(options.llmProvider);
    if (!available) {
      console.warn("LLM 服务不可用，auto 模式自动回退到规则版生成。");
      return generateWithRuleInput(inputPath, input);
    }
  }

  const llmResult = await generateWithLlmRequirement(inputPath, input, options.llmProvider, { review: options.review, strict: options.strict });
  if (llmResult.ok || mode === "llm") {
    return llmResult;
  }

  const ruleResult = await generateWithRuleInput(inputPath, input);
  if (!ruleResult.ok) {
    return { ...ruleResult, fallbackWarnings: llmResult.issues };
  }

  return {
    ok: true,
    warnings: [
      ...ruleResult.warnings,
      {
        id: "issue_llm_generation_fallback_to_rule",
        severity: "warning",
        code: "llm_generation_fallback_to_rule",
        message: `LLM 生成失败，已 fallback 到规则版：${llmResult.issues.map((issue) => issue.message).join("；")}`
      }
    ]
  };
}

async function generateWithRuleInput(inputPath: string, input: string): Promise<GenerateResult> {
  return generateWithSteps(inputPath, input, "rule");
}

async function generateWithLlmRequirement(inputPath: string, input: string, provider?: LLMProvider, reviewOptions?: { review?: boolean; strict?: boolean }): Promise<GenerateResult> {
  return generateWithSteps(inputPath, input, "llm", provider, reviewOptions);
}

async function generateWithSteps(
  inputPath: string,
  input: string,
  mode: "rule" | "llm",
  provider?: LLMProvider,
  reviewOptions?: { review?: boolean; strict?: boolean }
): Promise<GenerateResult> {

  const projectRoot = path.dirname(inputPath);
  await mkdir(path.join(projectRoot, "output"), { recursive: true });

  const now = new Date().toISOString();
  const fullState = isExpenseApprovalInput(input) ? createExpenseApprovalProjectState(now) : createGenericB2BProjectState(input, now);
  let workingState = createEmptyProjectState(fullState.name, now);
  const stepsResult = mode === "llm" ? await buildLlmSteps(input, provider, reviewOptions) : buildRuleSteps(now, fullState);
  if (!stepsResult.ok) {
    return { ok: false, issues: stepsResult.issues };
  }

  for (const step of stepsResult.steps) {
    const patches = [...step.patches];
    if (step.traceLinks.length > 0) {
      patches.push({
        op: "replace",
        path: "/traceability",
        value: mergeTraceLinkDrafts(workingState.traceability, step.traceLinks)
      });
    }

    const result = applyPatchEnvelope(workingState, {
      id: buildPatchId(step.source, workingState),
      projectId: workingState.id,
      baseVersion: workingState.version,
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
    if (!result.ok) {
      return { ok: false, issues: result.issues };
    }
    workingState = result.state;
  }

  const preparedRender = await prepareRender(workingState, projectRoot, "all");
  if (!preparedRender.ok) {
    return { ok: false, issues: preparedRender.issues };
  }

  const manifestPatched = applyPatchEnvelope(workingState, preparedRender.prepared.manifestPatchEnvelope);
  if (!manifestPatched.ok) {
    await rm(preparedRender.prepared.tempOutputDir, { recursive: true, force: true });
    return { ok: false, issues: manifestPatched.issues };
  }

  await commitRender(preparedRender.prepared);
  await saveProjectState(path.join(projectRoot, "project-state.json"), manifestPatched.state);
  return { ok: true, warnings: [] };
}

function buildRuleSteps(now: string, fullState: ReturnType<typeof createExpenseApprovalProjectState>): { ok: true; steps: GeneratorResult[] } {
  return {
    ok: true,
    steps: [
      generateRequirementCard(now, fullState),
      generatePrototypeSpec(now, fullState),
      generateHtmlPrototype(now, fullState),
      generatePrototypeMeta(now, fullState),
      generateFlowSpec(now, fullState),
      generatePrdSpec(now, fullState),
      generateTestCaseSpec(now, fullState),
      generatePrototypeAnnotationSpec(now, fullState)
    ]
  };
}

async function buildLlmSteps(
  input: string,
  provider?: LLMProvider,
  reviewOptions?: { review?: boolean; strict?: boolean }
): Promise<{ ok: true; steps: GeneratorResult[] } | { ok: false; issues: ValidationIssue[] }> {
  const options = { provider };
  const reviewEnabled = reviewOptions?.review ?? false;
  const strictMode = reviewOptions?.strict ?? false;

  // Gate 1: Review raw input before any generation
  let guidance1 = "";
  if (reviewEnabled) {
    const gate1 = await runReviewGate("gate_1_input", input, options);
    guidance1 = formatGuidance(gate1);
    if (strictMode && gate1.criticalFindings.length > 0) {
      return { ok: false, issues: gate1.criticalFindings.map((f, i) => ({ id: `issue_review_gate1_${i + 1}`, severity: "error" as const, code: "review_critical_finding", message: f.description })) };
    }
  }
  const inputWithGuidance1 = guidance1 ? `${input}\n\n${guidance1}` : input;

  // Tier 1: two independent agents in parallel
  const [requirementResult, complexityResult] = await Promise.all([
    runRequirementStructurerAgent(inputWithGuidance1, options),
    runComplexityAssessorAgent(inputWithGuidance1, options)
  ]);

  if (!requirementResult.ok) {
    return { ok: false, issues: requirementResult.issues };
  }
  if (!complexityResult.ok) {
    return { ok: false, issues: complexityResult.issues };
  }

  const complexityStep = complexityResult.step;
  const requirementLevel = extractRequirementLevel(complexityStep);

  // Gate 2: Review requirement + complexity before prototype generation
  let guidance2 = "";
  if (reviewEnabled) {
    const tier1Context = JSON.stringify({ requirement: requirementResult.step.patches, complexity: complexityStep.patches });
    const gate2 = await runReviewGate("gate_2_requirements", `${input}\n\n${tier1Context}`, options);
    guidance2 = formatGuidance(gate2);
    if (strictMode && gate2.criticalFindings.length > 0) {
      return { ok: false, issues: gate2.criticalFindings.map((f, i) => ({ id: `issue_review_gate2_${i + 1}`, severity: "error" as const, code: "review_critical_finding", message: f.description })) };
    }
  }
  const inputWithGuidance2 = guidance2 ? `${input}\n\n${guidance2}` : input;

  // Tier 2: 5 independent agents in parallel (testCase runs after prd, mirrors rule pipeline order)
  const [tier2a, tier2b] = await Promise.all([
    Promise.all([
      runPrototypeSpecAgent(inputWithGuidance2, options),
      runHtmlPrototypeAgent(inputWithGuidance2, options),
      runPrototypeMetaAgent(inputWithGuidance2, options)
    ]),
    Promise.all([
      runFlowSpecAgent(inputWithGuidance2, options),
      runPrototypeAnnotationAgent(inputWithGuidance2, options)
    ])
  ]);

  // Check tier 2 results before proceeding
  for (const result of [...tier2a, ...tier2b]) {
    if (!result.ok) {
      return { ok: false, issues: result.issues };
    }
  }
  type OkStep = { ok: true; step: GeneratorResult };
  const t2a = tier2a as [OkStep, OkStep, OkStep];
  const t2b = tier2b as [OkStep, OkStep];

  // Gate 3: Review prototypeSpec + flowSpec
  let guidance3 = "";
  if (reviewEnabled) {
    const prototypeContext = JSON.stringify({ prototypeSpec: t2a[0].step.patches, flowSpec: t2b[0].step.patches });
    const gate3 = await runReviewGate("gate_3_prototype", `${input}\n\n${prototypeContext}`, options);
    guidance3 = formatGuidance(gate3);
    if (strictMode && gate3.criticalFindings.length > 0) {
      return { ok: false, issues: gate3.criticalFindings.map((f, i) => ({ id: `issue_review_gate3_${i + 1}`, severity: "error" as const, code: "review_critical_finding", message: f.description })) };
    }
  }

  // Gate 4: Review htmlPrototype + prototypeAnnotationSpec
  let guidance4 = "";
  if (reviewEnabled) {
    const htmlContext = JSON.stringify({ htmlPrototype: t2a[1].step.patches, prototypeAnnotationSpec: t2b[1].step.patches });
    const gate4 = await runReviewGate("gate_4_html_annotation", `${input}\n\n${htmlContext}`, options);
    guidance4 = formatGuidance(gate4);
    if (strictMode && gate4.criticalFindings.length > 0) {
      return { ok: false, issues: gate4.criticalFindings.map((f, i) => ({ id: `issue_review_gate4_${i + 1}`, severity: "error" as const, code: "review_critical_finding", message: f.description })) };
    }
  }

  // Gate 5: Review before PRD generation
  let guidance5 = "";
  if (reviewEnabled) {
    const allContext = JSON.stringify([...t2a, ...t2b].map((r) => r.step.patches));
    const gate5 = await runReviewGate("gate_5_prd", `${input}\n\n${allContext}`, options);
    guidance5 = formatGuidance(gate5);
    if (strictMode && gate5.criticalFindings.length > 0) {
      return { ok: false, issues: gate5.criticalFindings.map((f, i) => ({ id: `issue_review_gate5_${i + 1}`, severity: "error" as const, code: "review_critical_finding", message: f.description })) };
    }
  }
  const inputForPrd = [input, guidance3, guidance4, guidance5].filter(Boolean).join("\n\n");

  // prdAgent requires requirementLevel from tier 1
  const prdResult = await runPrdAgent(inputForPrd, { ...options, requirementLevel });
  if (!prdResult.ok) {
    return { ok: false, issues: prdResult.issues };
  }

  // testCase runs after prd (mirrors rule pipeline: prdSpec → testCaseSpec)
  const testCaseResult = await runTestCaseAgent(inputForPrd, options);
  if (!testCaseResult.ok) {
    return { ok: false, issues: testCaseResult.issues };
  }

  const steps: GeneratorResult[] = [requirementResult.step, complexityStep, t2a[0].step, t2a[1].step, t2a[2].step, t2b[0].step, t2b[1].step, prdResult.step, testCaseResult.step];

  return { ok: true, steps };
}

function extractRequirementLevel(step: GeneratorResult): string {
  for (const patch of step.patches) {
    if (patch.path === "/complexityAssessment" && patch.op === "replace") {
      const assessment = patch.value as { level?: string } | undefined;
      if (assessment?.level) {
        return assessment.level;
      }
    }
  }
  return "M";
}
