import { flowSpecSchema } from "../schemas/project-state.schema.js";
import { mapFlowSpecAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runFlowSpecAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "flow-spec-agent",
      promptName: "flow-spec-generator",
      outputSchema: flowSpecSchema,
      mapToStep: mapFlowSpecAgentResultToGeneratorResult
    },
    options
  );
}
