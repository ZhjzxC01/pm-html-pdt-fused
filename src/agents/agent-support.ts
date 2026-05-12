import type { z } from "zod";
import { assumptionSchema, pendingQuestionSchema } from "../schemas/project-state.schema.js";

export type Assumption = z.infer<typeof assumptionSchema>;
export type PendingQuestion = z.infer<typeof pendingQuestionSchema>;
