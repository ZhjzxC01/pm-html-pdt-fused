import { complexityAssessmentSchema } from "../schemas/project-state.schema.js";
import { mapComplexityAssessmentAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runComplexityAssessorAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "complexity-assessor-agent",
      promptName: "complexity-assessor",
      outputSchema: complexityAssessmentSchema,
      mapToStep: mapComplexityAssessmentAgentResultToGeneratorResult
    },
    options
  );
}
