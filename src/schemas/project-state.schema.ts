import { z } from "zod";

export const stateArtifactTypeSchema = z.enum([
  "requirementCard",
  "prototypeSpec",
  "htmlPrototype",
  "prototypeMeta",
  "flowSpec",
  "complexityAssessment",
  "prdSpec",
  "testCaseSpec",
  "prototypeAnnotationSpec",
  "artifactManifest",
  "issues"
]);

export const fileArtifactTypeSchema = z.enum([
  "prototype_spec_json",
  "prototype_meta_json",
  "html_prototype",
  "prd_markdown",
  "prototype_annotation_json",
  "prototype_review_html",
  "test_cases_markdown",
  "gherkin_feature",
  "flow_mermaid",
  "consistency_report"
]);

export const entityTypeSchema = z.enum([
  "goal",
  "role",
  "business_object",
  "scenario",
  "feature",
  "acceptance_criterion",
  "page",
  "module",
  "field",
  "action",
  "permission",
  "ui_state",
  "business_state",
  "state_transition",
  "flow",
  "prd_section",
  "test_case",
  "prototype_annotation"
]);

export const prioritySchema = z.enum(["P0", "P1", "P2"]);
export const severitySchema = z.enum(["error", "warning", "info"]);

export const entityRefSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().min(1)
});

export const validationIssueSchema = z.object({
  id: z.string().min(1),
  severity: severitySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  entityRef: entityRefSchema.optional(),
  path: z.string().optional(),
  fixSuggestion: z.string().optional()
});

export const validationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(validationIssueSchema)
});

export function entityCollectionSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    byId: z.record(itemSchema),
    order: z.array(z.string())
  });
}

export const goalSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  priority: prioritySchema
});

export const roleSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string()
});

export const businessObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  keyFields: z.array(z.string())
});

export const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  relatedRoleIds: z.array(z.string())
});

export const assumptionSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  confidence: z.enum(["high", "medium", "low"])
});

export const pendingQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string(),
  reason: z.string(),
  required: z.boolean()
});

export const riskSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  mitigation: z.string().optional()
});

export const acceptanceCriterionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  priority: prioritySchema,
  relatedFeatureIds: z.array(z.string()),
  relatedPageIds: z.array(z.string()),
  relatedActionIds: z.array(z.string()),
  relatedStateIds: z.array(z.string()).optional(),
  relatedUiStateIds: z.array(z.string()).optional(),
  testable: z.boolean()
});

export const featureSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  priority: prioritySchema,
  relatedRoleIds: z.array(z.string()),
  relatedScenarioIds: z.array(z.string()),
  acceptanceCriteria: entityCollectionSchema(acceptanceCriterionSchema)
});

export const requirementCardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sourceType: z.enum(["free_text", "meeting", "chat", "feedback", "old_prd"]),
  businessDomain: z.string().optional(),
  background: z.string(),
  problemStatement: z.string(),
  goals: entityCollectionSchema(goalSchema),
  roles: entityCollectionSchema(roleSchema),
  businessObjects: entityCollectionSchema(businessObjectSchema),
  scenarios: entityCollectionSchema(scenarioSchema),
  features: entityCollectionSchema(featureSchema),
  inScope: z.array(z.string()),
  outOfScope: z.array(z.string()),
  assumptions: z.array(assumptionSchema),
  pendingQuestions: z.array(pendingQuestionSchema),
  risks: z.array(riskSchema)
});

export const fieldValidationRuleSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["required", "min", "max", "regex", "custom"]),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string()
});

export const fieldSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  fieldKey: z.string(),
  type: z.enum([
    "text",
    "number",
    "money",
    "date",
    "datetime",
    "select",
    "multi_select",
    "textarea",
    "file",
    "user",
    "department",
    "status"
  ]),
  required: z.boolean(),
  readonly: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validationRules: z.array(fieldValidationRuleSchema).optional()
});

export const tableColumnSpecSchema = z.object({
  id: z.string().min(1),
  fieldId: z.string(),
  title: z.string(),
  width: z.number().optional(),
  fixed: z.enum(["left", "right"]).optional()
});

type PageModuleSchemaShape = {
  id: string;
  name: string;
  type:
    | "filter"
    | "table"
    | "form"
    | "detail_card"
    | "tabs"
    | "steps"
    | "approval_panel"
    | "log_timeline"
    | "empty_state"
    | "exception_state";
  fields: { byId: Record<string, z.infer<typeof fieldSpecSchema>>; order: string[] };
  tableColumns?: { byId: Record<string, z.infer<typeof tableColumnSpecSchema>>; order: string[] };
  childModules?: { byId: Record<string, PageModuleSchemaShape>; order: string[] };
  sourceRefs: z.infer<typeof entityRefSchema>[];
};

export const pageModuleSchema: z.ZodType<PageModuleSchemaShape> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string(),
    type: z.enum([
      "filter",
      "table",
      "form",
      "detail_card",
      "tabs",
      "steps",
      "approval_panel",
      "log_timeline",
      "empty_state",
      "exception_state"
    ]),
    fields: entityCollectionSchema(fieldSpecSchema),
    tableColumns: entityCollectionSchema(tableColumnSpecSchema).optional(),
    childModules: entityCollectionSchema(pageModuleSchema).optional(),
    sourceRefs: z.array(entityRefSchema)
  })
);

export const pageActionSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum([
    "create",
    "edit",
    "delete",
    "submit",
    "approve",
    "reject",
    "withdraw",
    "export",
    "import",
    "batch",
    "view",
    "search",
    "reset"
  ]),
  placement: z.enum(["toolbar", "row", "form_footer", "drawer_footer", "modal_footer"]),
  triggerComponent: z.enum(["button", "link", "icon_button", "dropdown_item"]),
  priority: prioritySchema,
  targetPageId: z.string().optional(),
  targetModuleId: z.string().optional(),
  stateTransitionId: z.string().optional(),
  permissionRuleIds: z.array(z.string()),
  sourceRefs: z.array(entityRefSchema)
});

export const roleVisibilitySchema = z.object({
  roleId: z.string(),
  visible: z.boolean(),
  reason: z.string().optional()
});

export const pageUiStateSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["normal", "loading", "empty", "error", "no_permission"]),
  name: z.string(),
  description: z.string()
});

export const pageLayoutSpecSchema = z.object({
  layoutType: z.enum(["sidebar_content", "top_nav_content", "single_panel", "dashboard_grid"]),
  density: z.enum(["comfortable", "compact"]),
  primaryRegion: z.string(),
  secondaryRegions: z.array(z.string())
});

export const pageSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(["list", "detail", "create", "edit", "approval", "config", "dashboard", "log"]),
  goal: z.string(),
  routePath: z.string(),
  layout: pageLayoutSpecSchema,
  modules: entityCollectionSchema(pageModuleSchema),
  actions: entityCollectionSchema(pageActionSchema),
  uiStates: entityCollectionSchema(pageUiStateSchema),
  roleVisibility: z.array(roleVisibilitySchema),
  sourceRefs: z.array(entityRefSchema)
});

export const navigationEdgeSchema = z.object({
  id: z.string().min(1),
  fromPageId: z.string(),
  toPageId: z.string(),
  triggerActionId: z.string().optional(),
  description: z.string()
});

export const permissionRuleSchema = z.object({
  id: z.string().min(1),
  roleId: z.string(),
  targetType: z.enum(["page", "module", "field", "action", "data"]),
  targetId: z.string(),
  effect: z.enum(["allow", "deny", "readonly", "hidden", "disabled"]),
  dataScope: z.enum(["all", "department", "self", "custom"]).optional(),
  noPermissionBehavior: z.enum(["hide", "disable", "show_error"]).optional(),
  reason: z.string().optional()
});

export const mockDataSetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  targetPageId: z.string().optional(),
  targetModuleId: z.string().optional(),
  records: z.array(z.record(z.unknown()))
});

export const prototypeSpecSchema = z.object({
  id: z.string().min(1),
  pages: entityCollectionSchema(pageSpecSchema),
  navigation: entityCollectionSchema(navigationEdgeSchema),
  permissions: entityCollectionSchema(permissionRuleSchema),
  mockDataSets: entityCollectionSchema(mockDataSetSchema)
});

export const htmlPrototypeFileSchema = z.object({
  id: z.string().min(1),
  fileName: z.string(),
  type: z.enum(["html", "readme"]),
  content: z.string(),
  description: z.string().optional()
});

export const htmlPrototypeSchema = z.object({
  id: z.string().min(1),
  packageType: z.literal("single_html"),
  files: entityCollectionSchema(htmlPrototypeFileSchema),
  sourcePrototypeSpecId: z.string(),
  generatedAt: z.string(),
  generatorVersion: z.string(),
  status: z.enum(["draft", "review_ready", "dirty", "validated"]),
  assumptions: z.array(assumptionSchema),
  pendingQuestions: z.array(pendingQuestionSchema)
});

export const prototypeDomMappingSchema = z.object({
  id: z.string().min(1),
  entityId: z.string(),
  entityType: z.enum(["page", "module", "field", "action", "ui_state"]),
  domSelector: z.string(),
  dataAttribute: z.string(),
  dataValue: z.string(),
  name: z.string(),
  mappingRole: z.enum(["primary", "secondary"]),
  contextPageId: z.string().optional(),
  contextModuleId: z.string().optional(),
  sourceRefs: z.array(entityRefSchema).optional()
});

export const prototypeMetaSchema = z.object({
  id: z.string().min(1),
  sourcePrototypeSpecId: z.string(),
  pageMappings: z.array(prototypeDomMappingSchema),
  moduleMappings: z.array(prototypeDomMappingSchema),
  fieldMappings: z.array(prototypeDomMappingSchema),
  actionMappings: z.array(prototypeDomMappingSchema),
  uiStateMappings: z.array(prototypeDomMappingSchema)
});

export const flowSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  relatedPageIds: z.array(z.string()),
  relatedActionIds: z.array(z.string())
});

export const businessStateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  type: z.enum(["initial", "intermediate", "terminal"])
});

export const stateTransitionSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  fromStateId: z.string(),
  toStateId: z.string(),
  triggerActionId: z.string(),
  allowedRoleIds: z.array(z.string()),
  guardCondition: z.string().optional()
});

export const stateMachineSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  businessObjectId: z.string(),
  states: entityCollectionSchema(businessStateSchema),
  transitions: entityCollectionSchema(stateTransitionSchema),
  initialStateId: z.string(),
  terminalStateIds: z.array(z.string())
});

export const flowSpecSchema = z.object({
  id: z.string().min(1),
  flows: entityCollectionSchema(flowSchema),
  stateMachines: entityCollectionSchema(stateMachineSchema)
});

export const prdSectionIndexSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  level: z.number().int(),
  sectionId: z.string(),
  sortOrder: z.number().int()
});

export const requirementLevelSchema = z.enum(["S", "M", "L"]);

export const complexityFactorSchema = z.object({
  factor: z.string(),
  value: z.string(),
  impact: z.enum(["S", "M", "L"])
});

export const complexityAssessmentSchema = z.object({
  level: requirementLevelSchema,
  reasoning: z.string(),
  factors: z.array(complexityFactorSchema),
  assessedAt: z.string()
});

export const prdSectionSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  title: z.string(),
  type: z.enum([
    "info",
    "background",
    "goal",
    "scope",
    "role",
    "page",
    "module",
    "field",
    "action",
    "flow",
    "permission",
    "ui_state",
    "business_state",
    "state_transition",
    "acceptance",
    "appendix",
    "change_scope",
    "impact_analysis",
    "current_state",
    "overall_design",
    "data_model",
    "interface_integration",
    "data_processing",
    "notification",
    "non_functional",
    "emergency",
    "deployment",
    "review"
  ]),
  target: entityRefSchema.optional(),
  content: z.string(),
  sortOrder: z.number().int(),
  sourceRefs: z.array(entityRefSchema),
  assumptions: z.array(assumptionSchema),
  pendingQuestions: z.array(pendingQuestionSchema),
  annotationNumber: z.number().int().min(1).max(999).optional()
});

export const prdSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  requirementLevel: requirementLevelSchema,
  toc: z.array(prdSectionIndexSchema),
  sections: entityCollectionSchema(prdSectionSchema),
  assumptions: z.array(assumptionSchema),
  pendingQuestions: z.array(pendingQuestionSchema)
});

export const testCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(z.string()),
  expectedResults: z.array(z.string()),
  relatedPageIds: z.array(z.string()),
  relatedModuleIds: z.array(z.string()).optional(),
  relatedFieldIds: z.array(z.string()).optional(),
  relatedActionIds: z.array(z.string()),
  relatedStateIds: z.array(z.string()).optional(),
  relatedUiStateIds: z.array(z.string()).optional(),
  relatedAcceptanceCriterionIds: z.array(z.string()),
  priority: prioritySchema
});

export const testSuiteSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(["functional", "permission", "state_transition", "exception", "boundary", "ui_interaction"]),
  cases: entityCollectionSchema(testCaseSchema)
});

export const testCaseSpecSchema = z.object({
  id: z.string().min(1),
  testSuites: entityCollectionSchema(testSuiteSchema),
  sourceRefs: z.array(entityRefSchema),
  generatedAt: z.string()
});

export const tooltipSectionSchema = z.object({
  heading: z.string(),
  markdownContent: z.string()
});

export const relatedEntitySchema = z.object({
  entityType: z.enum(["page", "module", "field", "action", "state", "permission"]),
  entityId: z.string(),
  label: z.string()
});

export const annotationPositionSchema = z.object({
  anchor: z.enum(["top_right", "top_left", "bottom_right", "bottom_left"]),
  offsetX: z.number(),
  offsetY: z.number()
});

export const activatePathStepSchema = z.object({
  action: z.enum(["click", "scroll", "tab_switch", "wait"]),
  selector: z.string(),
  description: z.string().optional()
});

export const prototypeAnnotationSchema = z.object({
  id: z.string().min(1),
  annotationNumber: z.number().int().min(1).max(999),
  title: z.string(),
  targetSelector: z.string(),
  targetDescription: z.string(),
  prdSectionIds: z.array(z.string()),
  tooltipSections: z.array(tooltipSectionSchema),
  relatedEntities: z.array(relatedEntitySchema),
  position: annotationPositionSchema.optional(),
  severity: severitySchema,
  annotationLevel: z.enum(["page", "module", "component", "action"]).optional(),
  activatePath: z.array(activatePathStepSchema).optional()
});

export const prototypeAnnotationBrokenLinkSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum(["prd_section", "acceptance_criterion", "test_case", "permission_rule", "state_transition"]),
  sourceId: z.string(),
  expectedTarget: entityRefSchema,
  reason: z.string(),
  fixSuggestion: z.string()
});

export const prototypeAnnotationSpecSchema = z.object({
  id: z.string().min(1),
  sourcePrdSpecId: z.string(),
  sourcePrototypeMetaId: z.string(),
  generatedAt: z.string(),
  annotations: entityCollectionSchema(prototypeAnnotationSchema),
  brokenLinks: z.array(prototypeAnnotationBrokenLinkSchema)
});

export const artifactManifestItemSchema = z.object({
  id: z.string().min(1),
  artifactType: fileArtifactTypeSchema,
  fileName: z.string(),
  relativePath: z.string(),
  sourceStateVersion: z.number().int().nonnegative(),
  sourceHash: z.string(),
  contentHash: z.string(),
  rendererVersion: z.string(),
  schemaVersion: z.string(),
  generatedAt: z.string()
});

export const artifactManifestSchema = z.object({
  items: entityCollectionSchema(artifactManifestItemSchema)
});

export const supportedJsonPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("remove"), path: z.string() }),
  z.object({ op: z.literal("replace"), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("test"), path: z.string(), value: z.unknown() })
]);

export const patchSourceSchema = z.enum([
  "requirement_generation",
  "prototype_spec_generation",
  "html_prototype_generation",
  "prototype_meta_generation",
  "flow_generation",
  "complexity_assessment",
  "prd_generation",
  "test_case_generation",
  "prototype_annotation_generation",
  "renderer_manifest_sync",
  "consistency_check",
  "nl_edit",
  "system_sync",
  "undo"
]);

export const validationProfileSchema = z.enum([
  "schema_only",
  "generation_requirement",
  "generation_prototype_spec",
  "generation_html",
  "generation_meta",
  "generation_flow",
  "generation_complexity",
  "generation_prd",
  "generation_test_case",
  "generation_annotation",
  "render_manifest_sync",
  "consistency_check",
  "nl_edit",
  "undo"
]);

export const dirtyPolicySchema = z.object({
  clear: z.array(stateArtifactTypeSchema).optional(),
  mark: z.array(stateArtifactTypeSchema).optional(),
  useDependencyPropagation: z.boolean().optional()
});

export const patchEnvelopeSchema = z.object({
  id: z.string().min(1),
  projectId: z.string(),
  baseVersion: z.number().int().nonnegative(),
  source: patchSourceSchema,
  reason: z.string(),
  patches: z.array(supportedJsonPatchOperationSchema),
  transaction: z.object({
    atomic: z.literal(true),
    mode: z.literal("all_or_nothing")
  }),
  dirtyPolicy: dirtyPolicySchema.optional(),
  validationProfile: validationProfileSchema
});

export const changeLogItemSchema = z.object({
  id: z.string().min(1),
  projectId: z.string(),
  versionBefore: z.number().int().nonnegative(),
  versionAfter: z.number().int().nonnegative(),
  source: patchSourceSchema,
  reason: z.string(),
  patches: z.array(supportedJsonPatchOperationSchema),
  inversePatches: z.array(supportedJsonPatchOperationSchema),
  dirtyArtifacts: z.array(stateArtifactTypeSchema),
  createdAt: z.string()
});

export const traceLinkSchema = z.object({
  id: z.string().min(1),
  from: entityRefSchema,
  to: entityRefSchema,
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["active", "stale", "broken"]),
  createdBy: z.enum(["system", "generator", "user"]),
  reason: z.string().optional()
});

export const traceabilityMatrixSchema = z.object({
  links: z.array(traceLinkSchema),
  archivedLinks: z.array(traceLinkSchema)
});

export const consistencyIssueSchema = z.object({
  id: z.string().min(1),
  severity: severitySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  entityRef: entityRefSchema.optional(),
  relatedRefs: z.array(entityRefSchema).optional(),
  path: z.string().optional(),
  sourceArtifact: z.union([stateArtifactTypeSchema, fileArtifactTypeSchema]).optional(),
  fixSuggestion: z.string().optional()
});

export const backlogItemSchema = z.object({
  id: z.string().min(1),
  featureId: z.string(),
  name: z.string(),
  group: z.enum(["mvp", "enhancement", "deferred", "excluded"]),
  priority: prioritySchema,
  reason: z.string().optional()
});

export const projectStateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  schemaVersion: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string(),
  lifecycleStatus: z.enum([
    "draft",
    "feature_list_done",
    "complexity_assessed",
    "prototype_done",
    "prd_done",
    "annotation_done",
    "consistency_checked",
    "delivered"
  ]),
  requirementCard: requirementCardSchema.nullable(),
  prototypeSpec: prototypeSpecSchema.nullable(),
  htmlPrototype: htmlPrototypeSchema.nullable(),
  prototypeMeta: prototypeMetaSchema.nullable(),
  flowSpec: flowSpecSchema.nullable(),
  complexityAssessment: complexityAssessmentSchema.nullable().optional(),
  prdSpec: prdSpecSchema.nullable(),
  testCaseSpec: testCaseSpecSchema.nullable(),
  prototypeAnnotationSpec: prototypeAnnotationSpecSchema.nullable(),
  traceability: traceabilityMatrixSchema,
  artifactManifest: artifactManifestSchema,
  issues: z.array(consistencyIssueSchema),
  changeLog: z.array(changeLogItemSchema),
  dirtyArtifacts: z.array(stateArtifactTypeSchema),
  lastStructuredGeneratedAt: z.record(z.string(), z.string()),
  backlog: z.array(backlogItemSchema).optional(),
  rawMaterialsProcessed: z.array(z.string()).optional()
});

export const renderResultSchema = z.object({
  artifactType: fileArtifactTypeSchema,
  fileName: z.string(),
  relativePath: z.string(),
  content: z.string(),
  contentHash: z.string(),
  sourceStateVersion: z.number().int().nonnegative(),
  sourceHash: z.string(),
  rendererVersion: z.string(),
  schemaVersion: z.string()
});

export const renderOutcomeSchema = z.union([
  z.object({ ok: z.literal(true), result: renderResultSchema }),
  z.object({ ok: z.literal(false), issues: z.array(validationIssueSchema) })
]);
