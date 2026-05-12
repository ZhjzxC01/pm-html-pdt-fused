import type { Assumption, PendingQuestion } from "./agent-support.js";

export interface AgentResult<T> {
  id: string;
  agentName: string;
  inputHash: string;
  output: T;
  assumptions: Assumption[];
  pendingQuestions: PendingQuestion[];
  warnings: string[];
}
