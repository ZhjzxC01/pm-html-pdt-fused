import { prdSpecSchema } from "../schemas/project-state.schema.js";
import { mapPrdAgentResultToGeneratorResult } from "./agent-output-mapper.js";
import { runArtifactAgent, type ArtifactAgentOptions, type ArtifactAgentResult } from "./artifact-agent-runner.js";

export interface PrdAgentOptions extends ArtifactAgentOptions {
  requirementLevel?: string;
}

export function runPrdAgent(input: string, options: PrdAgentOptions = {}): Promise<ArtifactAgentResult> {
  const levelTag = options.requirementLevel ? `[需求级别: ${options.requirementLevel}]\n\n` : "";
  return runArtifactAgent(
    `${levelTag}${input}`,
    {
      agentName: "prd-agent",
      promptName: "prd-generator",
      outputSchema: prdSpecSchema,
      mapToStep: mapPrdAgentResultToGeneratorResult
    },
    options
  );
}
