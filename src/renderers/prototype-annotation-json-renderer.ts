import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderPrototypeAnnotationJson(state: ProjectState): RenderOutcome {
  if (!state.prototypeAnnotationSpec) {
    return renderMissingSource(
      "missing_prototype_annotation_spec",
      "缺少原型标注结构，无法渲染 prototype-annotations.json。",
      "/prototypeAnnotationSpec"
    );
  }

  return renderOk(
    state,
    "prototype_annotation_json",
    "prototype-annotations.json",
    "output/prototype-annotations.json",
    `${JSON.stringify(state.prototypeAnnotationSpec, null, 2)}\n`,
    state.prototypeAnnotationSpec
  );
}
