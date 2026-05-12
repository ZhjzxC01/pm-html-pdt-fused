import type {
  DirtyPolicy,
  StateArtifactType,
  SupportedJsonPatchOperation,
  ValidationProfile
} from "../types/index.js";

export type QueryEntity = "pages" | "modules" | "fields" | "actions" | "permissions" | "prdSections" | "testCases";

export interface StateQuery {
  artifact: StateArtifactType;
  entity: QueryEntity;
  where: Array<{
    field: string;
    op: "eq" | "in" | "contains" | "exists";
    value?: string | string[] | boolean;
  }>;
  limit?: number;
}

export type SemanticAction =
  | {
      type: "add_action_to_pages";
      pageScope: "all_list_pages" | "named_page";
      pageNameOrId?: string;
      actionName: string;
      actionType: "export" | "import" | "batch" | "create" | "view" | "submit";
      placement: "toolbar" | "row" | "form_footer";
      allowedRoleNameOrId?: string;
    }
  | {
      type: "rename_action";
      fromName: string;
      toName: string;
    }
  | {
      type: "set_field_required";
      fieldNameOrId: string;
      required: boolean;
    }
  | {
      type: "add_permission_rule";
      roleNameOrId: string;
      targetActionNameOrId: string;
      effect: "allow" | "deny" | "hidden" | "disabled";
    }
  | {
      type: "add_test_case";
      title: string;
      relatedActionNameOrId?: string;
      priority: "P0" | "P1" | "P2";
    }
  | {
      type: "add_field_to_module";
      pageNameOrId: string;
      moduleNameOrId: string;
      fieldName: string;
      fieldKey: string;
      fieldType: "text" | "number" | "select" | "date" | "textarea" | "money" | "status" | "user" | "file";
      required: boolean;
    }
  | {
      type: "add_module_to_page";
      pageNameOrId: string;
      moduleName: string;
      moduleType: "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline" | "chart" | "summary";
    }
  | {
      type: "add_filter_field";
      pageNameOrId: string;
      fieldName: string;
      fieldKey: string;
      fieldType: "text" | "number" | "select" | "date";
    }
  | {
      type: "change_field_type";
      fieldNameOrId: string;
      newType: "text" | "number" | "select" | "date" | "textarea" | "money" | "status" | "user" | "file";
    }
  | {
      type: "rename_field";
      fromName: string;
      toName: string;
    }
  | {
      type: "add_page_navigation";
      fromPageNameOrId: string;
      toPageNameOrId: string;
      triggerActionNameOrId: string;
    }
  | {
      type: "add_ui_state";
      pageNameOrId: string;
      stateType: "empty" | "error" | "loading" | "no_permission" | "success";
      stateName: string;
      description: string;
    }
  | {
      type: "modify_permission";
      permissionIdOrTarget: string;
      changes: { effect?: "allow" | "deny" | "hidden" | "disabled"; roleNameOrId?: string };
    }
  | {
      type: "add_approval_node";
      nodeName: string;
      roleNameOrId: string;
      afterStateIdOrName?: string;
    }
  | {
      type: "remove_entity";
      entityType: "action" | "field" | "module" | "permission" | "test_case";
      entityNameOrId: string;
    }
  | {
      type: "add_prd_section";
      title: string;
      content: string;
      targetEntityType?: string;
      targetEntityId?: string;
    };

export interface PatchProposal {
  id: string;
  projectId: string;
  baseVersion: number;
  naturalLanguageInstruction: string;
  semanticAction: SemanticAction;
  queries: StateQuery[];
  targetScope: {
    artifactTypes: StateArtifactType[];
    targetIds: string[];
  };
  patches: SupportedJsonPatchOperation[];
  dirtyPolicy: DirtyPolicy;
  validationProfile: ValidationProfile;
  riskLevel: "low" | "medium" | "high";
  requiresUserConfirmation: true;
  explanation: string;
  expectedImpact: string[];
}

export interface ResolvedEntity {
  artifact: StateArtifactType;
  entity: QueryEntity;
  id: string;
  path: string;
  value: unknown;
}
