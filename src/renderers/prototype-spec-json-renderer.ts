import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderPrototypeSpecJson(state: ProjectState): RenderOutcome {
  if (!state.prototypeSpec) {
    return renderMissingSource("missing_prototype_spec", "缺少 PrototypeSpec，无法渲染 prototype-spec.json。", "/prototypeSpec");
  }

  return renderOk(
    state,
    "prototype_spec_json",
    "prototype-spec.json",
    "output/prototype-spec.json",
    `${JSON.stringify(state.prototypeSpec, null, 2)}\n`,
    state.prototypeSpec
  );
}
