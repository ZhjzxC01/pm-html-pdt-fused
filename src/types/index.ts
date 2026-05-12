import type { z } from "zod";
import type {
  artifactManifestItemSchema,
  artifactManifestSchema,
  businessObjectSchema,
  changeLogItemSchema,
  complexityAssessmentSchema,
  complexityFactorSchema,
  consistencyIssueSchema,
  dirtyPolicySchema,
  entityRefSchema,
  entityTypeSchema,
  featureSchema,
  fileArtifactTypeSchema,
  flowSpecSchema,
  goalSchema,
  htmlPrototypeSchema,
  pageActionSchema,
  pageModuleSchema,
  pageSpecSchema,
  patchEnvelopeSchema,
  patchSourceSchema,
  prdSpecSchema,
  projectStateSchema,
  prototypeAnnotationSpecSchema,
  prototypeMetaSchema,
  prototypeSpecSchema,
  renderOutcomeSchema,
  renderResultSchema,
  requirementCardSchema,
  requirementLevelSchema,
  roleSchema,
  scenarioSchema,
  stateArtifactTypeSchema,
  supportedJsonPatchOperationSchema,
  testCaseSpecSchema,
  traceLinkSchema,
  traceabilityMatrixSchema,
  validationIssueSchema,
  validationProfileSchema,
  validationResultSchema
} from "../schemas/project-state.schema.js";

export interface EntityCollection<T extends { id: string }> {
  byId: Record<string, T>;
  order: string[];
}

export type StateArtifactType = z.infer<typeof stateArtifactTypeSchema>;
export type FileArtifactType = z.infer<typeof fileArtifactTypeSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
export type EntityRef = z.infer<typeof entityRefSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Role = z.infer<typeof roleSchema>;
export type BusinessObject = z.infer<typeof businessObjectSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type RequirementCard = z.infer<typeof requirementCardSchema>;
export type RequirementLevel = z.infer<typeof requirementLevelSchema>;
export type ComplexityFactor = z.infer<typeof complexityFactorSchema>;
export type ComplexityAssessment = z.infer<typeof complexityAssessmentSchema>;
export type PrototypeSpec = z.infer<typeof prototypeSpecSchema>;
export type PageSpec = z.infer<typeof pageSpecSchema>;
export type PageModule = z.infer<typeof pageModuleSchema>;
export type PageAction = z.infer<typeof pageActionSchema>;
export type HTMLPrototype = z.infer<typeof htmlPrototypeSchema>;
export type PrototypeMeta = z.infer<typeof prototypeMetaSchema>;
export type FlowSpec = z.infer<typeof flowSpecSchema>;
export type PRDSpec = z.infer<typeof prdSpecSchema>;
export type TestCaseSpec = z.infer<typeof testCaseSpecSchema>;
export type PrototypeAnnotationSpec = z.infer<typeof prototypeAnnotationSpecSchema>;
export type ArtifactManifest = z.infer<typeof artifactManifestSchema>;
export type ArtifactManifestItem = z.infer<typeof artifactManifestItemSchema>;
export type PatchSource = z.infer<typeof patchSourceSchema>;
export type SupportedJsonPatchOperation = z.infer<typeof supportedJsonPatchOperationSchema>;
export type DirtyPolicy = z.infer<typeof dirtyPolicySchema>;
export type PatchEnvelope = z.infer<typeof patchEnvelopeSchema>;
export type ValidationProfile = z.infer<typeof validationProfileSchema>;
export type ChangeLogItem = z.infer<typeof changeLogItemSchema>;
export type TraceLink = z.infer<typeof traceLinkSchema>;
export type TraceabilityMatrix = z.infer<typeof traceabilityMatrixSchema>;
export type ConsistencyIssue = z.infer<typeof consistencyIssueSchema>;
export type ProjectState = z.infer<typeof projectStateSchema>;
export type RenderResult = z.infer<typeof renderResultSchema>;
export type RenderOutcome = z.infer<typeof renderOutcomeSchema>;
