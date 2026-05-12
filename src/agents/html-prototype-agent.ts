import { htmlPrototypeSchema } from "../schemas/project-state.schema.js";
import { mapHtmlPrototypeAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export function runHtmlPrototypeAgent(input: string, options: ArtifactAgentOptions = {}): Promise<ArtifactAgentResult> {
  return runArtifactAgent(
    input,
    {
      agentName: "html-prototype-agent",
      promptName: "html-prototype-generator",
      outputSchema: htmlPrototypeSchema,
      mapToStep: mapHtmlPrototypeAgentResultToGeneratorResult
    },
    options
  );
}
