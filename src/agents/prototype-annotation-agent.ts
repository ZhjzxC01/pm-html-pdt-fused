import { prototypeAnnotationSpecSchema } from "../schemas/project-state.schema.js";
import { mapPrototypeAnnotationAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runPrototypeAnnotationAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "prototype-annotation-agent",
      promptName: "prototype-annotation-generator",
      outputSchema: prototypeAnnotationSpecSchema,
      mapToStep: mapPrototypeAnnotationAgentResultToGeneratorResult
    },
    options
  );
}
