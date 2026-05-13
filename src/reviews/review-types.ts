import { z } from "zod";
import type { ValidationIssue } from "../types/index.js";

export const reviewFindingSeveritySchema = z.enum(["critical", "warning", "suggestion"]);

export const reviewFindingSchema = z.object({
  severity: reviewFindingSeveritySchema,
  category: z.string().min(1),
  description: z.string().min(1),
  suggestedAction: z.string().optional()
});

export const roleVerdictSchema = z.object({
  roleId: z.string().min(1),
  gate: z.string().min(1),
  reasoning: z.string().optional(),
  approved: z.boolean(),
  findings: z.array(reviewFindingSchema),
  summary: z.string().min(1)
});

export const reviewGateResultSchema = z.object({
  gate: z.string().min(1),
  roleVerdicts: z.array(roleVerdictSchema),
  allApproved: z.boolean(),
  criticalFindings: z.array(reviewFindingSchema),
  guidance: z.string()
});

export type ReviewFindingSeverity = z.infer<typeof reviewFindingSeveritySchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type RoleVerdict = z.infer<typeof roleVerdictSchema>;
export type ReviewGateResult = z.infer<typeof reviewGateResultSchema>;

export type ReviewAgentResult = { ok: true; verdict: RoleVerdict } | { ok: false; issues: ValidationIssue[] };

export interface ReviewRoleConfig {
  roleId: string;
  agentName: string;
  roleName: string;
  systemPromptName: string;
  description: string;
}

export interface ReviewGateConfig {
  gate: string;
  name: string;
  description: string;
  roleIds: string[];
}
