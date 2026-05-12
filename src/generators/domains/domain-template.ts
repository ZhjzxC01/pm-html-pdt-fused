export interface DomainTemplate {
  domainId: string
  displayName: string
  keywords: string[]
  businessObjects: string[]
  defaultRoles: Array<{ id: string; name: string; description: string }>
  defaultFields: Array<{ id: string; name: string; fieldKey: string; type: string; required: boolean }>
  statePatterns: Array<{
    id: string
    name: string
    states: Array<{ id: string; name: string; description: string; type: "initial" | "intermediate" | "terminal" }>
    transitions: Array<{ id: string; name: string; fromStateId: string; toStateId: string; triggerActionId: string; allowedRoleIds: string[] }>
  }>
  pagePatterns: Array<{
    id: string
    name: string
    type: string
    modules: Array<{ id: string; name: string; type: string; fieldIds: string[] }>
    actionIds: string[]
  }>
  extraFilters: string[]
  extraDetailModules: Array<{ id: string; name: string; type: string; fieldIds: string[] }>
  approvalRoles: string[]
  specialRules: string[]
}

export interface DomainMatchResult {
  domain: DomainTemplate
  confidence: "high" | "medium" | "low"
  matchedKeywords: string[]
}
