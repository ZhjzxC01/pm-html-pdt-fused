import { prototypeSpecSchema } from "../schemas/project-state.schema.js";
import { mapPrototypeSpecAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runPrototypeSpecAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "prototype-spec-agent",
      promptName: "prototype-spec-generator",
      outputSchema: prototypeSpecSchema,
      mapToStep: mapPrototypeSpecAgentResultToGeneratorResult
    },
    options
  );
}
