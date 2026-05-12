import type { ValidationIssue, ValidationResult } from "../types/index.js";

export interface EntityCollectionLike {
  byId: Record<string, { id: string }>;
  order: string[];
}

export function validateEntityCollection(collection: EntityCollectionLike, path: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const orderedIds = new Set(collection.order);

  for (const id of collection.order) {
    if (!collection.byId[id]) {
      issues.push({
        id: `issue_missing_entity_${id}`,
        severity: "error",
        code: "entity_collection_order_missing_by_id",
        message: `集合 ${path} 的 order 包含不存在的实体：${id}`,
        path: `${path}/order`
      });
    }
  }

  for (const [key, entity] of Object.entries(collection.byId)) {
    if (entity.id !== key) {
      issues.push({
        id: `issue_entity_id_mismatch_${key}`,
        severity: "error",
        code: "entity_collection_id_mismatch",
        message: `集合 ${path} 的实体 key 与实体 id 不一致：${key}`,
        path: `${path}/byId/${key}`
      });
    }

    if (!orderedIds.has(key)) {
      issues.push({
        id: `issue_entity_not_ordered_${key}`,
        severity: "error",
        code: "entity_collection_by_id_missing_order",
        message: `集合 ${path} 的 byId 实体未出现在 order 中：${key}`,
        path: `${path}/order`
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
