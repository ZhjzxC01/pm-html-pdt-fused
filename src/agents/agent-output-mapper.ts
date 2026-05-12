import type { GeneratorResult } from "../generators/generator-result.js";
import { replaceArtifact } from "../generators/generator-result.js";
import type {
  ComplexityAssessment,
  FlowSpec,
  HTMLPrototype,
  PRDSpec,
  PrototypeAnnotationSpec,
  PrototypeMeta,
  PrototypeSpec,
  RequirementCard,
  TestCaseSpec
} from "../types/index.js";
import type { AgentResult } from "./agent-result.js";

export function mapRequirementAgentResultToGeneratorResult(result: AgentResult<RequirementCard>): GeneratorResult {
  return replaceArtifact(
    "requirement_generation",
    `LLM 生成需求卡：${result.id}`,
    "/requirementCard",
    result.output,
    ["requirementCard"],
    ["prototypeSpec", "htmlPrototype", "prototypeMeta", "flowSpec", "complexityAssessment", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_requirement"
  );
}

export function mapPrototypeSpecAgentResultToGeneratorResult(result: AgentResult<PrototypeSpec>): GeneratorResult {
  return replaceArtifact(
    "prototype_spec_generation",
    `LLM 生成原型结构：${result.id}`,
    "/prototypeSpec",
    result.output,
    ["prototypeSpec"],
    ["htmlPrototype", "prototypeMeta", "flowSpec", "complexityAssessment", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_prototype_spec"
  );
}

export function mapHtmlPrototypeAgentResultToGeneratorResult(result: AgentResult<HTMLPrototype>): GeneratorResult {
  return replaceArtifact(
    "html_prototype_generation",
    `LLM 生成 HTML 原型：${result.id}`,
    "/htmlPrototype",
    result.output,
    ["htmlPrototype"],
    ["prototypeMeta", "prototypeAnnotationSpec", "issues"],
    "generation_html"
  );
}

export function mapPrototypeMetaAgentResultToGeneratorResult(result: AgentResult<PrototypeMeta>): GeneratorResult {
  return replaceArtifact(
    "prototype_meta_generation",
    `LLM 生成 DOM 映射：${result.id}`,
    "/prototypeMeta",
    result.output,
    ["prototypeMeta"],
    ["prototypeAnnotationSpec", "issues"],
    "generation_meta"
  );
}

export function mapFlowSpecAgentResultToGeneratorResult(result: AgentResult<FlowSpec>): GeneratorResult {
  return replaceArtifact(
    "flow_generation",
    `LLM 生成流程与状态机：${result.id}`,
    "/flowSpec",
    result.output,
    ["flowSpec"],
    ["complexityAssessment", "prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_flow"
  );
}

export function mapComplexityAssessmentAgentResultToGeneratorResult(result: AgentResult<ComplexityAssessment>): GeneratorResult {
  return replaceArtifact(
    "complexity_assessment",
    `LLM 评估需求复杂度：${result.output.level} 级`,
    "/complexityAssessment",
    result.output,
    ["complexityAssessment"],
    ["prdSpec", "testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_complexity"
  );
}

export function mapPrdAgentResultToGeneratorResult(result: AgentResult<PRDSpec>): GeneratorResult {
  return replaceArtifact(
    "prd_generation",
    `LLM 生成 PRD 结构：${result.id}`,
    "/prdSpec",
    result.output,
    ["prdSpec"],
    ["testCaseSpec", "prototypeAnnotationSpec", "issues"],
    "generation_prd"
  );
}

export function mapTestCaseAgentResultToGeneratorResult(result: AgentResult<TestCaseSpec>): GeneratorResult {
  return replaceArtifact(
    "test_case_generation",
    `LLM 生成测试用例：${result.id}`,
    "/testCaseSpec",
    result.output,
    ["testCaseSpec"],
    ["prototypeAnnotationSpec", "issues"],
    "generation_test_case"
  );
}

export function mapPrototypeAnnotationAgentResultToGeneratorResult(
  result: AgentResult<PrototypeAnnotationSpec>
): GeneratorResult {
  return replaceArtifact(
    "prototype_annotation_generation",
    `LLM 生成原型 PRD 标注：${result.id}`,
    "/prototypeAnnotationSpec",
    result.output,
    ["prototypeAnnotationSpec"],
    ["issues"],
    "generation_annotation"
  );
}
