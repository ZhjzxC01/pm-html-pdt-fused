import type { FlowSpec, PrototypeSpec, ValidationIssue, ValidationResult } from "../types/index.js";

export function validateGraph(flowSpec: FlowSpec, prototypeSpec: PrototypeSpec | null): ValidationResult {
  const issues: ValidationIssue[] = [];
  const actionIds = new Set<string>();
  if (prototypeSpec) {
    for (const page of Object.values(prototypeSpec.pages.byId)) {
      for (const action of Object.values(page.actions.byId)) {
        actionIds.add(action.id);
      }
    }
  }

  for (const machine of Object.values(flowSpec.stateMachines.byId)) {
    if (!machine.states.byId[machine.initialStateId]) {
      issues.push({
        id: `issue_missing_initial_state_${machine.id}`,
        severity: "error",
        code: "missing_initial_state",
        message: `状态机 ${machine.name} 缺少有效初始状态。`
      });
    }

    for (const terminalStateId of machine.terminalStateIds) {
      if (!machine.states.byId[terminalStateId]) {
        issues.push({
          id: `issue_missing_terminal_state_${machine.id}_${terminalStateId}`,
          severity: "error",
          code: "missing_terminal_state",
          message: `状态机 ${machine.name} 引用了不存在的终态：${terminalStateId}`
        });
      }
    }

    for (const transition of Object.values(machine.transitions.byId)) {
      if (!machine.states.byId[transition.fromStateId] || !machine.states.byId[transition.toStateId]) {
        issues.push({
          id: `issue_invalid_transition_ref_${transition.id}`,
          severity: "error",
          code: "invalid_transition_ref",
          message: `状态流转 ${transition.name} 引用了不存在的状态。`
        });
      }

      if (prototypeSpec && !actionIds.has(transition.triggerActionId)) {
        issues.push({
          id: `issue_invalid_action_transition_ref_${transition.id}`,
          severity: "error",
          code: "invalid_action_transition_ref",
          message: `状态流转 ${transition.name} 引用了不存在的操作：${transition.triggerActionId}`
        });
      }
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues
  };
}
