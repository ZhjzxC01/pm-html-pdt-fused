import { prototypeMetaSchema } from "../schemas/project-state.schema.js";
import { mapPrototypeMetaAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runPrototypeMetaAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "prototype-meta-agent",
      promptName: "prototype-meta-generator",
      outputSchema: prototypeMetaSchema,
      mapToStep: mapPrototypeMetaAgentResultToGeneratorResult
    },
    options
  );
}
