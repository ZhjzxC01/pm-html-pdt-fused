import type { ProjectState } from "../types/index.js";
import type { QueryEntity, ResolvedEntity, StateQuery } from "./state-query.js";

const allowedFields: Record<QueryEntity, string[]> = {
  pages: ["id", "name", "nameOrId", "type"],
  modules: ["id", "name", "nameOrId", "type", "pageId"],
  fields: ["id", "name", "nameOrId", "fieldKey", "required", "pageId", "moduleId"],
  actions: ["id", "name", "nameOrId", "type", "pageId"],
  permissions: ["id", "roleId", "targetId", "targetType", "effect", "roleNameOrId"],
  prdSections: ["id", "title", "titleOrId"],
  testCases: ["id", "title", "titleOrId", "priority"]
};

export function resolveStateQuery(state: ProjectState, query: StateQuery): ResolvedEntity[] {
  assertQueryAllowed(query);
  const entities = enumerateEntities(state, query.entity);
  const filtered = entities.filter((entity) => query.where.every((condition) => matchCondition(entity.value, condition)));
  return typeof query.limit === "number" ? filtered.slice(0, query.limit) : filtered;
}

export function resolveStateQueries(state: ProjectState, queries: StateQuery[]): ResolvedEntity[] {
  return queries.flatMap((query) => resolveStateQuery(state, query));
}

function assertQueryAllowed(query: StateQuery): void {
  const fields = allowedFields[query.entity];
  for (const condition of query.where) {
    if (!fields.includes(condition.field)) {
      throw new Error(`不允许查询 ${query.entity}.${condition.field}，请使用白名单字段。`);
    }
  }
}

function enumerateEntities(state: ProjectState, entity: QueryEntity): ResolvedEntity[] {
  switch (entity) {
    case "pages":
      return state.prototypeSpec
        ? state.prototypeSpec.pages.order.map((id) => ({
            artifact: "prototypeSpec",
            entity,
            id,
            path: `/prototypeSpec/pages/byId/${id}`,
            value: state.prototypeSpec?.pages.byId[id]
          }))
        : [];
    case "modules":
      return state.prototypeSpec
        ? state.prototypeSpec.pages.order.flatMap((pageId) => {
            const page = state.prototypeSpec?.pages.byId[pageId];
            return page
              ? page.modules.order.map((moduleId) => ({
                  artifact: "prototypeSpec" as const,
                  entity,
                  id: moduleId,
                  path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}`,
                  value: { ...page.modules.byId[moduleId], pageId }
                }))
              : [];
          })
        : [];
    case "fields":
      return enumerateFields(state, entity);
    case "actions":
      return state.prototypeSpec
        ? state.prototypeSpec.pages.order.flatMap((pageId) => {
            const page = state.prototypeSpec?.pages.byId[pageId];
            return page
              ? page.actions.order.map((actionId) => ({
                  artifact: "prototypeSpec" as const,
                  entity,
                  id: actionId,
                  path: `/prototypeSpec/pages/byId/${pageId}/actions/byId/${actionId}`,
                  value: { ...page.actions.byId[actionId], pageId }
                }))
              : [];
          })
        : [];
    case "permissions":
      return state.prototypeSpec
        ? state.prototypeSpec.permissions.order.map((id) => ({
            artifact: "prototypeSpec",
            entity,
            id,
            path: `/prototypeSpec/permissions/byId/${id}`,
            value: state.prototypeSpec?.permissions.byId[id]
          }))
        : [];
    case "prdSections":
      return state.prdSpec
        ? state.prdSpec.sections.order.map((id) => ({
            artifact: "prdSpec",
            entity,
            id,
            path: `/prdSpec/sections/byId/${id}`,
            value: state.prdSpec?.sections.byId[id]
          }))
        : [];
    case "testCases":
      return state.testCaseSpec
        ? state.testCaseSpec.testSuites.order.flatMap((suiteId) => {
            const suite = state.testCaseSpec?.testSuites.byId[suiteId];
            return suite
              ? suite.cases.order.map((caseId) => ({
                  artifact: "testCaseSpec" as const,
                  entity,
                  id: caseId,
                  path: `/testCaseSpec/testSuites/byId/${suiteId}/cases/byId/${caseId}`,
                  value: suite.cases.byId[caseId]
                }))
              : [];
          })
        : [];
  }
}

function enumerateFields(state: ProjectState, entity: QueryEntity): ResolvedEntity[] {
  if (!state.prototypeSpec) {
    return [];
  }

  return state.prototypeSpec.pages.order.flatMap((pageId) => {
    const page = state.prototypeSpec?.pages.byId[pageId];
    if (!page) {
      return [];
    }
    return page.modules.order.flatMap((moduleId) => {
      const module = page.modules.byId[moduleId];
      return module.fields.order.map((fieldId) => ({
        artifact: "prototypeSpec" as const,
        entity,
        id: fieldId,
        path: `/prototypeSpec/pages/byId/${pageId}/modules/byId/${moduleId}/fields/byId/${fieldId}`,
        value: { ...module.fields.byId[fieldId], pageId, moduleId }
      }));
    });
  });
}

function matchCondition(value: unknown, condition: StateQuery["where"][number]): boolean {
  const object = value as Record<string, unknown>;
  const actual = resolveFieldValue(object, condition.field);
  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(actual));
    case "contains":
      return String(actual ?? "").includes(String(condition.value ?? ""));
    case "exists":
      return condition.value === undefined ? actual !== undefined : (actual !== undefined) === condition.value;
  }
}

function resolveFieldValue(object: Record<string, unknown>, field: string): unknown {
  if (field === "nameOrId") {
    return `${String(object.id ?? "")} ${String(object.name ?? "")}`;
  }
  if (field === "titleOrId") {
    return `${String(object.id ?? "")} ${String(object.title ?? "")}`;
  }
  if (field === "roleNameOrId") {
    return `${String(object.roleId ?? "")} ${String(object.name ?? "")}`;
  }
  return object[field];
}
