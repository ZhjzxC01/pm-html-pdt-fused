import type { SemanticAction, StateQuery } from "./state-query.js";

export interface ResolvedIntent {
  semanticAction: SemanticAction;
  queries: StateQuery[];
}

export function resolveIntent(instruction: string): ResolvedIntent {
  const normalized = instruction.trim();

  const fieldRequired = normalized.match(/(?:将|把)?(.+?)(?:字段)?改为必填/);
  if (fieldRequired) {
    const fieldName = stripQuotes(fieldRequired[1] ?? "");
    return {
      semanticAction: { type: "set_field_required", fieldNameOrId: fieldName, required: true },
      queries: [{ artifact: "prototypeSpec", entity: "fields", where: [{ field: "nameOrId", op: "eq", value: fieldName }] }]
    };
  }

  const fieldOptional = normalized.match(/(?:将|把)?(.+?)(?:字段)?改为(?:非必填|选填|可选)/);
  if (fieldOptional) {
    const fieldName = stripQuotes(fieldOptional[1] ?? "");
    return {
      semanticAction: { type: "set_field_required", fieldNameOrId: fieldName, required: false },
      queries: [{ artifact: "prototypeSpec", entity: "fields", where: [{ field: "nameOrId", op: "eq", value: fieldName }] }]
    };
  }

  const renameAction = normalized.match(/(?:将|把)[\u201c\u201d\u2018\u2019"](.+?)[\u201c\u201d\u2018\u2019"]改(?:成|为)[\u201c\u201d\u2018\u2019"](.+?)[\u201c\u201d\u2018\u2019"]/);
  if (renameAction) {
    const fromName = renameAction[1] ?? "";
    const toName = renameAction[2] ?? "";
    if (normalized.includes("字段")) {
      return {
        semanticAction: { type: "rename_field", fromName, toName },
        queries: [{ artifact: "prototypeSpec", entity: "fields", where: [{ field: "name", op: "eq", value: fromName }] }]
      };
    }
    return {
      semanticAction: { type: "rename_action", fromName, toName },
      queries: [{ artifact: "prototypeSpec", entity: "actions", where: [{ field: "name", op: "eq", value: fromName }] }]
    };
  }

  if (normalized.includes("类型") && (normalized.includes("改为") || normalized.includes("改成"))) {
    const fieldNameMatch = normalized.match(/(?:将|把)?(.+?)(?:字段)?(?:类型)/);
    const typeMatch = normalized.match(/(?:改为|改成)(.+?)$/);
    const fieldName = fieldNameMatch ? stripQuotes(fieldNameMatch[1]) : "";
    const rawType = typeMatch ? stripQuotes(typeMatch[1]) : "";
    const mappedType = mapFieldType(rawType);
    if (mappedType) {
      return {
        semanticAction: { type: "change_field_type", fieldNameOrId: fieldName, newType: mappedType },
        queries: [{ artifact: "prototypeSpec", entity: "fields", where: [{ field: "nameOrId", op: "eq", value: fieldName }] }]
      };
    }
  }

  if (normalized.includes("测试用例")) {
    const titleMatch = normalized.match(/(?:新增|增加)(.+?测试用例)/);
    const title = stripQuotes(titleMatch?.[1] ?? "自然语言新增测试用例");
    const actionName = normalized.includes("导出") ? "导出" : undefined;
    return {
      semanticAction: { type: "add_test_case", title, relatedActionNameOrId: actionName, priority: "P1" },
      queries: [{ artifact: "testCaseSpec", entity: "testCases", where: [] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("筛选")) {
    const pageMatch = normalized.match(/(?:在|给)(.+?)(?:增加|新增)/);
    const fieldMatch = normalized.match(/(?:按|增加|新增)(.+?)(?:筛选|过滤)/);
    const pageName = pageMatch ? stripQuotes(pageMatch[1]) : "列表页";
    const fieldName = fieldMatch ? stripQuotes(fieldMatch[1]) : "筛选条件";
    return {
      semanticAction: {
        type: "add_filter_field",
        pageNameOrId: pageName,
        fieldName,
        fieldKey: fieldName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        fieldType: "text"
      },
      queries: [{ artifact: "prototypeSpec", entity: "pages", where: [{ field: "nameOrId", op: "contains", value: pageName }] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("模块")) {
    const pageMatch = normalized.match(/(?:在|给)(.+?)(?:增加|新增)/);
    const moduleMatch = normalized.match(/(?:增加|新增)(.+?模块)/);
    const pageName = pageMatch ? stripQuotes(pageMatch[1]) : "详情页";
    const moduleName = moduleMatch ? stripQuotes(moduleMatch[1]) : "新增模块";
    const moduleType = inferModuleType(normalized);
    return {
      semanticAction: {
        type: "add_module_to_page",
        pageNameOrId: pageName,
        moduleName,
        moduleType
      },
      queries: [{ artifact: "prototypeSpec", entity: "pages", where: [{ field: "nameOrId", op: "contains", value: pageName }] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("字段")) {
    const pageMatch = normalized.match(/(?:在|给)(.+?)的(.+?)/);
    const fieldMatch = normalized.match(/(?:增加|新增)(.+?字段)/);
    const pageName = pageMatch ? stripQuotes(pageMatch[1]) : "";
    const moduleName = pageMatch ? stripQuotes(pageMatch[2]) : "";
    const fieldName = fieldMatch ? stripQuotes(fieldMatch[1]) : "新增字段";
    return {
      semanticAction: {
        type: "add_field_to_module",
        pageNameOrId: pageName || "详情页",
        moduleNameOrId: moduleName || "表单",
        fieldName,
        fieldKey: fieldName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        fieldType: "text",
        required: normalized.includes("必填")
      },
      queries: [{ artifact: "prototypeSpec", entity: "pages", where: [{ field: "nameOrId", op: "contains", value: pageName }] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && (normalized.includes("导航") || normalized.includes("跳转"))) {
    const fromMatch = normalized.match(/(?:从|在)(.+?)(?:跳转|导航|进入)/);
    const toMatch = normalized.match(/(?:到|进入|跳转到)(.+?)(?:页面|页|$)/);
    const fromPage = fromMatch ? stripQuotes(fromMatch[1]) : "";
    const toPage = toMatch ? stripQuotes(toMatch[1]) : "";
    return {
      semanticAction: {
        type: "add_page_navigation",
        fromPageNameOrId: fromPage,
        toPageNameOrId: toPage,
        triggerActionNameOrId: "查看详情"
      },
      queries: [{ artifact: "prototypeSpec", entity: "pages", where: [{ field: "nameOrId", op: "contains", value: fromPage }] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("空态")) {
    const pageMatch = normalized.match(/(?:在|给)(.+?)(?:增加|新增)/);
    const pageName = pageMatch ? stripQuotes(pageMatch[1]) : "列表页";
    return {
      semanticAction: {
        type: "add_ui_state",
        pageNameOrId: pageName,
        stateType: "empty",
        stateName: "空态",
        description: "暂无数据"
      },
      queries: [{ artifact: "prototypeSpec", entity: "pages", where: [{ field: "nameOrId", op: "contains", value: pageName }] }]
    };
  }

  if (normalized.includes("删除") && (normalized.includes("操作") || normalized.includes("按钮"))) {
    const entityMatch = normalized.match(/删除(.+?)(?:操作|按钮)/);
    const entityName = entityMatch ? stripQuotes(entityMatch[1]) : "";
    return {
      semanticAction: { type: "remove_entity", entityType: "action", entityNameOrId: entityName },
      queries: [{ artifact: "prototypeSpec", entity: "actions", where: [{ field: "name", op: "contains", value: entityName }] }]
    };
  }

  if (normalized.includes("删除") && normalized.includes("字段")) {
    const entityMatch = normalized.match(/删除(.+?)(?:字段)/);
    const entityName = entityMatch ? stripQuotes(entityMatch[1]) : "";
    return {
      semanticAction: { type: "remove_entity", entityType: "field", entityNameOrId: entityName },
      queries: [{ artifact: "prototypeSpec", entity: "fields", where: [{ field: "name", op: "contains", value: entityName }] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("审批节点")) {
    const nodeMatch = normalized.match(/(?:增加|新增)(.+?)(?:审批节点|节点)/);
    const roleMatch = normalized.match(/(?:由|给)(.+?)(?:审批|处理)/);
    const nodeName = nodeMatch ? stripQuotes(nodeMatch[1]) : "新增审批节点";
    const roleName = roleMatch ? stripQuotes(roleMatch[1]) : "审批人";
    return {
      semanticAction: { type: "add_approval_node", nodeName, roleNameOrId: roleName },
      queries: [{ artifact: "flowSpec", entity: "pages", where: [] }]
    };
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("操作")) {
    return buildAddActionIntent(normalized);
  }

  if ((normalized.includes("增加") || normalized.includes("新增")) && normalized.includes("导出")) {
    return buildAddActionIntent(normalized);
  }

  if (normalized.includes("权限") || normalized.includes("只有")) {
    const roleName = normalized.includes("管理员") ? "管理员" : normalized.includes("主管") ? "直属主管" : normalized.includes("财务") ? "财务" : "管理员";
    const targetName = normalized.includes("导出") ? "导出" : normalized.includes("审批") ? "审批通过" : "操作";
    return {
      semanticAction: {
        type: "add_permission_rule",
        roleNameOrId: roleName,
        targetActionNameOrId: targetName,
        effect: "allow"
      },
      queries: [
        { artifact: "requirementCard", entity: "permissions", where: [{ field: "roleNameOrId", op: "eq", value: roleName }] },
        { artifact: "prototypeSpec", entity: "actions", where: [{ field: "name", op: "contains", value: targetName }] }
      ]
    };
  }

  throw new Error("暂不支持该自然语言修改。支持的指令类型：字段必填/选填、重命名操作/字段、新增字段/模块/筛选/导航/审批节点/测试用例、删除操作/字段、权限规则、UI 状态。");
}

function buildAddActionIntent(instruction: string): ResolvedIntent {
  const allListPages = instruction.includes("所有列表页") || instruction.includes("全部列表页");
  const actionName = instruction.includes("批量导出") ? "批量导出" : instruction.includes("导出") ? "导出" : "新增操作";
  const actionType = actionName.includes("导出") ? "export" : "batch";
  const allowedRoleNameOrId = instruction.includes("管理员") ? "管理员" : undefined;
  const namedPage = instruction.match(/(?:在|给)(.+?页)/)?.[1];

  return {
    semanticAction: {
      type: "add_action_to_pages",
      pageScope: allListPages ? "all_list_pages" : "named_page",
      pageNameOrId: allListPages ? undefined : namedPage,
      actionName,
      actionType,
      placement: "toolbar",
      allowedRoleNameOrId
    },
    queries: [
      {
        artifact: "prototypeSpec",
        entity: "pages",
        where: allListPages
          ? [{ field: "type", op: "eq", value: "list" }]
          : [{ field: "nameOrId", op: "contains", value: namedPage }]
      }
    ]
  };
}

function stripQuotes(value: string): string {
  return value.replace(/[\u201c\u201d\u2018\u2019"]/g, "").trim();
}

type FieldType = "text" | "number" | "select" | "date" | "textarea" | "money" | "status" | "user" | "file";

const FIELD_TYPE_MAP: Record<string, FieldType> = {
  文本: "text", 单行文本: "text", 短文本: "text",
  数字: "number", 数值: "number",
  下拉: "select", 选择: "select", 枚举: "select",
  日期: "date", 时间: "date",
  多行文本: "textarea", 长文本: "textarea", 富文本: "textarea",
  金额: "money", 货币: "money",
  状态: "status",
  用户: "user", 人员: "user",
  文件: "file", 附件: "file"
};

function mapFieldType(raw: string): FieldType | null {
  return FIELD_TYPE_MAP[raw] ?? null;
}

type ModuleType = "filter" | "table" | "form" | "detail_card" | "approval_panel" | "log_timeline" | "chart" | "summary";

function inferModuleType(instruction: string): ModuleType {
  if (instruction.includes("审批")) return "approval_panel";
  if (instruction.includes("日志") || instruction.includes("记录")) return "log_timeline";
  if (instruction.includes("图表") || instruction.includes("统计")) return "chart";
  if (instruction.includes("汇总") || instruction.includes("摘要")) return "summary";
  if (instruction.includes("表单")) return "form";
  if (instruction.includes("列表") || instruction.includes("表格")) return "table";
  if (instruction.includes("筛选") || instruction.includes("过滤")) return "filter";
  return "detail_card";
}
