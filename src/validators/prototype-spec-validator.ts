import type { PrototypeSpec, RequirementCard, ValidationIssue, ValidationResult } from "../types/index.js";

export function validatePrototypeSpec(prototypeSpec: PrototypeSpec, requirementCard: RequirementCard | null): ValidationResult {
  const issues: ValidationIssue[] = [];
  const roleIds = new Set(requirementCard ? requirementCard.roles.order : []);
  const pageIds = new Set(prototypeSpec.pages.order);
  const permissionIds = new Set(prototypeSpec.permissions.order);
  const actionIds = new Set<string>();
  const effectsByTarget = new Map<string, string>();

  for (const page of Object.values(prototypeSpec.pages.byId)) {
    if (page.sourceRefs.length === 0) {
      issues.push({
        id: `issue_page_missing_source_refs_${page.id}`,
        severity: "warning",
        code: "page_missing_source_refs",
        message: `页面 ${page.name} 缺少 sourceRefs，建议关联来源 Feature 或场景。`,
        entityRef: { entityType: "page", entityId: page.id },
        path: `/prototypeSpec/pages/byId/${page.id}/sourceRefs`
      });
    }

    for (const ref of page.sourceRefs) {
      if (ref.entityType === "feature" && requirementCard && !requirementCard.features.byId[ref.entityId]) {
        issues.push({
          id: `issue_page_unknown_feature_${page.id}_${ref.entityId}`,
          severity: "error",
          code: "page_unknown_feature_ref",
          message: `页面 ${page.name} 引用了不存在的 Feature：${ref.entityId}`,
          entityRef: { entityType: "page", entityId: page.id },
          path: `/prototypeSpec/pages/byId/${page.id}/sourceRefs`
        });
      }
    }

    for (const action of Object.values(page.actions.byId)) {
      actionIds.add(action.id);

      if (action.targetPageId && !pageIds.has(action.targetPageId)) {
        issues.push({
          id: `issue_action_unknown_target_page_${action.id}`,
          severity: "error",
          code: "action_unknown_target_page",
          message: `操作 ${action.name} 引用了不存在的目标页面：${action.targetPageId}`,
          entityRef: { entityType: "action", entityId: action.id },
          path: `/prototypeSpec/pages/byId/${page.id}/actions/byId/${action.id}/targetPageId`
        });
      }

      for (const permissionRuleId of action.permissionRuleIds) {
        if (!permissionIds.has(permissionRuleId)) {
          issues.push({
            id: `issue_action_unknown_permission_${action.id}_${permissionRuleId}`,
            severity: "error",
            code: "action_unknown_permission_rule",
            message: `操作 ${action.name} 引用了不存在的权限规则：${permissionRuleId}`,
            entityRef: { entityType: "action", entityId: action.id },
            path: `/prototypeSpec/pages/byId/${page.id}/actions/byId/${action.id}/permissionRuleIds`
          });
        }
      }

      if (action.priority === "P0" && action.permissionRuleIds.length === 0) {
        issues.push({
          id: `issue_p0_action_missing_permission_${action.id}`,
          severity: "warning",
          code: "p0_action_missing_permission_rule",
          message: `P0 核心操作 ${action.name} 缺少显式权限规则。`,
          entityRef: { entityType: "action", entityId: action.id },
          path: `/prototypeSpec/pages/byId/${page.id}/actions/byId/${action.id}/permissionRuleIds`
        });
      }
    }

    for (const edge of Object.values(prototypeSpec.navigation.byId)) {
      if (!pageIds.has(edge.fromPageId) || !pageIds.has(edge.toPageId)) {
        issues.push({
          id: `issue_navigation_invalid_page_${edge.id}`,
          severity: "error",
          code: "navigation_invalid_page_ref",
          message: `导航关系 ${edge.id} 引用了不存在的页面。`,
          path: `/prototypeSpec/navigation/byId/${edge.id}`
        });
      }
    }
  }

  for (const permission of Object.values(prototypeSpec.permissions.byId)) {
    if (requirementCard && !roleIds.has(permission.roleId)) {
      issues.push({
        id: `issue_permission_unknown_role_${permission.id}`,
        severity: "error",
        code: "permission_unknown_role",
        message: `权限规则 ${permission.id} 引用了不存在的角色：${permission.roleId}`,
        entityRef: { entityType: "permission", entityId: permission.id },
        path: `/prototypeSpec/permissions/byId/${permission.id}/roleId`
      });
    }

    if (permission.targetType === "action" && !actionIds.has(permission.targetId)) {
      issues.push({
        id: `issue_permission_unknown_action_${permission.id}`,
        severity: "error",
        code: "permission_unknown_action",
        message: `权限规则 ${permission.id} 引用了不存在的操作：${permission.targetId}`,
        entityRef: { entityType: "permission", entityId: permission.id },
        path: `/prototypeSpec/permissions/byId/${permission.id}/targetId`
      });
    }

    const effectKey = `${permission.roleId}:${permission.targetType}:${permission.targetId}`;
    const existingEffect = effectsByTarget.get(effectKey);
    if (existingEffect && existingEffect !== permission.effect) {
      issues.push({
        id: `issue_permission_conflict_${permission.id}`,
        severity: "error",
        code: "permission_effect_conflict",
        message: `同一角色和目标存在多个权限 effect：${effectKey}`,
        entityRef: { entityType: "permission", entityId: permission.id },
        path: `/prototypeSpec/permissions/byId/${permission.id}`
      });
    }
    effectsByTarget.set(effectKey, permission.effect);
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
