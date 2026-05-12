import { requirementCardSchema } from "../schemas/project-state.schema.js";
import { mapRequirementAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export type RequirementStructurerAgentResult = ArtifactAgentResult;
export type RequirementStructurerAgentOptions = ArtifactAgentOptions;

export async function runRequirementStructurerAgent(
  input: string,
  options: RequirementStructurerAgentOptions = {}
): Promise<RequirementStructurerAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "requirement-structurer-agent",
      promptName: "requirement-structurer",
      outputSchema: requirementCardSchema,
      mapToStep: mapRequirementAgentResultToGeneratorResult
    },
    options
  );
}
