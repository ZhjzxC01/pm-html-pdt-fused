import { createExpenseApprovalProjectState } from "../generators/expense-approval-state.js";
import { createGenericB2BProjectState, isExpenseApprovalInput } from "../generators/generic-b2b-state.js";
import type { ProjectState } from "../types/index.js";
import type { LLMProvider, LLMRequest, LLMResponse } from "./llm-provider.js";

export class MockLLMProvider implements LLMProvider {
  constructor(private readonly overrideContent?: string) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (this.overrideContent !== undefined) {
      return { content: this.overrideContent, model: "mock" };
    }

    const input = request.messages.at(-1)?.content ?? "";
    const now = new Date(0).toISOString();
    const state = isExpenseApprovalInput(input) ? createExpenseApprovalProjectState(now) : createGenericB2BProjectState(input, now);
    const artifact = resolveMockArtifact(input, state);

    return {
      model: "mock",
      content: JSON.stringify({
        id: `agent_result_${artifact.agentName.replace(/-/g, "_")}_mock`,
        agentName: artifact.agentName,
        inputHash: "mock-input-hash",
        output: artifact.output,
        assumptions: state.requirementCard?.assumptions ?? [],
        pendingQuestions: state.requirementCard?.pendingQuestions ?? [],
        warnings: []
      })
    };
  }
}

function resolveMockArtifact(input: string, state: ProjectState): { agentName: string; output: unknown } {
  if (input.includes("[Review Gate:")) {
    return mockReviewVerdict(input);
  }
  if (input.includes("prototype-spec-agent")) {
    return requireArtifact("prototype-spec-agent", state.prototypeSpec);
  }
  if (input.includes("html-prototype-agent")) {
    return requireArtifact("html-prototype-agent", state.htmlPrototype);
  }
  if (input.includes("prototype-meta-agent")) {
    return requireArtifact("prototype-meta-agent", state.prototypeMeta);
  }
  if (input.includes("flow-spec-agent")) {
    return requireArtifact("flow-spec-agent", state.flowSpec);
  }
  if (input.includes("complexity-assessor-agent")) {
    return { agentName: "complexity-assessor-agent", output: { level: "M", reasoning: "mock 复杂度评估：中等复杂度需求", factors: [], assessedAt: new Date(0).toISOString() } };
  }
  if (input.includes("prd-agent")) {
    return requireArtifact("prd-agent", state.prdSpec);
  }
  if (input.includes("test-case-agent")) {
    return requireArtifact("test-case-agent", state.testCaseSpec);
  }
  if (input.includes("prototype-annotation-agent")) {
    return requireArtifact("prototype-annotation-agent", state.prototypeAnnotationSpec);
  }

  return requireArtifact("requirement-structurer-agent", state.requirementCard);
}

function requireArtifact(agentName: string, output: unknown): { agentName: string; output: unknown } {
  if (!output) {
    throw new Error(`MockLLMProvider 无法生成 ${agentName} 输出。`);
  }

  return { agentName, output };
}

function mockReviewVerdict(input: string): { agentName: string; output: unknown } {
  const gateMatch = input.match(/\[Review Gate: (gate_\d+_\w+)/);
  const gate = gateMatch?.[1] ?? "gate_1_input";

  const roleMatch = input.match(/Role: (business-analyst|ux-designer|ui-designer|tech-architect|frontend-developer|qa-engineer)/);
  const roleId = roleMatch?.[1] ?? "business-analyst";

  const agentNameMap: Record<string, string> = {
    "business-analyst": "business-analyst-reviewer",
    "ux-designer": "ux-designer-reviewer",
    "ui-designer": "ui-designer-reviewer",
    "tech-architect": "tech-architect-reviewer",
    "frontend-developer": "frontend-developer-reviewer",
    "qa-engineer": "qa-engineer-reviewer"
  };

  return {
    agentName: agentNameMap[roleId] ?? "business-analyst-reviewer",
    output: {
      roleId,
      gate,
      approved: true,
      findings: [],
      summary: `Mock ${roleId} 审查通过，未发现明显问题。`
    }
  };
}
