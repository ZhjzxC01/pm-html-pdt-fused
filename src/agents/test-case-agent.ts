import { testCaseSpecSchema } from "../schemas/project-state.schema.js";
import { mapTestCaseAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runTestCaseAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "test-case-agent",
      promptName: "test-case-generator",
      outputSchema: testCaseSpecSchema,
      mapToStep: mapTestCaseAgentResultToGeneratorResult
    },
    options
  );
}
